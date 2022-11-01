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
import { validator } from '@liskhq/lisk-validator';
import { certificateSchema } from '../../../../engine/consensus/certificate_generation/schema';
import { Certificate } from '../../../../engine/consensus/certificate_generation/types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { ImmutableStoreGetter, StoreGetter } from '../../../base_store';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import {
	CHAIN_ACTIVE,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	MAINCHAIN_ID_BUFFER,
} from '../../constants';
import { ccmSchema, crossChainUpdateTransactionParams } from '../../schemas';
import { ChainAccountStore } from '../../stores/chain_account';
import { ChainValidatorsStore } from '../../stores/chain_validators';
import { ChannelDataStore } from '../../stores/channel_data';
import { CCMsg, CrossChainUpdateTransactionParams, TerminateChainContext } from '../../types';
import {
	checkActiveValidatorsUpdate,
	checkCertificateTimestamp,
	checkCertificateValidity,
	checkInboxUpdateValidity,
	checkLivenessRequirementFirstCCU,
	checkValidatorsHashWithCertificate,
	checkValidCertificateLiveness,
	commonCCUExecutelogic,
	getCCMSize,
	isInboxUpdateEmpty,
	validateFormat,
	verifyCertificateSignature,
} from '../../utils';
import { MainchainInteroperabilityInternalMethod } from '../store';

export class MainchainCCUpdateCommand extends BaseInteroperabilityCommand {
	public schema = crossChainUpdateTransactionParams;

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
		if (partnerChainAccount.status === CHAIN_TERMINATED) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Sending partner chain ${txParams.sendingChainID.readInt32BE(0)} is terminated.`,
				),
			};
		}
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);
		if (partnerChainAccount.status === CHAIN_ACTIVE) {
			const isChainLive = await interoperabilityInternalMethod.isLive(
				txParams.sendingChainID,
				Date.now(),
			);
			if (!isChainLive) {
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
		const activeValidatorsValidity = checkActiveValidatorsUpdate(txParams);
		if (activeValidatorsValidity.error) {
			return activeValidatorsValidity;
		}

		// When certificate is non-empty
		const verifyCertificateSignatureResult = verifyCertificateSignature(
			txParams,
			partnerValidators,
			txParams.sendingChainID,
		);
		if (verifyCertificateSignatureResult.error) {
			return verifyCertificateSignatureResult;
		}

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
		const terminateChainContext: TerminateChainContext = {
			eventQueue: context.eventQueue,
			getMethodContext: context.getMethodContext,
			getStore: context.getStore,
			logger: context.logger,
			chainID: context.chainID,
		};
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);
		const terminateChainInternal = async () =>
			interoperabilityInternalMethod.terminateChainInternal(
				txParams.sendingChainID,
				terminateChainContext,
			);
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
			partnerChainAccount.status === CHAIN_REGISTERED &&
			!isInboxUpdateEmpty(txParams.inboxUpdate)
		) {
			// If the first CCM in inboxUpdate is a registration CCM
			if (
				decodedCCMs[0].deserialized.crossChainCommand === CROSS_CHAIN_COMMAND_NAME_REGISTRATION &&
				decodedCCMs[0].deserialized.receivingChainID.equals(MAINCHAIN_ID_BUFFER)
			) {
				partnerChainAccount.status = CHAIN_ACTIVE;
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
			await interoperabilityInternalMethod.appendToInboxTree(
				txParams.sendingChainID,
				ccm.serialized,
			);
			if (!ccm.deserialized.receivingChainID.equals(MAINCHAIN_ID_BUFFER)) {
				await interoperabilityInternalMethod.forward({
					ccm: ccm.deserialized,
					ccu: txParams,
					eventQueue: context.eventQueue,
					feeAddress: context.transaction.senderAddress,
					getMethodContext: context.getMethodContext,
					getStore: context.getStore,
					logger: context.logger,
					chainID: context.chainID,
				});
			} else {
				await interoperabilityInternalMethod.apply(
					{
						ccm: ccm.deserialized,
						ccu: txParams,
						ccmSize: getCCMSize(ccm.deserialized),
						eventQueue: context.eventQueue,
						feeAddress: context.transaction.senderAddress,
						getMethodContext: context.getMethodContext,
						getStore: context.getStore,
						logger: context.logger,
						chainID: context.chainID,
						trsSender: context.transaction.senderAddress,
					},
					this.ccCommands,
				);
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

	protected getInteroperabilityInternalMethod(
		context: StoreGetter | ImmutableStoreGetter,
	): MainchainInteroperabilityInternalMethod {
		return new MainchainInteroperabilityInternalMethod(
			this.stores,
			this.events,
			context,
			this.interoperableCCMethods,
		);
	}
}
