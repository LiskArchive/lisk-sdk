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
import { verifyWeightedAggSig } from '@liskhq/lisk-cryptography';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import {
	CCM_STATUS_OK,
	CHAIN_REGISTERED,
	COMMAND_ID_MAINCHAIN_REG,
	CROSS_CHAIN_COMMAND_ID_REGISTRATION,
	EMPTY_FEE_ADDRESS,
	EMPTY_HASH,
	MAINCHAIN_ID,
	MAINCHAIN_NAME,
	MAINCHAIN_NETWORK_ID,
	MODULE_ID_INTEROPERABILITY,
	NUMBER_MAINCHAIN_VALIDATORS,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHAIN_VALIDATORS,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
	STORE_PREFIX_OWN_CHAIN_DATA,
	TAG_CHAIN_REG_MESSAGE,
	THRESHOLD_MAINCHAIN,
} from '../../constants';
import {
	chainAccountSchema,
	channelSchema,
	mainchainRegParams,
	outboxRootSchema,
	ownChainAccountSchema,
	registrationCCMParamsSchema,
	registrationSignatureMessageSchema,
	validatorsSchema,
} from '../../schema';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { MainchainRegistrationParams, StoreCallback, ActiveValidators } from '../../types';
import {
	computeValidatorsHash,
	getIDAsKeyForStore,
	isValidName,
	sortValidatorsByBLSKey,
} from '../../utils';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { SidechainInteroperabilityStore } from '../store';

export class MainchainRegistrationCommand extends BaseInteroperabilityCommand {
	public id = COMMAND_ID_MAINCHAIN_REG;
	public name = 'mainchainRegistration';
	public schema = mainchainRegParams;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<MainchainRegistrationParams>,
	): Promise<VerificationResult> {
		const { ownName, mainchainValidators } = context.params;

		const registrationParamsErrors = validator.validate(mainchainRegParams, context.params);
		if (registrationParamsErrors.length > 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new LiskValidationError(registrationParamsErrors),
			};
		}

		if (!isValidName(ownName)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Sidechain name is in an unsupported format: ${ownName}`),
			};
		}

		for (let i = 0; i < NUMBER_MAINCHAIN_VALIDATORS; i += 1) {
			const currentValidator = mainchainValidators[i];

			if (
				mainchainValidators[i + 1] &&
				currentValidator.blsKey.compare(mainchainValidators[i + 1].blsKey) > -1
			) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validators blsKeys must be unique and lexicographically ordered'),
				};
			}

			if (currentValidator.bftWeight !== BigInt(1)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validator bft weight must be equal to 1'),
				};
			}
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<MainchainRegistrationParams>): Promise<void> {
		const {
			header,
			networkIdentifier,
			getStore,
			currentValidators: validators,
			certificateThreshold,
			params: { ownChainID, ownName, mainchainValidators, aggregationBits, signature },
		} = context;
		const mainchainIdAsKey = getIDAsKeyForStore(MAINCHAIN_ID);
		const activeValidators: ActiveValidators[] = validators.filter(v => v.bftWeight > BigInt(0));
		const keyList: Buffer[] = [];
		const weights: bigint[] = [];
		sortValidatorsByBLSKey(activeValidators);
		for (const v of activeValidators) {
			keyList.push(v.blsKey);
			weights.push(v.bftWeight);
		}
		const message = codec.encode(registrationSignatureMessageSchema, {
			ownChainID,
			ownName,
			mainchainValidators,
		});
		verifyWeightedAggSig(
			keyList,
			aggregationBits,
			signature,
			TAG_CHAIN_REG_MESSAGE,
			networkIdentifier,
			message,
			weights,
			certificateThreshold,
		);

		const chainSubstore = getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA);
		await chainSubstore.setWithSchema(
			mainchainIdAsKey,
			{
				name: MAINCHAIN_NAME,
				networkID: MAINCHAIN_NETWORK_ID,
				lastCertificate: {
					height: 0,
					timestamp: 0,
					stateRoot: EMPTY_HASH,
					validatorsHash: computeValidatorsHash(mainchainValidators, BigInt(THRESHOLD_MAINCHAIN)),
				},
				status: CHAIN_REGISTERED,
			},
			chainAccountSchema,
		);

		const channelSubstore = getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		await channelSubstore.setWithSchema(
			mainchainIdAsKey,
			{
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: { chainID: MAINCHAIN_ID, localID: 0 },
			},
			channelSchema,
		);

		const interoperabilityStore = this.getInteroperabilityStore(getStore);

		const encodedParams = codec.encode(registrationCCMParamsSchema, {
			networkID: MAINCHAIN_NETWORK_ID,
			name: MAINCHAIN_NAME,
			messageFeeTokenID: { chainID: MAINCHAIN_ID, localID: 0 },
		});
		const ccm = {
			nonce: BigInt(0),
			moduleID: MODULE_ID_INTEROPERABILITY,
			crossChainCommandID: CROSS_CHAIN_COMMAND_ID_REGISTRATION,
			sendingChainID: ownChainID,
			receivingChainID: MAINCHAIN_ID,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: encodedParams,
		};

		await interoperabilityStore.sendInternal({
			moduleID: MODULE_ID_INTEROPERABILITY,
			crossChainCommandID: CROSS_CHAIN_COMMAND_ID_REGISTRATION,
			receivingChainID: MAINCHAIN_ID,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: encodedParams,
			timestamp: header.timestamp,
			beforeSendContext: { ...context, ccm, feeAddress: EMPTY_FEE_ADDRESS },
		});

		const chainValidatorsSubstore = getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_CHAIN_VALIDATORS,
		);
		await chainValidatorsSubstore.setWithSchema(
			mainchainIdAsKey,
			{
				mainchainValidators: {
					activeValidators: mainchainValidators,
					certificateThreshold: BigInt(THRESHOLD_MAINCHAIN),
				},
			},
			validatorsSchema,
		);

		const outboxRootSubstore = getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OUTBOX_ROOT);
		await outboxRootSubstore.setWithSchema(
			mainchainIdAsKey,
			{ root: EMPTY_HASH },
			outboxRootSchema,
		);

		const ownChainAccountSubstore = getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_OWN_CHAIN_DATA,
		);
		await ownChainAccountSubstore.setWithSchema(
			getIDAsKeyForStore(0),
			{ name: ownName, id: ownChainID, nonce: BigInt(0) },
			ownChainAccountSchema,
		);
	}

	protected getInteroperabilityStore(getStore: StoreCallback): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
