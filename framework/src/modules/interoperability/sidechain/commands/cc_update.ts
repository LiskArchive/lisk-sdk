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
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import {
	CHAIN_ACTIVE,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	COMMAND_ID_SIDECHAIN_CCU_BUFFER,
	CROSS_CHAIN_COMMAND_ID_REGISTRATION_BUFFER,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHAIN_VALIDATORS,
	STORE_PREFIX_CHANNEL_DATA,
} from '../../constants';
import {
	ccmSchema,
	chainAccountSchema,
	chainValidatorsSchema,
	channelSchema,
	crossChainUpdateTransactionParams,
} from '../../schemas';
import {
	CCMsg,
	ChainAccount,
	ChainValidators,
	ChannelData,
	CrossChainUpdateTransactionParams,
	ImmutableStoreCallback,
	StoreCallback,
} from '../../types';
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
import { SidechainInteroperabilityStore } from '../store';

export class SidechainCCUpdateCommand extends BaseInteroperabilityCommand {
	public name = 'sidechainCCUpdate';
	public id = COMMAND_ID_SIDECHAIN_CCU_BUFFER;
	public schema = crossChainUpdateTransactionParams;

	public async verify(
		context: CommandVerifyContext<CrossChainUpdateTransactionParams>,
	): Promise<VerificationResult> {
		const { params: txParams, transaction, getStore } = context;

		try {
			validator.validate(crossChainUpdateTransactionParams, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const partnerChainIDBuffer = txParams.sendingChainID;
		const partnerChainStore = getStore(transaction.moduleID, STORE_PREFIX_CHAIN_DATA);
		const partnerChainAccount = await partnerChainStore.getWithSchema<ChainAccount>(
			partnerChainIDBuffer,
			chainAccountSchema,
		);
		// Section: Liveness of Partner Chain
		if (partnerChainAccount.status === CHAIN_TERMINATED) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`Sending partner chain ${txParams.sendingChainID.readInt32BE(0)} is terminated.`,
				),
			};
		}
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);
		if (partnerChainAccount.status === CHAIN_ACTIVE) {
			const isChainLive = await interoperabilityStore.isLive(partnerChainIDBuffer);
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

		const partnerValidatorStore = context.getStore(this.moduleID, STORE_PREFIX_CHAIN_VALIDATORS);
		const partnerValidators = await partnerValidatorStore.getWithSchema<ChainValidators>(
			partnerChainIDBuffer,
			chainValidatorsSchema,
		);
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
			partnerChainAccount,
		);
		if (verifyCertificateSignatureResult.error) {
			return verifyCertificateSignatureResult;
		}

		const partnerChannelStore = context.getStore(transaction.moduleID, STORE_PREFIX_CHANNEL_DATA);
		const partnerChannelData = await partnerChannelStore.getWithSchema<ChannelData>(
			partnerChainIDBuffer,
			channelSchema,
		);
		// Section: InboxUpdate Validity
		const inboxUpdateValidity = checkInboxUpdateValidity(txParams, partnerChannelData);
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
		const partnerChainStore = context.getStore(this.moduleID, STORE_PREFIX_CHAIN_DATA);
		const partnerChainAccount = await partnerChainStore.getWithSchema<ChainAccount>(
			chainIDBuffer,
			chainAccountSchema,
		);

		const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);

		// if the CCU also contains a non-empty inboxUpdate, check the validity of certificate with liveness check
		checkValidCertificateLiveness(txParams, header, decodedCertificate);

		const partnerValidatorStore = context.getStore(this.moduleID, STORE_PREFIX_CHAIN_VALIDATORS);
		const partnerValidators = await partnerValidatorStore.getWithSchema<ChainValidators>(
			chainIDBuffer,
			chainValidatorsSchema,
		);

		// Certificate timestamp Validity
		checkCertificateTimestamp(txParams, decodedCertificate, header);

		// CCM execution
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);
		let decodedCCMs;
		try {
			decodedCCMs = txParams.inboxUpdate.crossChainMessages.map(ccm => ({
				serialized: ccm,
				deserialized: codec.decode<CCMsg>(ccmSchema, ccm),
			}));
		} catch (err) {
			await interoperabilityStore.terminateChainInternal(txParams.sendingChainID, {
				eventQueue: context.eventQueue,
				getAPIContext: context.getAPIContext,
				getStore: context.getStore,
				logger: context.logger,
				networkIdentifier: context.networkIdentifier,
			});

			throw err;
		}
		if (
			partnerChainAccount.status === CHAIN_REGISTERED &&
			!isInboxUpdateEmpty(txParams.inboxUpdate)
		) {
			// If the first CCM in inboxUpdate is a registration CCM
			if (
				decodedCCMs[0].deserialized.crossChainCommandID.equals(
					CROSS_CHAIN_COMMAND_ID_REGISTRATION_BUFFER,
				) &&
				decodedCCMs[0].deserialized.sendingChainID.equals(txParams.sendingChainID)
			) {
				partnerChainAccount.status = CHAIN_ACTIVE;
			} else {
				await interoperabilityStore.terminateChainInternal(txParams.sendingChainID, {
					eventQueue: context.eventQueue,
					getAPIContext: context.getAPIContext,
					getStore: context.getStore,
					logger: context.logger,
					networkIdentifier: context.networkIdentifier,
				});

				return; // Exit CCU processing
			}
		}

		for (const ccm of decodedCCMs) {
			if (!txParams.sendingChainID.equals(ccm.deserialized.sendingChainID)) {
				await interoperabilityStore.terminateChainInternal(txParams.sendingChainID, {
					eventQueue: context.eventQueue,
					getAPIContext: context.getAPIContext,
					getStore: context.getStore,
					logger: context.logger,
					networkIdentifier: context.networkIdentifier,
				});

				continue;
			}
			try {
				validateFormat(ccm.deserialized);
			} catch (error) {
				await interoperabilityStore.terminateChainInternal(txParams.sendingChainID, {
					eventQueue: context.eventQueue,
					getAPIContext: context.getAPIContext,
					getStore: context.getStore,
					logger: context.logger,
					networkIdentifier: context.networkIdentifier,
				});

				continue;
			}
			await interoperabilityStore.appendToInboxTree(txParams.sendingChainID, ccm.serialized);

			await interoperabilityStore.apply(
				{
					ccm: ccm.deserialized,
					ccu: txParams,
					ccmSize: getCCMSize(ccm.deserialized),
					eventQueue: context.eventQueue,
					feeAddress: context.transaction.senderAddress,
					getAPIContext: context.getAPIContext,
					getStore: context.getStore,
					logger: context.logger,
					networkIdentifier: context.networkIdentifier,
					trsSender: context.transaction.senderAddress,
				},
				this.ccCommands,
			);
		}
		// Common ccm execution logic
		await commonCCUExecutelogic({
			certificate: decodedCertificate,
			chainIDBuffer,
			context,
			partnerChainAccount,
			partnerChainStore,
			partnerValidatorStore,
			partnerValidators,
		});
	}

	protected getInteroperabilityStore(
		getStore: StoreCallback | ImmutableStoreCallback,
	): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
