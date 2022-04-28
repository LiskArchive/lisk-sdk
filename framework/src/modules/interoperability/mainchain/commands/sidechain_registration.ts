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
import { BIG_ENDIAN, hash, intToBuffer } from '@liskhq/lisk-cryptography';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { MainchainInteroperabilityStore } from '../store';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import {
	COMMAND_ID_SIDECHAIN_REG,
	CROSS_CHAIN_COMMAND_ID_REGISTRATION,
	EMPTY_HASH,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_REGISTERED_NETWORK_IDS,
	STORE_PREFIX_REGISTERED_NAMES,
	MAX_UINT32,
	MAX_UINT64,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_CHAIN_VALIDATORS,
	STORE_PREFIX_OUTBOX_ROOT,
	MAINCHAIN_ID,
	CCM_STATUS_OK,
	EMPTY_FEE_ADDRESS,
} from '../../constants';
import {
	chainAccountSchema,
	chainIDSchema,
	channelSchema,
	outboxRootSchema,
	registrationCCMParamsSchema,
	sidechainRegParams,
	validatorsSchema,
} from '../../schema';
import { SidechainRegistrationParams, StoreCallback } from '../../types';
import { computeValidatorsHash, isValidName } from '../../utils';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../../node/state_machine/types';

export class SidechainRegistrationCommand extends BaseInteroperabilityCommand {
	public id = COMMAND_ID_SIDECHAIN_REG;
	public name = 'sidechainRegistration';
	public schema = sidechainRegParams;

	public async verify(
		context: CommandVerifyContext<SidechainRegistrationParams>,
	): Promise<VerificationResult> {
		const {
			transaction,
			params: { certificateThreshold, initValidators, genesisBlockID, name },
		} = context;
		const errors = validator.validate(sidechainRegParams, context.params);

		if (errors.length > 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new LiskValidationError(errors),
			};
		}

