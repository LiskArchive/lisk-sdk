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
import { utils } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { CommandExecuteContext, CommandVerifyContext } from '../../state_machine';
import { BaseInteroperabilityCommand } from './base_interoperability_command';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';
import { BaseInteroperabilityMethod } from './base_interoperability_method';
import { CCMStatusCode, EMPTY_BYTES, EmptyCCM } from './constants';
import { CCMProcessedCode, CcmProcessedEvent, CCMProcessedResult } from './events/ccm_processed';
import { CcmSendSuccessEvent } from './events/ccm_send_success';
import { ccmSchema, crossChainUpdateTransactionParams } from './schemas';
import {
	CCMsg,
	CCUpdateParams,
	CrossChainMessageContext,
	CrossChainUpdateTransactionParams,
	TokenMethod,
} from './types';
import { ChainAccountStore, ChainStatus } from './stores/chain_account';
import {
	emptyActiveValidatorsUpdate,
	getEncodedCCMAndID,
	getMainchainID,
	isInboxUpdateEmpty,
	validateFormat,
} from './utils';
import { ChainValidatorsStore } from './stores/chain_validators';
import { OwnChainAccountStore } from './stores/own_chain_account';

export abstract class BaseCrossChainUpdateCommand<
	T extends BaseInteroperabilityInternalMethod,
