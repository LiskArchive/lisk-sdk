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
import { CommandExecuteContext, CommandVerifyContext } from '../../state_machine';
import { BaseInteroperabilityCommand } from './base_interoperability_command';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';
import { BaseInteroperabilityMethod } from './base_interoperability_method';
import { CCMStatusCode, EMPTY_BYTES, MIN_RETURN_FEE } from './constants';
import { CCMProcessedCode, CcmProcessedEvent, CCMProcessedResult } from './events/ccm_processed';
import { CcmSendSuccessEvent } from './events/ccm_send_success';
import { ccmSchema, crossChainUpdateTransactionParams } from './schemas';
import {
	CCMsg,
	CrossChainMessageContext,
	CrossChainUpdateTransactionParams,
	TokenMethod,
} from './types';
import { ChainAccountStore, ChainStatus } from './stores/chain_account';
import { getEncodedCCMAndID, getMainchainID, isInboxUpdateEmpty, validateFormat } from './utils';
import { ChainValidatorsStore } from './stores/chain_validators';
import { ChannelDataStore } from './stores/channel_data';

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

	protected async verifyCommon(context: CommandVerifyContext<CrossChainUpdateTransactionParams>) {
		const { params } = context;
		const sendingChainAccount = await this.stores
			.get(ChainAccountStore)
			.get(context, params.sendingChainID);
		if (sendingChainAccount.status === ChainStatus.REGISTERED && params.certificate.length === 0) {
			throw new Error(
				'Cross-chain updates from chains with status CHAIN_STATUS_REGISTERED must contain a non-empty certificate.',
			);
		}
		if (params.certificate.length > 0) {
			await this.internalMethod.verifyCertificate(context, params, context.header.timestamp);
		}
		const sendingChainValidators = await this.stores
			.get(ChainValidatorsStore)
			.get(context, params.sendingChainID);
		if (
			params.activeValidatorsUpdate.length > 0 ||
			params.certificateThreshold !== sendingChainValidators.certificateThreshold
		) {
			await this.internalMethod.verifyValidatorsUpdate(context, params);
		}

		if (!isInboxUpdateEmpty(params.inboxUpdate)) {
			await this.internalMethod.verifyPartnerChainOutboxRoot(context, params);
		}
	}

	protected async executeCommon(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
		isMainchain: boolean,
	): Promise<[CCMsg[], boolean]> {
		const { params, transaction } = context;
		await this.internalMethod.verifyCertificateSignature(context, params);

		if (!isInboxUpdateEmpty(params.inboxUpdate)) {
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

		const decodedCCMs = [];
		for (const ccmBytes of params.inboxUpdate.crossChainMessages) {
			try {
				const ccm = codec.decode<CCMsg>(ccmSchema, ccmBytes);
				validateFormat(ccm);
				decodedCCMs.push(ccm);

				if (!isMainchain && !context.chainID.equals(ccm.receivingChainID)) {
					throw new Error('CCM is not directed to the sidechain.');
				}
				if (isMainchain && !ccm.sendingChainID.equals(params.sendingChainID)) {
					throw new Error('CCM is not from the sending chain.');
				}
				if (ccm.sendingChainID.equals(ccm.receivingChainID)) {
					throw new Error('Sending and receiving chains must differ.');
				}
				if (isMainchain && ccm.status === CCMStatusCode.CHANNEL_UNAVAILABLE) {
					throw new Error('CCM status channel unavailable can only be set on the mainchain.');
				}
			} catch (error) {
				await this.internalMethod.terminateChainInternal(context, params.sendingChainID);
				this.events.get(CcmProcessedEvent).log(context, params.sendingChainID, context.chainID, {
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
					// When failing decode, add event with zero values
					ccm: {
						crossChainCommand: '',
						fee: BigInt(0),
						module: '',
						nonce: BigInt(0),
						params: EMPTY_BYTES,
						receivingChainID: EMPTY_BYTES,
						sendingChainID: EMPTY_BYTES,
						status: 0,
					},
				});
				return [[], false];
			}
		}

		const sendingChainValidators = await this.stores
			.get(ChainValidatorsStore)
			.get(context, params.sendingChainID);
		if (
			params.activeValidatorsUpdate.length > 0 ||
			params.certificateThreshold !== sendingChainValidators.certificateThreshold
		) {
			await this.internalMethod.updateValidators(context, params);
		}
		if (params.certificate.length > 0) {
			await this.internalMethod.updateCertificate(context, params);
		}
		if (!isInboxUpdateEmpty(params.inboxUpdate)) {
			await this.stores
				.get(ChannelDataStore)
				.updatePartnerChainOutboxRoot(
					context,
					params.sendingChainID,
					params.inboxUpdate.messageWitnessHashes,
				);
		}
		return [decodedCCMs, true];
	}

	protected async apply(context: CrossChainMessageContext): Promise<void> {
		const { ccm, logger } = context;
		const { ccmID, encodedCCM } = getEncodedCCMAndID(ccm);
		const valid = await this.verifyCCM(context, ccmID);
		if (!valid) {
			return;
		}
		const commands = this.ccCommands.get(ccm.module);
		if (!commands) {
			await this.bounce(
				context,
				encodedCCM.length,
				CCMStatusCode.MODULE_NOT_SUPPORTED,
				CCMProcessedCode.MODULE_NOT_SUPPORTED,
			);
			return;
		}
		const command = commands.find(com => com.name === ccm.crossChainCommand);
		if (!command) {
			await this.bounce(
				context,
				encodedCCM.length,
				CCMStatusCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
				CCMProcessedCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
			);
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
				await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
				this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
					code: CCMProcessedCode.INVALID_CCM_VALIDATION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
					ccm,
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
			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
				ccm,
			});
			return;
		}

		const execEventSnapshotID = context.eventQueue.createSnapshot();
		const execStateSnapshotID = context.stateStore.createSnapshot();

		try {
			const params = command.schema ? codec.decode(command.schema, context.ccm.params) : {};
			await command.execute({ ...context, params });
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				code: CCMProcessedCode.SUCCESS,
				result: CCMProcessedResult.APPLIED,
				ccm,
			});
		} catch (error) {
			context.eventQueue.restoreSnapshot(execEventSnapshotID);
			context.stateStore.restoreSnapshot(execStateSnapshotID);
			await this.bounce(
				context,
				encodedCCM.length,
				CCMStatusCode.FAILED_CCM,
				CCMProcessedCode.FAILED_CCM,
			);
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
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to execute afterCrossChainCommandExecute',
			);
			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
				ccm,
			});
		}
	}

	protected async bounce(
		context: CrossChainMessageContext,
		ccmSize: number,
		ccmStatusCode: CCMStatusCode,
		ccmProcessedCode: CCMProcessedCode,
	): Promise<void> {
		const { ccm } = context;
		const minFee = MIN_RETURN_FEE * BigInt(ccmSize);
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
			fee: ccmStatusCode === CCMStatusCode.FAILED_CCM ? BigInt(0) : ccm.fee - minFee,
		};
		let partnerChainID: Buffer;
		const doesReceivingChainExist = await this.stores
			.get(ChainAccountStore)
			.has(context, bouncedCCM.receivingChainID);
		if (!doesReceivingChainExist) {
			partnerChainID = getMainchainID(bouncedCCM.receivingChainID);
		} else {
			partnerChainID = bouncedCCM.receivingChainID;
		}

		await this.internalMethod.addToOutbox(context, partnerChainID, bouncedCCM);
		const newCCMID = utils.hash(codec.encode(ccmSchema, bouncedCCM));
		this.events
			.get(CcmSendSuccessEvent)
			.log(context, bouncedCCM.sendingChainID, bouncedCCM.receivingChainID, newCCMID, {
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
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
				ccm,
			});
			return false;
		}
	}
}