		// 	The sidechain name property has to contain only characters from the set [a-z0-9!@$&_.]
		if (!isValidName(name)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Sidechain name is in an unsupported format: ${name}`),
			};
		}

		// 	The sidechain name has to be unique with respect to the set of already registered sidechain names in the blockchain state
		const nameSubstore = context.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_REGISTERED_NAMES,
		);
		const nameExists = await nameSubstore.has(Buffer.from(name, 'utf8'));

		if (nameExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Name substore must not have an entry for the store key name'),
			};
		}

		const networkID = hash(Buffer.concat([genesisBlockID, transaction.senderAddress]));

		// 	networkId has to be unique with respect to the set of already registered sidechain network IDs in the blockchain state.
		const networkIDSubstore = context.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_REGISTERED_NETWORK_IDS,
		);
		const networkIDExists = await networkIDSubstore.has(networkID);

		if (networkIDExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Network ID substore must not have an entry for the store key networkID'),
			};
		}

		let totalBftWeight = BigInt(0);
		for (let i = 0; i < initValidators.length; i += 1) {
			const currentValidator = initValidators[i];

			// The blsKeys must be lexigraphically ordered and unique within the array.
			if (
				initValidators[i + 1] &&
				currentValidator.blsKey.compare(initValidators[i + 1].blsKey) > -1
			) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validators blsKeys must be unique and lexigraphically ordered'),
				};
			}

			if (currentValidator.bftWeight <= BigInt(0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validator bft weight must be greater than 0'),
				};
			}

			totalBftWeight += currentValidator.bftWeight;
		}

		if (totalBftWeight > MAX_UINT64) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Validator bft weight must not exceed ${MAX_UINT64}`),
			};
		}

		// Minimum certificateThreshold value: floor(1/3 * totalWeight) + 1
		// Note: BigInt truncates to floor
		if (certificateThreshold < totalBftWeight / BigInt(3) + BigInt(1)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Certificate threshold below minimum bft weight '),
			};
		}

		// Maximum certificateThreshold value: total bft weight
		if (certificateThreshold > totalBftWeight) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Certificate threshold above maximum bft weight'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<SidechainRegistrationParams>): Promise<void> {
		const {
			transaction,
			params: { certificateThreshold, initValidators, genesisBlockID, name },
			getStore,
		} = context;

		const networkID = hash(Buffer.concat([genesisBlockID, transaction.senderAddress]));

		// Add an entry in the chain substore
		const chainSubstore = getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA);

		// Find the latest chainID from db
		const start = intToBuffer(0, 4, BIG_ENDIAN);
		const end = intToBuffer(MAX_UINT32, 4, BIG_ENDIAN);
		const chainIDs = await chainSubstore.iterate({ start, end, limit: 1, reverse: true });
		if (!chainIDs.length) {
			throw new Error('No existing entries found in chain store');
		}
		const chainID = chainIDs[0].key.readUInt32BE(0) + 1;
		const chainIDBuffer = intToBuffer(chainID, 4, BIG_ENDIAN);

		await chainSubstore.setWithSchema(
			chainIDBuffer,
			{
				name,
				networkID,
				lastCertificate: {
					height: 0,
					timestamp: 0,
					stateRoot: EMPTY_HASH,
					validatorsHash: computeValidatorsHash(initValidators, certificateThreshold),
				},
				status: 0,
			},
			chainAccountSchema,
		);

		// Add an entry in the channel substore
		const channelSubstore = getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		await channelSubstore.setWithSchema(
			chainIDBuffer,
			{
				inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
				partnerChainOutboxRoot: EMPTY_HASH,
				messageFeeTokenID: { chainID: 1, localID: 0 },
			},
			channelSchema,
		);

		// sendInternal registration CCM
		const interoperabilityStore = this.getInteroperabilityStore(getStore);

		const encodedParams = codec.encode(registrationCCMParamsSchema, {
			networkID,
			name,
			messageFeeTokenID: { chainID: MAINCHAIN_ID, localID: 0 },
		});
		const ccm = {
			nonce: BigInt(0),
			moduleID: MODULE_ID_INTEROPERABILITY,
			crossChainCommandID: CROSS_CHAIN_COMMAND_ID_REGISTRATION,
			sendingChainID: MAINCHAIN_ID,
			receivingChainID: chainID,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: encodedParams,
		};

		await interoperabilityStore.sendInternal({
			moduleID: MODULE_ID_INTEROPERABILITY,
			crossChainCommandID: CROSS_CHAIN_COMMAND_ID_REGISTRATION,
			receivingChainID: chainID,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: encodedParams,
			timestamp: Date.now(),
			beforeSendContext: { ...context, ccm, feeAddress: EMPTY_FEE_ADDRESS },
		});

		// Add an entry in the chain validators substore
		const chainValidatorsSubstore = getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_CHAIN_VALIDATORS,
		);
		await chainValidatorsSubstore.setWithSchema(
			chainIDBuffer,
			{ sidechainValidators: { activeValidators: initValidators, certificateThreshold } },
			validatorsSchema,
		);

		// Add an entry in the outbox root substore
		const outboxRootSubstore = getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OUTBOX_ROOT);
		await outboxRootSubstore.setWithSchema(chainIDBuffer, { root: EMPTY_HASH }, outboxRootSchema);

		// Add an entry in the registered names substore
		const registeredNamesSubstore = getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_REGISTERED_NAMES,
		);
		await registeredNamesSubstore.setWithSchema(
			Buffer.from(name, 'utf-8'),
			chainIDBuffer,
			// Note: Same as chainID schema
			chainIDSchema,
		);

		// Add an entry in the registered network IDs substore
		const registeredNetworkIDsSubstore = getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_REGISTERED_NETWORK_IDS,
		);
		await registeredNetworkIDsSubstore.setWithSchema(
			networkID,
			chainIDBuffer,
			// Note: Same as chainID schema
			chainIDSchema,
		);
	}

	protected getInteroperabilityStore(getStore: StoreCallback): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