> extends BaseInteroperabilityCommand<T> {
	public schema = crossChainUpdateTransactionParams;

	protected _tokenMethod!: TokenMethod;
	protected _interopsMethod!: BaseInteroperabilityMethod<T>;

	public init(interopsMethod: BaseInteroperabilityMethod<T>, tokenMethod: TokenMethod) {
		this._tokenMethod = tokenMethod;
		this._interopsMethod = interopsMethod;
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#verifycommon
	protected async verifyCommon(
		context: CommandVerifyContext<CrossChainUpdateTransactionParams>,
		isMainchain: boolean,
	): Promise<void> {
		const { params } = context;

		validator.validate(crossChainUpdateTransactionParams, params);

		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		if (params.sendingChainID.equals(ownChainAccount.chainID)) {
			throw new Error('The sending chain cannot be the same as the receiving chain.');
		}

		// An empty object has all properties set to their default values
		if (params.certificate.length === 0 && isInboxUpdateEmpty(params.inboxUpdate)) {
			throw new Error(
				'A cross-chain update must contain a non-empty certificate and/or a non-empty inbox update.',
			);
		}

		// The sending chain account must exist
		const sendingChainAccount = await this.stores
			.get(ChainAccountStore)
			.getOrUndefined(context, params.sendingChainID);
		if (!sendingChainAccount) {
			throw new Error('The sending chain is not registered.');
		}

		let live;
		if (isMainchain) {
			live = await this.internalMethod.isLive(
				context,
				params.sendingChainID,
				context.header.timestamp,
			);
		} else {
			live = await this.internalMethod.isLive(context, params.sendingChainID);
		}
		if (!live) {
			throw new Error('The sending chain is not live.');
		}

		if (sendingChainAccount.status === ChainStatus.REGISTERED && params.certificate.length === 0) {
			throw new Error(
				`Cross-chain updates from chains with status ${ChainStatus.REGISTERED} must contain a non-empty certificate.`,
			);
		}

		if (params.certificate.length > 0) {
			await this.internalMethod.verifyCertificate(context, params, context.header.timestamp);
		}

		const sendingChainValidators = await this.stores
			.get(ChainValidatorsStore)
			.get(context, params.sendingChainID);
		if (
			!emptyActiveValidatorsUpdate(params.activeValidatorsUpdate) ||
			params.certificateThreshold !== sendingChainValidators.certificateThreshold
		) {
			await this.internalMethod.verifyValidatorsUpdate(context, params);
		}

		if (!isInboxUpdateEmpty(params.inboxUpdate)) {
			this.internalMethod.verifyOutboxRootWitness(context, params);
		}
	}

	protected async beforeCrossChainMessagesExecution(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
		isMainchain: boolean,
	): Promise<[CCMsg[], boolean]> {
		const { params, transaction } = context;
		const { inboxUpdate } = params;

		// Verify certificate signature. We do it here because if it fails, the transaction fails rather than being invalid.
		await this.internalMethod.verifyCertificateSignature(context, params);

		if (!isInboxUpdateEmpty(inboxUpdate)) {
			// This check is expensive. Therefore, it is done in the execute step instead of the verify
			// step. Otherwise, a malicious relayer could spam the transaction pool with computationally
			// costly CCU verifications without paying fees.
			try {
				await this.internalMethod.verifyPartnerChainOutboxRoot(context, params);
			} catch (error) {
				return [[], false];
			}

			// Initialize the relayer account for the message fee token.
			// This is necessary to ensure that the relayer can receive the CCM fees
			// If the account already exists, nothing is done.
			const messageFeeTokenID = await this._interopsMethod.getMessageFeeTokenID(
				context,
				params.sendingChainID,
			);
			await this._tokenMethod.initializeUserAccount(
				context,
				transaction.senderAddress,
				messageFeeTokenID,
			);
		}

		const ccms: CCMsg[] = [];
		let ccm: CCMsg;

		// Process cross-chain messages in inbox update.
		// First process basic checks for all CCMs.
		for (const ccmBytes of inboxUpdate.crossChainMessages) {
			try {
				// Verify general format. Past this point, we can access ccm root properties.
				ccm = codec.decode<CCMsg>(ccmSchema, ccmBytes);
			} catch (error) {
				await this.internalMethod.terminateChainInternal(context, params.sendingChainID);
				this.events.get(CcmProcessedEvent).log(context, params.sendingChainID, context.chainID, {
					ccm: EmptyCCM,
					result: CCMProcessedResult.DISCARDED,
					code: CCMProcessedCode.INVALID_CCM_DECODING_EXCEPTION,
				});
				// In this case, we do not even update the chain account with the new certificate.
				return [[], false];
			}

			try {
				validateFormat(ccm);
			} catch (error) {
				await this.internalMethod.terminateChainInternal(context, params.sendingChainID);
				ccm = { ...ccm, params: EMPTY_BYTES };
				this.events
					.get(CcmProcessedEvent)
					.log(context, params.sendingChainID, ccm.receivingChainID, {
						ccm,
						result: CCMProcessedResult.DISCARDED,
						code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					});
				// In this case, we do not even update the chain account with the new certificate.
				return [[], false];
			}

			try {
				// Verify whether the CCM respects the routing rules,
				// which differ on mainchain and sidechains.
				this._verifyRoutingRules(context, isMainchain, ccm);
				ccms.push(ccm);
			} catch (error) {
				await this.internalMethod.terminateChainInternal(context, params.sendingChainID);
				this.events
					.get(CcmProcessedEvent)
					.log(context, params.sendingChainID, ccm.receivingChainID, {
						ccm,
						result: CCMProcessedResult.DISCARDED,
						code: CCMProcessedCode.INVALID_CCM_ROUTING_EXCEPTION,
					});
				// In this case, we do not even update the chain account with the new certificate.
				return [[], false];
			}
		}

		return [ccms, true];
	}

	private _verifyRoutingRules(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
		isMainchain: boolean,
		ccm: CCMsg,
	) {
		// Sending and receiving chains must differ.
		if (ccm.receivingChainID.equals(ccm.sendingChainID)) {
			throw new Error('Sending and receiving chains must differ.');
		}

		// Processing on the mainchain
		if (isMainchain) {
			if (!ccm.sendingChainID.equals(context.params.sendingChainID)) {
				throw new Error('CCM is not from the sending chain.');
			}
			if (ccm.status === CCMStatusCode.CHANNEL_UNAVAILABLE) {
				throw new Error('CCM status channel unavailable can only be set on the mainchain.');
			}
		} else {
			// The CCM must come be directed to the sidechain, unless it was bounced on the mainchain.
			// eslint-disable-next-line no-lonely-if
			if (!context.chainID.equals(ccm.receivingChainID)) {
				throw new Error('CCM is not directed to the sidechain.');
			}
		}
	}

	protected async afterCrossChainMessagesExecution(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
	) {
		const { params } = context;

		// Update sidechain validators.
		const sendingChainValidators = await this.stores
			.get(ChainValidatorsStore)
			.get(context, params.sendingChainID);
		if (
			!emptyActiveValidatorsUpdate(params.activeValidatorsUpdate) ||
			params.certificateThreshold !== sendingChainValidators.certificateThreshold
		) {
			await this.internalMethod.updateValidators(context, params);
		}

		if (params.certificate.length > 0) {
			await this.internalMethod.updateCertificate(context, params);
		}

		if (!isInboxUpdateEmpty(params.inboxUpdate) && params.certificate.length > 0) {
			await this.internalMethod.updatePartnerChainOutboxRoot(context, params);
		}
	}

	private async _beforeCrossChainCommandExecute(
		context: CrossChainMessageContext,
		baseEventSnapshotID: number,
		baseStateSnapshotID: number,
	): Promise<boolean> {
		const { ccm, logger } = context;
		const { ccmID } = getEncodedCCMAndID(ccm);

		try {
			// Call the beforeCrossChainCommandExecute functions from other modules.
			// For example, the Token module assigns the message fee to the CCU sender.
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
			// revert state to baseSnapshot
			context.eventQueue.restoreSnapshot(baseEventSnapshotID);
			context.stateStore.restoreSnapshot(baseStateSnapshotID);

			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to execute beforeCrossChainCommandExecute.',
			);

			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccm,
				result: CCMProcessedResult.DISCARDED,
				code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
			});
			return false;
		}

		return true;
	}

	private async _afterCrossChainCommandExecute(
		context: CrossChainMessageContext,
		baseEventSnapshotID: number,
		baseStateSnapshotID: number,
	): Promise<boolean> {
		const { ccm, logger } = context;
		const { ccmID } = getEncodedCCMAndID(ccm);

		try {
			// Call the beforeCrossChainCommandExecute functions from other modules.
			// For example, the Token module assigns the message fee to the CCU sender.
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
			// revert state to baseSnapshot
			context.eventQueue.restoreSnapshot(baseEventSnapshotID);
			context.stateStore.restoreSnapshot(baseStateSnapshotID);

			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to execute afterCrossChainCommandExecute.',
			);

			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccm,
				result: CCMProcessedResult.DISCARDED,
				code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
			});
			return false;
		}

		return true;
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#apply
	protected async apply(context: CrossChainMessageContext): Promise<void> {
		const { ccm, logger } = context;
		const { ccmID, encodedCCM } = getEncodedCCMAndID(ccm);
		const valid = await this.verifyCCM(context, ccmID);
		if (!valid) {
			return;
		}

		// Create a state snapshot.
		const baseEventSnapshotID = context.eventQueue.createSnapshot();
		const baseStateSnapshotID = context.stateStore.createSnapshot();

		let statusCode;
		let processedCode;

		let crossChainCommand;

		// ccm.module supported ?
		const crossChainCommands = this.ccCommands.get(ccm.module);
		if (!crossChainCommands) {
			statusCode = CCMStatusCode.MODULE_NOT_SUPPORTED;
			processedCode = CCMProcessedCode.MODULE_NOT_SUPPORTED;
		} else {
			// ccm.crossChainCommand supported ?
			crossChainCommand = crossChainCommands.find(com => com.name === ccm.crossChainCommand);
			if (!crossChainCommand) {
				statusCode = CCMStatusCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED;
				processedCode = CCMProcessedCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED;
			}
		}

		if (!crossChainCommands || !crossChainCommand) {
			if (
				!(await this._beforeCrossChainCommandExecute(
					context,
					baseEventSnapshotID,
					baseStateSnapshotID,
				))
			) {
				return;
			}
			if (
				!(await this._afterCrossChainCommandExecute(
					context,
					baseEventSnapshotID,
					baseStateSnapshotID,
				))
			) {
				return;
			}
			await this.bounce(
				context,
				encodedCCM.length,
				statusCode as CCMStatusCode,
				processedCode as CCMProcessedCode,
			);
			return;
		}

		// Although this part is not mentioned in LIP, but it covers #8558
		let decodedParams;
		try {
			decodedParams = codec.decode(crossChainCommand.schema, context.ccm.params);
			validator.validate(crossChainCommand.schema, decodedParams);
		} catch (error) {
			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Invalid CCM params.',
			);
			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccm,
				result: CCMProcessedResult.DISCARDED,
				code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
			});
			return;
		}

		if (crossChainCommand.verify) {
			try {
				await crossChainCommand.verify(context);
			} catch (error) {
				logger.info(
					{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
					'Fail to verify cross chain command.',
				);
				await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
				this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
					ccm,
					result: CCMProcessedResult.DISCARDED,
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
				});
				return;
			}
		}

		if (
			!(await this._beforeCrossChainCommandExecute(
				context,
				baseEventSnapshotID,
				baseStateSnapshotID,
			))
		) {
			return;
		}

		// Continue to ccm execution only if there was no error until now.
		// Create a state snapshot.
		const execEventSnapshotID = context.eventQueue.createSnapshot();
		const execStateSnapshotID = context.stateStore.createSnapshot();

		try {
			/**
			 * This could happen during the execution of a mainchain CCU containing a CCM
			 * from a sidechain for which a direct channel has been registered.
			 * Then, ccu.params.sendingChainID == getMainchainID().
			 * This is not necessarily a violation of the protocol, since the message
			 * could have been sent before the direct channel was opened.
			 */
			const sendingChainExists = await this.stores
				.get(ChainAccountStore)
				.has(context, ccm.sendingChainID);

			const ccuParams = codec.decode<CCUpdateParams>(
				crossChainUpdateTransactionParams,
				context.transaction.params,
			);
			if (sendingChainExists && !ccuParams.sendingChainID.equals(ccm.sendingChainID)) {
				throw new Error('Cannot receive forwarded messages for a direct channel.');
			}

			// Execute the cross-chain command.
			await crossChainCommand.execute({ ...context, params: decodedParams });
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccm,
				result: CCMProcessedResult.APPLIED,
				code: CCMProcessedCode.SUCCESS,
			});
		} catch (error) {
			// revert state to executionSnapshot
			context.eventQueue.restoreSnapshot(execEventSnapshotID);
			context.stateStore.restoreSnapshot(execStateSnapshotID);

			// in case of error, run `afterCrossChainCommandExecute` & `bounce` followed by `return`
			if (
				!(await this._afterCrossChainCommandExecute(
					context,
					baseEventSnapshotID,
					baseStateSnapshotID,
				))
			) {
				return;
			}
			await this.bounce(
				context,
				encodedCCM.length,
				CCMStatusCode.FAILED_CCM,
				CCMProcessedCode.FAILED_CCM,
			);
			return;
		}

		// run `afterCrossChainCommandExecute` after a successful command execution (i.e., when there is no error in above `try` block)
		await this._afterCrossChainCommandExecute(context, baseEventSnapshotID, baseStateSnapshotID);
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#bounce
	protected async bounce(
		context: CrossChainMessageContext,
		ccmSize: number,
		ccmStatusCode: CCMStatusCode,
		ccmProcessedCode: CCMProcessedCode,
	): Promise<void> {
		const { ccm } = context;
		const minReturnFeePerByte = await this._interopsMethod.getMinReturnFeePerByte(
			context,
			ccm.sendingChainID,
		);
		const minFee = minReturnFeePerByte * BigInt(ccmSize);
		if (ccm.status !== CCMStatusCode.OK || ccm.fee < minFee) {
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				code: ccmProcessedCode,
				result: CCMProcessedResult.DISCARDED,
				ccm,
			});
			return;
		}
		this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
			code: ccmProcessedCode,
			result: CCMProcessedResult.BOUNCED,
			ccm,
		});
		const bouncedCCM = {
			...ccm,
			status: ccmStatusCode,
			sendingChainID: ccm.receivingChainID,
			receivingChainID: ccm.sendingChainID,
			// The fee of the bounced ccm is set to 0 because it was assigned to the relayer.
			fee: BigInt(0),
		};

		let partnerChainID: Buffer;

		const mainchainID = getMainchainID(bouncedCCM.receivingChainID);
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		// Processing on the mainchain
		if (ownChainAccount.chainID.equals(mainchainID)) {
			partnerChainID = bouncedCCM.receivingChainID;
			// Processing on a sidechain
		} else {
			// Check for direct channel
			const receivingChainExists = await this.stores
				.get(ChainAccountStore)
				.has(context, bouncedCCM.receivingChainID);

			partnerChainID = !receivingChainExists ? mainchainID : bouncedCCM.receivingChainID;
		}

		await this.internalMethod.addToOutbox(context, partnerChainID, bouncedCCM);
		const newCcmID = utils.hash(codec.encode(ccmSchema, bouncedCCM));
		this.events
			.get(CcmSendSuccessEvent)
			.log(context, bouncedCCM.sendingChainID, bouncedCCM.receivingChainID, newCcmID, {
				ccm: bouncedCCM,
			});
	}

	protected async verifyCCM(context: CrossChainMessageContext, ccmID: Buffer): Promise<boolean> {
		const { ccm, logger } = context;
		try {
			const isLive = await this.internalMethod.isLive(context, ccm.sendingChainID);
			if (!isLive) {
				throw new Error(`Sending chain ${ccm.sendingChainID.toString('hex')} is not live.`);
			}
			// Modules can verify the CCM.
			// The Token module verifies the escrowed balance in the CCM sending chain for the message fee.
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.verifyCrossChainMessage) {
					logger.debug({ module, ccmID: ccmID.toString('hex') }, 'verifying cross chain message');
					await method.verifyCrossChainMessage(context);
				}
			}
			return true;
		} catch (error) {
			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to verify cross chain message.',
			);
			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			// Notice that, since the sending chain has been terminated,
			// the verification of all future CCMs will fail.
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
				ccm,
			});
			return false;
		}
	}
}
