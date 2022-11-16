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
import { certificateSchema } from '../../../../engine/consensus/certificate_generation/schema';
import { Certificate } from '../../../../engine/consensus/certificate_generation/types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	NotFoundError,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { BaseCrossChainUpdateCommand } from '../../base_cross_chain_update_command';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
	EMPTY_FEE_ADDRESS,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
} from '../../constants';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../events/ccm_processed';
import {
	ccmSchema,
	crossChainUpdateTransactionParams,
	sidechainTerminatedCCMParamsSchema,
} from '../../schemas';
import { ChainAccount, ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import { ChainValidatorsStore } from '../../stores/chain_validators';
import { ChannelDataStore } from '../../stores/channel_data';
import { CCMsg, CrossChainMessageContext, CrossChainUpdateTransactionParams } from '../../types';
import {
	checkCertificateTimestamp,
	checkCertificateValidity,
	checkInboxUpdateValidity,
	checkLivenessRequirementFirstCCU,
	checkValidatorsHashWithCertificate,
	checkValidCertificateLiveness,
	commonCCUExecutelogic,
	isInboxUpdateEmpty,
	validateFormat,
} from '../../utils';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';

export class MainchainCCUpdateCommand extends BaseCrossChainUpdateCommand<MainchainInteroperabilityInternalMethod> {
	public async verify(
		context: CommandVerifyContext<CrossChainUpdateTransactionParams>,
	): Promise<VerificationResult> {
		const { params: txParams } = context;

		try {
			validator.validate(crossChainUpdateTransactionParams, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const partnerChainStore = this.stores.get(ChainAccountStore);
		const partnerChainAccount = await partnerChainStore.get(context, txParams.sendingChainID);

		// Section: Liveness of Partner Chain
		if (partnerChainAccount.status === ChainStatus.TERMINATED) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Sending partner chain ${txParams.sendingChainID.readInt32BE(0)} is terminated.`,
				),
			};
		}

		if (partnerChainAccount.status === ChainStatus.ACTIVE) {
			const isLive = await this.internalMethod.isLive(context, txParams.sendingChainID, Date.now());
			if (!isLive) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error(
						`Sending partner chain ${txParams.sendingChainID.readInt32BE(0)} is not live.`,
					),
				};
			}
		}

		// Section: Liveness Requirement for the First CCU
		const livenessRequirementFirstCCU = checkLivenessRequirementFirstCCU(
			partnerChainAccount,
			txParams,
		);
		if (livenessRequirementFirstCCU.error) {
			return livenessRequirementFirstCCU;
		}
		// Section: Certificate and Validators Update Validity
		const certificateValidity = checkCertificateValidity(partnerChainAccount, txParams.certificate);

		if (certificateValidity.error) {
			return certificateValidity;
		}

		const partnerValidatorStore = this.stores.get(ChainValidatorsStore);
		const partnerValidators = await partnerValidatorStore.get(context, txParams.sendingChainID);
		// If params contains a non-empty activeValidatorsUpdate and non-empty certificate
		const validatorsHashValidity = checkValidatorsHashWithCertificate(txParams, partnerValidators);
		if (validatorsHashValidity.error) {
			return validatorsHashValidity;
		}

		// If params contains a non-empty activeValidatorsUpdate
		if (
			txParams.activeValidatorsUpdate.length > 0 ||
			partnerValidators.certificateThreshold !== txParams.newCertificateThreshold
		) {
			await this.internalMethod.verifyValidatorsUpdate(context.getMethodContext(), txParams);
		}

		// When certificate is non-empty
		await this.internalMethod.verifyCertificateSignature(context.getMethodContext(), txParams);

		const partnerChannelStore = this.stores.get(ChannelDataStore);
		const partnerChannelData = await partnerChannelStore.get(context, txParams.sendingChainID);
		// Section: InboxUpdate Validity
		const inboxUpdateValidity = checkInboxUpdateValidity(this.stores, txParams, partnerChannelData);
		if (inboxUpdateValidity.error) {
			return inboxUpdateValidity;
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
	): Promise<void> {
		const { header, params: txParams } = context;
		const chainIDBuffer = txParams.sendingChainID;
		const partnerChainStore = this.stores.get(ChainAccountStore);
		const partnerChainAccount = await partnerChainStore.get(context, chainIDBuffer);

		const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);

		// if the CCU also contains a non-empty inboxUpdate, check the validity of certificate with liveness check
		checkValidCertificateLiveness(txParams, header, decodedCertificate);

		const partnerValidatorStore = this.stores.get(ChainValidatorsStore);
		const partnerValidators = await partnerValidatorStore.get(context, chainIDBuffer);

		// Certificate timestamp Validity
		checkCertificateTimestamp(txParams, decodedCertificate, header);

		// CCM execution
		const terminateChainInternal = async () =>
			this.internalMethod.terminateChainInternal(context, txParams.sendingChainID);
		let decodedCCMs;
		try {
			decodedCCMs = txParams.inboxUpdate.crossChainMessages.map(ccm => ({
				serialized: ccm,
				deserialized: codec.decode<CCMsg>(ccmSchema, ccm),
			}));
		} catch (err) {
			await terminateChainInternal();

			throw err;
		}
		if (
			partnerChainAccount.status === ChainStatus.REGISTERED &&
			!isInboxUpdateEmpty(txParams.inboxUpdate)
		) {
			// If the first CCM in inboxUpdate is a registration CCM
			if (
				decodedCCMs[0].deserialized.crossChainCommand === CROSS_CHAIN_COMMAND_NAME_REGISTRATION &&
				decodedCCMs[0].deserialized.receivingChainID.equals(MAINCHAIN_ID_BUFFER)
			) {
				partnerChainAccount.status = ChainStatus.ACTIVE;
			} else {
				await terminateChainInternal();

				return; // Exit CCU processing
			}
		}

		for (const ccm of decodedCCMs) {
			if (!txParams.sendingChainID.equals(ccm.deserialized.sendingChainID)) {
				await terminateChainInternal();

				continue;
			}
			try {
				validateFormat(ccm.deserialized);
			} catch (error) {
				await terminateChainInternal();

				continue;
			}
			await this.internalMethod.appendToInboxTree(context, txParams.sendingChainID, ccm.serialized);
			const ccmContext = {
				...context,
				ccm: ccm.deserialized,
			};
			if (!ccm.deserialized.receivingChainID.equals(MAINCHAIN_ID_BUFFER)) {
				await this._forward(ccmContext);
			} else {
				await this.apply(ccmContext);
			}
		}
		// Common ccu execution logic
		await commonCCUExecutelogic({
			stores: this.stores,
			certificate: decodedCertificate,
			chainIDBuffer,
			context,
			partnerChainAccount,
			partnerChainStore,
			partnerValidatorStore,
			partnerValidators,
		});
	}

	private async _forward(context: CrossChainMessageContext): Promise<void> {
		const { ccm, logger } = context;
		const encodedCCM = codec.encode(ccmSchema, ccm);
		const ccmID = utils.hash(encodedCCM);

		const valid = await this.verifyCCM(context, ccmID);
		if (!valid) {
			return;
		}
		let receivingChainAccount: ChainAccount;
		try {
			receivingChainAccount = await this.stores
				.get(ChainAccountStore)
				.get(context, ccm.receivingChainID);
			if (receivingChainAccount.status === ChainStatus.REGISTERED) {
				await this.bounce(
					context,
					ccmID,
					encodedCCM.length,
					CCMStatusCode.CHANNEL_UNAVAILABLE,
					CCMProcessedCode.CHANNEL_UNAVAILABLE,
				);
				return;
			}
		} catch (error) {
			if (error instanceof NotFoundError) {
				await this.bounce(
					context,
					ccmID,
					encodedCCM.length,
					CCMStatusCode.CHANNEL_UNAVAILABLE,
					CCMProcessedCode.CHANNEL_UNAVAILABLE,
				);
				return;
			}
			throw error;
		}
		const isLive = await this.internalMethod.isLive(
			context,
			ccm.receivingChainID,
			context.header.timestamp,
		);
		if (!isLive) {
			await this.internalMethod.terminateChainInternal(context, ccm.receivingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.CHANNEL_UNAVAILABLE,
				result: CCMProcessedResult.DISCARDED,
			});
			await this.internalMethod.sendInternal(
				context,
				EMPTY_FEE_ADDRESS,
				MODULE_NAME_INTEROPERABILITY,
				CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
				ccm.sendingChainID,
				BigInt(0),
				CCMStatusCode.OK,
				codec.encode(sidechainTerminatedCCMParamsSchema, {
					chainID: ccm.receivingChainID,
					stateRoot: receivingChainAccount.lastCertificate.stateRoot,
				}),
			);
			return;
		}
		const stateSnapshotID = context.stateStore.createSnapshot();
		const eventSnapshotID = context.eventQueue.createSnapshot();

		try {
			for (const [module, method] of this.interoperableCCMethods.entries()) {
				if (method.beforeCrossChainMessageForwarding) {
					logger.debug(
						{
							moduleName: module,
							commandName: ccm.crossChainCommand,
							ccmID: ccmID.toString('hex'),
						},
						'Execute beforeCrossChainCommandExecute',
					);
					await method.beforeCrossChainMessageForwarding(context);
				}
			}
		} catch (error) {
			context.eventQueue.restoreSnapshot(eventSnapshotID);
			context.stateStore.restoreSnapshot(stateSnapshotID);
			logger.info(
				{ err: error as Error, moduleName: ccm.module, commandName: ccm.crossChainCommand },
				'Fail to execute beforeCrossChainCommandExecute.',
			);
			await this.internalMethod.terminateChainInternal(context, ccm.sendingChainID);
			this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION,
				result: CCMProcessedResult.DISCARDED,
			});
			return;
		}
		await this.internalMethod.addToOutbox(context, ccm.receivingChainID, ccm);
		this.events.get(CcmProcessedEvent).log(context, ccm.sendingChainID, ccm.receivingChainID, {
			ccmID,
			code: CCMProcessedCode.SUCCESS,
			result: CCMProcessedResult.FORWARDED,
		});
	}
}
