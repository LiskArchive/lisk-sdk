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
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { utils } from '@liskhq/lisk-cryptography';
import { NotFoundError } from '@liskhq/lisk-chain';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
} from '../../../../state_machine/types';
import { CCMsg, CrossChainMessageContext, MessageRecoveryParams } from '../../types';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';
import { verifyMessageRecovery, swapReceivingAndSendingChainIDs } from '../../utils';
import { EMPTY_BYTES, CCMStatusCode } from '../../constants';
import { ccmSchema, messageRecoveryParamsSchema } from '../../schemas';
import { BaseCCMethod } from '../../base_cc_method';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from '../../stores/terminated_outbox';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../events/ccm_processed';

export class MainchainMessageRecoveryCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = messageRecoveryParamsSchema;

	public get name(): string {
		return 'messageRecovery';
	}

	public async verify(
		context: CommandVerifyContext<MessageRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, idxs, crossChainMessages, siblingHashes },
		} = context;
		const chainIdAsBuffer = chainID;
		let terminatedChainOutboxAccount: TerminatedOutboxAccount | undefined;

		try {
			terminatedChainOutboxAccount = await this.stores
				.get(TerminatedOutboxStore)
				.get(context, chainIdAsBuffer);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		return verifyMessageRecovery(
			{ idxs, crossChainMessages, siblingHashes },
			terminatedChainOutboxAccount,
		);
	}

	public async execute(context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {
		const { params } = context;

		const chainIdAsBuffer = params.chainID;

		const updatedCCMs: Buffer[] = [];
		const deserializedCCMs = params.crossChainMessages.map(serializedCCMsg =>
			codec.decode<CCMsg>(ccmSchema, serializedCCMsg),
		);
		for (const ccm of deserializedCCMs) {
			const methodsWithBeforeRecoverCCM = [...this.interoperableCCMethods.values()].filter(method =>
				Reflect.has(method, 'beforeRecoverCCM'),
			) as Pick<Required<BaseCCMethod>, 'beforeRecoverCCM'>[];
			for (const method of methodsWithBeforeRecoverCCM) {
				await method.beforeRecoverCCM({ ...context, ccm });
			}

			const recoveryCCM: CCMsg = {
				...ccm,
				fee: BigInt(0),
				status: CCMStatusCode.RECOVERED,
			};
			const encodedUpdatedCCM = codec.encode(ccmSchema, recoveryCCM);
			updatedCCMs.push(encodedUpdatedCCM);
		}

		const doesTerminatedOutboxAccountExist = await this.stores
			.get(TerminatedOutboxStore)
			.has(context, chainIdAsBuffer);

		if (!doesTerminatedOutboxAccountExist) {
			throw new Error('Terminated outbox account does not exist.');
		}

		const terminatedChainOutboxAccount = await this.stores
			.get(TerminatedOutboxStore)
			.get(context, chainIdAsBuffer);
		const terminatedChainOutboxSize = terminatedChainOutboxAccount.outboxSize;

		const proof = {
			size: terminatedChainOutboxSize,
			indexes: params.idxs,
			siblingHashes: params.siblingHashes,
		};

		const hashedUpdatedCCMs = updatedCCMs.map(ccm => utils.hash(ccm));

		const outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedUpdatedCCMs, proof);

		await this.stores.get(TerminatedOutboxStore).set(context, chainIdAsBuffer, {
			...terminatedChainOutboxAccount,
			outboxRoot,
		});

		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		for (const ccm of deserializedCCMs) {
			const newCcm = swapReceivingAndSendingChainIDs(ccm);

			if (ownChainAccount.chainID.equals(ccm.receivingChainID)) {
				const ccCommands = this.ccCommands.get(newCcm.module);

				if (!ccCommands) {
					continue;
				}

				const ccCommand = ccCommands.find(command => command.name === newCcm.crossChainCommand);

				if (!ccCommand) {
					continue;
				}

				await ccCommand.execute({ ...context, ccm: newCcm });
				continue;
			}

			const ccmChainId = newCcm.receivingChainID;
			const chainAccountExist = await this.stores.get(ChainAccountStore).has(context, ccmChainId);
			const isLive = await this.internalMethod.isLive(context, ccmChainId, Date.now());

			if (!chainAccountExist || !isLive) {
				continue;
			}

			const chainAccount = await this.stores.get(ChainAccountStore).get(context, ccmChainId);

			if (chainAccount.status !== ChainStatus.ACTIVE) {
				continue;
			}

			await this.internalMethod.addToOutbox(context, ccmChainId, newCcm);
		}
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	private async _applyRecovery(context: CrossChainMessageContext): Promise<void> {
		const { logger } = context;
		const ccmID = utils.hash(codec.encode(ccmSchema, context.ccm));
		const ccm: CCMsg = {
			...context.ccm,
			status: CCMStatusCode.RECOVERED,
			sendingChainID: context.ccm.receivingChainID,
			receivingChainID: context.ccm.sendingChainID,
		};

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.verifyCrossChainMessage) {
					logger.debug(
						{
							moduleName: module,
							commandName: ccm.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute verifyCrossChainMessage',
					);
					await method.verifyCrossChainMessage(context);
				}
			}
		} catch (error) {
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}
		const commands = this.ccCommands.get(ccm.module);
		if (!commands) {
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.MODULE_NOT_SUPPORTED,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}
		const command = commands.find(com => com.name === ccm.crossChainCommand);
		if (!command) {
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}
		if (command.verify) {
			try {
				await command.verify(context);
			} catch (error) {
				logger.info(
					{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
					'Fail to verify cross chain command.',
				);
				this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
					ccmID,
					code: CCMProcessedCode.INVALID_CCM_VERIFY_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				});
				return;
			}
		}
		const baseEventSnapshotID = context.eventQueue.createSnapshot();
		const baseStateSnapshotID = context.stateStore.createSnapshot();

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.beforeCrossChainCommandExecute) {
					logger.debug(
						{
							moduleName: module,
							commandName: ccm.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute beforeCrossChainCommandExecute',
					);
					await method.beforeCrossChainCommandExecute(context);
				}
			}
		} catch (error) {
			context.eventQueue.restoreSnapshot(baseEventSnapshotID);
			context.stateStore.restoreSnapshot(baseStateSnapshotID);
			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to execute beforeCrossChainCommandExecute.',
			);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}

		const execEventSnapshotID = context.eventQueue.createSnapshot();
		const execStateSnapshotID = context.stateStore.createSnapshot();

		try {
			const params = command.schema ? codec.decode(command.schema, ccm.params) : {};
			await command.execute({ ...context, params });
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.SUCCESS,
				result: CCMProcessedResult.APPLIED,
			});
		} catch (error) {
			context.eventQueue.restoreSnapshot(execEventSnapshotID);
			context.stateStore.restoreSnapshot(execStateSnapshotID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.FAILED_CCM,
				result: CCMProcessedResult.DISCARDED,
			});
		}

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.afterCrossChainCommandExecute) {
					logger.debug(
						{
							moduleName: module,
							commandName: ccm.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute afterCrossChainCommandExecute',
					);
					await method.afterCrossChainCommandExecute(context);
				}
			}
		} catch (error) {
			context.eventQueue.restoreSnapshot(baseEventSnapshotID);
			context.stateStore.restoreSnapshot(baseStateSnapshotID);
			logger.info(
				{ err: error as Error, moduleName: module, commandName: ccm.crossChainCommand },
				'Fail to execute afterCrossChainCommandExecute',
			);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
		}
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	private async _forwardRecovery(context: CrossChainMessageContext): Promise<void> {
		const { logger } = context;
		const ccmID = utils.hash(codec.encode(ccmSchema, context.ccm));
		const ccm: CCMsg = {
			...context.ccm,
			status: CCMStatusCode.RECOVERED,
			sendingChainID: context.ccm.receivingChainID,
			receivingChainID: context.ccm.sendingChainID,
		};

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.verifyCrossChainMessage) {
					logger.debug(
						{
							moduleName: module,
							commandName: ccm.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute verifyCrossChainMessage',
					);
					await method.verifyCrossChainMessage(context);
				}
			}
		} catch (error) {
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}
		const baseEventSnapshotID = context.eventQueue.createSnapshot();
		const baseStateSnapshotID = context.stateStore.createSnapshot();

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
			context.eventQueue.restoreSnapshot(baseEventSnapshotID);
			context.stateStore.restoreSnapshot(baseStateSnapshotID);
			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to execute beforeCrossChainMessageForwarding.',
			);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}

		await this.internalMethod.addToOutbox(context, ccm.receivingChainID, ccm);
		const recoveredCCMID = utils.hash(codec.encode(ccmSchema, ccm));

		this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
			ccmID: recoveredCCMID,
			code: CCMProcessedCode.SUCCESS,
			result: CCMProcessedResult.FORWARDED,
		});
	}
}
