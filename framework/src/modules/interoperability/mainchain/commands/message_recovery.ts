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
import { verifyMessageRecovery } from '../../utils';
import { CCMStatusCode, COMMAND_NAME_MESSAGE_RECOVERY, CHAIN_ID_MAINCHAIN } from '../../constants';
import { ccmSchema, messageRecoveryParamsSchema } from '../../schemas';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from '../../stores/terminated_outbox';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../events/ccm_processed';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#message-recovery-command
export class MainchainMessageRecoveryCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = messageRecoveryParamsSchema;

	public get name(): string {
		return COMMAND_NAME_MESSAGE_RECOVERY;
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#verification-1
	public async verify(
		context: CommandVerifyContext<MessageRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, crossChainMessages },
		} = context;
		let terminatedChainOutboxAccount: TerminatedOutboxAccount;

		try {
			terminatedChainOutboxAccount = await this.stores
				.get(TerminatedOutboxStore)
				.get(context, chainID);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return verifyMessageRecovery(context.params);
		}

		const deserializedCCMs = crossChainMessages.map(ccm => codec.decode<CCMsg>(ccmSchema, ccm));

		for (const ccm of deserializedCCMs) {
			// The sending chain must be live.
			const isLive = await this.internalMethod.isLive(context, ccm.sendingChainID, Date.now());
			if (!isLive) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Cross-chain message sending chain is not live.'),
				};
			}
		}

		return verifyMessageRecovery(context.params, terminatedChainOutboxAccount);
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#execution-1
	public async execute(context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {
		const { params } = context;
		// Set CCM status to recovered and assign fee to trs sender.
		const recoveredCCMs: Buffer[] = [];
		for (const crossChainMessage of params.crossChainMessages) {
			const ccm = codec.decode<CCMsg>(ccmSchema, crossChainMessage);
			const ctx: CrossChainMessageContext = {
				...context,
				ccm,
			};
			// If the sending chain is the mainchain, recover the CCM.
			// This function never raises an error.
			if (ccm.sendingChainID.equals(CHAIN_ID_MAINCHAIN)) {
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

		const terminatedOutboxAccount = await this.stores
			.get(TerminatedOutboxStore)
			.get(context, context.params.chainID);
		if (!terminatedOutboxAccount) {
			throw new Error('Terminated outbox account does not exist.');
		}

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
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
				logger.debug(
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
			logger.debug(
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
			logger.debug(
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
			logger.debug(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
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
			logger.debug(
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
