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
	VerifyStatus,
} from '../../../../state_machine/types';
import { CCMsg, CrossChainMessageContext, MessageRecoveryParams } from '../../types';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';
import { getMainchainID, validateFormat } from '../../utils';
import { CCMStatusCode } from '../../constants';
import { ccmSchema, messageRecoveryParamsSchema } from '../../schemas';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from '../../stores/terminated_outbox';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../events/ccm_processed';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#message-recovery-command
export class RecoverMessageCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = messageRecoveryParamsSchema;

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#verification-1
	public async verify(
		context: CommandVerifyContext<MessageRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, crossChainMessages, idxs, siblingHashes },
		} = context;
		let terminatedOutboxAccount: TerminatedOutboxAccount | undefined;

		try {
			terminatedOutboxAccount = await this.stores.get(TerminatedOutboxStore).get(context, chainID);
		} catch (error) {
			if (error instanceof NotFoundError) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Terminated outbox account does not exist.'),
				};
			}
			throw error;
		}

		// Check that the idxs are sorted in ascending order
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#sort_returns_the_reference_to_the_same_array
		// CAUTION! `sort` modifies original array
		const sortedIdxs = [...idxs].sort((a, b) => a - b);
		const isSame =
			idxs.length === sortedIdxs.length &&
			idxs.every((element, index) => element === sortedIdxs[index]);
		if (!isSame) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Cross-chain message indexes are not sorted in ascending order.'),
			};
		}

		// Check that the CCMs are still pending.
		for (const index of idxs) {
			if (index < terminatedOutboxAccount.partnerChainInboxSize) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Cross-chain message is not pending.'),
				};
			}
		}

		// Process basic checks for all CCMs.
		// Verify general format. Past this point, we can access ccm root properties.
		for (const crossChainMessage of crossChainMessages) {
			const ccm = codec.decode<CCMsg>(ccmSchema, crossChainMessage);
			validateFormat(ccm);

			if (ccm.status !== CCMStatusCode.OK) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Cross-chain message status is not valid.'),
				};
			}

			// The receiving chain must be the terminated chain.
			if (!ccm.receivingChainID.equals(chainID)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Cross-chain message receiving chain ID is not valid.'),
				};
			}

			// The sending chain must be live.
			const isLive = await this.internalMethod.isLive(context, ccm.sendingChainID, Date.now());
			if (!isLive) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Cross-chain message sending chain is not live.'),
				};
			}
		}

		// Check the inclusion proof against the sidechain outbox root.
		const proof = {
			size: terminatedOutboxAccount.outboxSize,
			idxs,
			siblingHashes,
		};

		// Convert each CCM byte to sha256 hash
		const hashedCCMs = crossChainMessages.map(ccm => utils.hash(ccm));
		const isVerified = regularMerkleTree.verifyDataBlock(
			hashedCCMs,
			proof,
			terminatedOutboxAccount.outboxRoot,
		);
		if (!isVerified) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Message recovery proof of inclusion is not valid.'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#execution-1
	public async execute(context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {
		const { params } = context;
		// Set CCM status to recovered and assign fee to trs sender.
		const recoveredCCMs: Buffer[] = [];
		for (const crossChainMessage of params.crossChainMessages) {
			const ccmID = utils.hash(crossChainMessage);
			const ccm = codec.decode<CCMsg>(ccmSchema, crossChainMessage);
			const ctx: CrossChainMessageContext = {
				...context,
				ccm,
				eventQueue: context.eventQueue.getChildQueue(ccmID),
			};
			// If the sending chain is the mainchain, recover the CCM.
			// This function never raises an error.
			if (ccm.sendingChainID.equals(getMainchainID(context.chainID))) {
				await this._applyRecovery(ctx);
			} else {
				// If the sending chain is not the mainchain, forward the CCM.
				// This function never raises an error.
				await this._forwardRecovery(ctx);

				// Append the recovered CCM to the list of recovered CCMs.
				// Notice that the ccm has been mutated in the applyRecovery and forwardRecovery functions
				// as the status is set to CCM_STATUS_CODE_RECOVERED (so that it cannot be recovered again).
				recoveredCCMs.push(codec.encode(ccmSchema, ccm));
			}
		}

		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);
		const terminatedOutboxAccount = await terminatedOutboxSubstore.get(
			context,
			context.params.chainID,
		);

		// Update sidechain outbox root.
		const proof = {
			size: terminatedOutboxAccount.outboxSize,
			indexes: params.idxs,
			siblingHashes: params.siblingHashes,
		};

		terminatedOutboxAccount.outboxRoot = regularMerkleTree.calculateRootFromUpdateData(
			recoveredCCMs.map(ccm => utils.hash(ccm)),
			proof,
		);

		await terminatedOutboxSubstore.set(context, context.params.chainID, terminatedOutboxAccount);
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	private async _applyRecovery(context: CrossChainMessageContext): Promise<void> {
		const { logger } = context;
		const encodedCCM = codec.encode(ccmSchema, context.ccm);
		const ccmID = utils.hash(encodedCCM);
		const recoveredCCM: CCMsg = {
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
							commandName: recoveredCCM.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute verifyCrossChainMessage',
					);
					await method.verifyCrossChainMessage(context);
				}
			}
		} catch (error) {
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
					ccm: recoveredCCM,
				});
			return;
		}
		const commands = this.ccCommands.get(recoveredCCM.module);
		if (!commands) {
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.MODULE_NOT_SUPPORTED,
					result: CCMProcessedResult.DISCARDED,
					ccm: recoveredCCM,
				});
			return;
		}
		const command = commands.find(com => com.name === recoveredCCM.crossChainCommand);
		if (!command) {
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
					result: CCMProcessedResult.DISCARDED,
					ccm: recoveredCCM,
				});
			return;
		}
		if (command.verify) {
			try {
				await command.verify(context);
			} catch (error) {
				logger.debug(
					{
						err: error as Error,
						moduleName: recoveredCCM.module,
						commandName: recoveredCCM.crossChainCommand,
					},
					'Fail to verify cross chain command.',
				);
				this.events
					.get(CcmProcessedEvent)
					.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
						code: CCMProcessedCode.INVALID_CCM_VERIFY_EXCEPTION,
						result: CCMProcessedResult.DISCARDED,
						ccm: recoveredCCM,
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
							commandName: recoveredCCM.crossChainCommand,
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
			logger.debug(
				{
					err: error as Error,
					moduleName: recoveredCCM.module,
					commandName: recoveredCCM.crossChainCommand,
				},
				'Fail to execute beforeCrossChainCommandExecute.',
			);
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
					ccm: recoveredCCM,
				});
			return;
		}

		const execEventSnapshotID = context.eventQueue.createSnapshot();
		const execStateSnapshotID = context.stateStore.createSnapshot();

		try {
			const params = command.schema ? codec.decode(command.schema, recoveredCCM.params) : {};
			await command.execute({ ...context, params });
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.SUCCESS,
					result: CCMProcessedResult.APPLIED,
					ccm: recoveredCCM,
				});
		} catch (error) {
			context.eventQueue.restoreSnapshot(execEventSnapshotID);
			context.stateStore.restoreSnapshot(execStateSnapshotID);
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.FAILED_CCM,
					result: CCMProcessedResult.DISCARDED,
					ccm: recoveredCCM,
				});
		}

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.afterCrossChainCommandExecute) {
					logger.debug(
						{
							moduleName: module,
							commandName: recoveredCCM.crossChainCommand,
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
			logger.debug(
				{ err: error as Error, moduleName: module, commandName: recoveredCCM.crossChainCommand },
				'Fail to execute afterCrossChainCommandExecute',
			);
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
					ccm: recoveredCCM,
				});
		}
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	private async _forwardRecovery(context: CrossChainMessageContext): Promise<void> {
		const { logger } = context;
		const encodedCCM = codec.encode(ccmSchema, context.ccm);
		const ccmID = utils.hash(encodedCCM);
		const recoveredCCM: CCMsg = {
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
							commandName: recoveredCCM.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute verifyCrossChainMessage',
					);
					await method.verifyCrossChainMessage(context);
				}
			}
		} catch (error) {
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
					ccm: recoveredCCM,
				});
			logger.debug(
				{
					err: error as Error,
					moduleName: recoveredCCM.module,
					commandName: recoveredCCM.crossChainCommand,
				},
				'Fail to execute verifyCrossChainMessage.',
			);
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
							commandName: recoveredCCM.crossChainCommand,
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
			logger.debug(
				{
					err: error as Error,
					moduleName: recoveredCCM.module,
					commandName: recoveredCCM.crossChainCommand,
				},
				'Fail to execute beforeCrossChainMessageForwarding.',
			);
			this.events
				.get(CcmProcessedEvent)
				.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
					ccm: recoveredCCM,
				});
			return;
		}

		await this.internalMethod.addToOutbox(context, recoveredCCM.receivingChainID, recoveredCCM);

		this.events
			.get(CcmProcessedEvent)
			.log(context, recoveredCCM.sendingChainID, recoveredCCM.receivingChainID, {
				code: CCMProcessedCode.SUCCESS,
				result: CCMProcessedResult.FORWARDED,
				ccm: recoveredCCM,
			});
	}
}
