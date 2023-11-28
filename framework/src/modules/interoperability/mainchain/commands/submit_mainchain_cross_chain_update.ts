/*
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

import { codec } from '@liskhq/lisk-codec';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { BaseCrossChainUpdateCommand } from '../../base_cross_chain_update_command';
import {
	CCMStatusCode,
	CONTEXT_STORE_KEY_CCM_PROCESSING,
	CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
	EMPTY_FEE_ADDRESS,
	EVENT_TOPIC_CCM_EXECUTION,
	MODULE_NAME_INTEROPERABILITY,
} from '../../constants';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../events/ccm_processed';
import { sidechainTerminatedCCMParamsSchema } from '../../schemas';
import { ChainAccount, ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import {
	CrossChainMessageContext,
	CrossChainUpdateTransactionParams,
	BeforeCCMForwardingContext,
} from '../../types';
import {
	getEncodedCCMAndID,
	getMainchainID,
	isInboxUpdateEmpty,
	verifyLivenessConditionForRegisteredChains,
	getIDFromCCMBytes,
} from '../../utils';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';
import { panic } from '../../../../utils/panic';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#commands
export class SubmitMainchainCrossChainUpdateCommand extends BaseCrossChainUpdateCommand<MainchainInteroperabilityInternalMethod> {
	public async verify(
		context: CommandVerifyContext<CrossChainUpdateTransactionParams>,
	): Promise<VerificationResult> {
		const { params } = context;

		await this.verifyCommon(context, true);

		// Liveness condition is only checked on the mainchain for the first CCU with a non-empty inbox update.
		// after `verifyCommon`,`sendingChainAccount` is not `undefined`
		const sendingChainAccount = (await this.stores
			.get(ChainAccountStore)
			.getOrUndefined(context, params.sendingChainID)) as ChainAccount;

		if (
			sendingChainAccount.status === ChainStatus.REGISTERED &&
			!isInboxUpdateEmpty(params.inboxUpdate)
		) {
			verifyLivenessConditionForRegisteredChains(
				context.header.timestamp,
				context.params.certificate,
			);
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
	): Promise<void> {
		const { params } = context;

		// This call can throw error and fails a transaction
		await this.verifyCertificateSignatureAndPartnerChainOutboxRoot(context);
		const [decodedCCMs, ok] = await this.beforeCrossChainMessagesExecution(context, true);
		if (!ok) {
			return;
		}

		try {
			// Update the context to indicate that now we start the CCM processing.
			context.contextStore.set(CONTEXT_STORE_KEY_CCM_PROCESSING, true);

			for (let i = 0; i < decodedCCMs.length; i += 1) {
				const ccm = decodedCCMs[i];
				const ccmBytes = params.inboxUpdate.crossChainMessages[i];
				const ccmID = getIDFromCCMBytes(ccmBytes);
				const ccmContext = {
					...context,
					ccm,
					eventQueue: context.eventQueue.getChildQueue(
						Buffer.concat([EVENT_TOPIC_CCM_EXECUTION, ccmID]),
					),
				};

				// If the receiving chain is the mainchain, apply the CCM
				// This function never raises an error.
				if (ccm.receivingChainID.equals(getMainchainID(context.chainID))) {
					await this.apply(ccmContext);
				} else {
					await this._forward(ccmContext);
				}

				// We append at the very end. This implies that if the message leads to a chain termination,
				// it is still possible to recover it (because the channel terminated message
				// would refer to an inbox where the message has not been appended yet).
				await this.internalMethod.appendToInboxTree(context, params.sendingChainID, ccmBytes);
			}
		} catch (error) {
			panic(context.logger, error as Error);
		} finally {
			// Update the context to indicate that now we stop the CCM processing.
			context.contextStore.delete(CONTEXT_STORE_KEY_CCM_PROCESSING);
		}

		await this.afterCrossChainMessagesExecution(context);
	}

	private async _beforeCrossChainMessageForwarding(
		context: BeforeCCMForwardingContext,
		eventSnapshotID: number,
		stateSnapshotID: number,
	): Promise<boolean> {
		const { ccm, logger } = context;
		const { ccmID } = getEncodedCCMAndID(ccm);

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.beforeCrossChainMessageForwarding) {
					logger.debug(
						{
							moduleName: module,
							commandName: ccm.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute beforeCrossChainMessageForwarding',
					);
					await method.beforeCrossChainMessageForwarding(context);
				}
			}
		} catch (error) {
			context.eventQueue.restoreSnapshot(eventSnapshotID);
			context.stateStore.restoreSnapshot(stateSnapshotID);

			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to execute beforeCrossChainMessageForwarding.',
			);

			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);

			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
				ccm,
			});

			return false;
		}

		return true;
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#forward
	private async _forward(context: CrossChainMessageContext): Promise<void> {
		const { ccm } = context;
		const { ccmID, encodedCCM } = getEncodedCCMAndID(ccm);

		if (!(await this.verifyCCM(context, ccmID))) {
			return;
		}

		let ccmFailed = false;

		const chainAccountStore = this.stores.get(ChainAccountStore);
		const receivingChainAccount = await chainAccountStore.getOrUndefined(
			context,
			ccm.receivingChainID,
		);

		// do not continue, if
		// the chain account does not exist
		// the chain has REGISTERED status
		if (!receivingChainAccount || receivingChainAccount.status === ChainStatus.REGISTERED) {
			ccmFailed = true;
		} else {
			// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0043.md#sidechain-registration-process
			// Liveness condition is only applicable to ACTIVE status chains
			const live = await this.internalMethod.isLive(
				context,
				ccm.receivingChainID,
				context.header.timestamp,
			);
			if (!live) {
				ccmFailed = true;

				/**
				 * If the receiving chain is active, it means it violated the liveness condition, and we terminate it.
				 * If the receiving chain is already terminated, terminateChain does nothing.
				 */
				await this.internalMethod.terminateChainInternal(context, ccm.receivingChainID);

				/**
				 * A sidechain terminated message is returned to the sending chain
				 * to inform them that the receiving chain is terminated.
				 */
				await this.internalMethod.sendInternal(
					context,
					EMPTY_FEE_ADDRESS,
					MODULE_NAME_INTEROPERABILITY,
					CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
					ccm.sendingChainID,
					BigInt(0),
					CCMStatusCode.OK,
					codec.encode(sidechainTerminatedCCMParamsSchema, {
						chainID: ccm.receivingChainID,
						stateRoot: receivingChainAccount?.lastCertificate.stateRoot,
					}),
				);
			}
		}

		// create a state snapshot
		const stateSnapshotID = context.stateStore.createSnapshot();
		const eventSnapshotID = context.eventQueue.createSnapshot();

		if (
			!(await this._beforeCrossChainMessageForwarding(
				{ ...context, ccmFailed } as BeforeCCMForwardingContext,
				eventSnapshotID,
				stateSnapshotID,
			))
		) {
			return;
		}

		// since the codes are same in all cases, let's use them directly here
		if (ccmFailed) {
			await this.bounce(
				context,
				encodedCCM.length,
				CCMStatusCode.CHANNEL_UNAVAILABLE,
				CCMProcessedCode.CHANNEL_UNAVAILABLE,
			);
		} else {
			await this.internalMethod.addToOutbox(context, ccm.receivingChainID, ccm);

			// Emit CCM forwarded event.
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				code: CCMProcessedCode.SUCCESS,
				result: CCMProcessedResult.FORWARDED,
				ccm,
			});
		}
	}
}
