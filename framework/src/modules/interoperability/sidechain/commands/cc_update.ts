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
import { BaseCrossChainUpdateCommand } from '../../base_cross_chain_update_command';
import { CROSS_CHAIN_COMMAND_NAME_REGISTRATION } from '../../constants';
import { ccmSchema, crossChainUpdateTransactionParams } from '../../schemas';
import { ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import { ChainValidatorsStore } from '../../stores/chain_validators';
import { ChannelDataStore } from '../../stores/channel_data';
import { CCMsg, CrossChainUpdateTransactionParams } from '../../types';
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
import { SidechainInteroperabilityInternalMethod } from '../internal_method';

export class SidechainCCUpdateCommand extends BaseCrossChainUpdateCommand<SidechainInteroperabilityInternalMethod> {
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

		const partnerChainIDBuffer = txParams.sendingChainID;
		const partnerChainStore = this.stores.get(ChainAccountStore);
		const partnerChainAccount = await partnerChainStore.get(context, partnerChainIDBuffer);
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
			const isLive = await this.internalMethod.isLive(context, partnerChainIDBuffer);
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
		const partnerValidators = await partnerValidatorStore.get(context, partnerChainIDBuffer);
		// If params contains a non-empty activeValidatorsUpdate and non-empty certificate
		const validatorsHashValidity = checkValidatorsHashWithCertificate(txParams, partnerValidators);
		if (validatorsHashValidity.error) {
			return validatorsHashValidity;
		}

		// If params contains a non-empty activeValidatorsUpdate
		if (
			txParams.activeValidatorsUpdate.length > 0 ||
			partnerValidators.certificateThreshold !== txParams.certificateThreshold
		) {
			await this.internalMethod.verifyValidatorsUpdate(context.getMethodContext(), txParams);
		}

		// When certificate is non-empty
		await this.internalMethod.verifyCertificateSignature(context.getMethodContext(), txParams);

		const partnerChannelStore = this.stores.get(ChannelDataStore);
		const partnerChannelData = await partnerChannelStore.get(context, partnerChainIDBuffer);
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
				decodedCCMs[0].deserialized.sendingChainID.equals(txParams.sendingChainID)
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

			await this.apply({
				ccm: ccm.deserialized,
				transaction: context.transaction,
				eventQueue: context.eventQueue,
				getMethodContext: context.getMethodContext,
				getStore: context.getStore,
				logger: context.logger,
				chainID: context.chainID,
				header: context.header,
				stateStore: context.stateStore,
			});
		}
		// Common ccm execution logic
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
}
