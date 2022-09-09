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
import { MainchainInteroperabilityStore } from '../store';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import {
	CHAIN_REGISTERED,
	EMPTY_HASH,
	MAX_UINT32,
	MAX_UINT64,
	CCM_STATUS_OK,
	EMPTY_FEE_ADDRESS,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
} from '../../constants';
import { registrationCCMParamsSchema, sidechainRegParams } from '../../schemas';
import { SidechainRegistrationParams } from '../../types';
import { computeValidatorsHash, isValidName } from '../../utils';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../../state_machine';
import { RegisteredNetworkStore } from '../../stores/registered_network_ids';
import { ChainAccountStore } from '../../stores/chain_account';
import { ChannelDataStore } from '../../stores/channel_data';
import { ChainValidatorsStore } from '../../stores/chain_validators';
import { OutboxRootStore } from '../../stores/outbox_root';
import { RegisteredNamesStore } from '../../stores/registered_names';
import { ImmutableStoreGetter, StoreGetter } from '../../../base_store';

export class SidechainRegistrationCommand extends BaseInteroperabilityCommand {
	public schema = sidechainRegParams;

	public async verify(
		context: CommandVerifyContext<SidechainRegistrationParams>,
	): Promise<VerificationResult> {
		const {
			transaction,
			params: { certificateThreshold, initValidators, genesisBlockID, name },
		} = context;

		try {
			validator.validate(sidechainRegParams, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
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
		const nameSubstore = this.stores.get(RegisteredNamesStore);
		const nameExists = await nameSubstore.has(context, Buffer.from(name, 'utf8'));

		if (nameExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Name substore must not have an entry for the store key name'),
			};
		}

		const networkID = utils.hash(Buffer.concat([genesisBlockID, transaction.senderAddress]));

		// 	networkId has to be unique with respect to the set of already registered sidechain network IDs in the blockchain state.
		const networkIDSubstore = this.stores.get(RegisteredNetworkStore);
		const networkIDExists = await networkIDSubstore.has(context, networkID);

		if (networkIDExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Network ID substore must not have an entry for the store key networkID'),
			};
		}

		let totalBftWeight = BigInt(0);
		for (let i = 0; i < initValidators.length; i += 1) {
			const currentValidator = initValidators[i];

			// The blsKeys must be lexicographically ordered and unique within the array.
			if (
				initValidators[i + 1] &&
				currentValidator.blsKey.compare(initValidators[i + 1].blsKey) > -1
			) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validators blsKeys must be unique and lexicographically ordered'),
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
			header,
			transaction,
			params: { certificateThreshold, initValidators, genesisBlockID, name },
		} = context;

		const networkID = utils.hash(Buffer.concat([genesisBlockID, transaction.senderAddress]));

		// Add an entry in the chain substore
		const chainSubstore = this.stores.get(ChainAccountStore);

		// Find the latest chainID from db
		const gte = utils.intToBuffer(0, 4);
		const lte = utils.intToBuffer(MAX_UINT32, 4);
		const chainIDs = await chainSubstore.iterate(context, { gte, lte, limit: 1, reverse: true });
		if (!chainIDs.length) {
			throw new Error('No existing entries found in chain store');
		}
		const chainID = chainIDs[0].key.readUInt32BE(0) + 1;
		const chainIDBuffer = utils.intToBuffer(chainID, 4);

		await chainSubstore.set(context, chainIDBuffer, {
			name,
			networkID,
			lastCertificate: {
				height: 0,
				timestamp: 0,
				stateRoot: EMPTY_HASH,
				validatorsHash: computeValidatorsHash(initValidators, certificateThreshold),
			},
			status: CHAIN_REGISTERED,
		});

		// Add an entry in the channel substore
		const channelSubstore = this.stores.get(ChannelDataStore);
		await channelSubstore.set(context, chainIDBuffer, {
			inbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
			outbox: { root: EMPTY_HASH, appendPath: [], size: 0 },
			partnerChainOutboxRoot: EMPTY_HASH,
			messageFeeTokenID: { chainID: utils.intToBuffer(1, 4), localID: utils.intToBuffer(0, 4) },
		});

		// sendInternal registration CCM
		const interoperabilityStore = this.getInteroperabilityStore(context);

		const encodedParams = codec.encode(registrationCCMParamsSchema, {
			networkID,
			name,
			messageFeeTokenID: { chainID: MAINCHAIN_ID_BUFFER, localID: utils.intToBuffer(0, 4) },
		});

		await interoperabilityStore.sendInternal({
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			receivingChainID: chainIDBuffer,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: encodedParams,
			timestamp: header.timestamp,
			eventQueue: context.eventQueue,
			feeAddress: EMPTY_FEE_ADDRESS,
			getMethodContext: context.getMethodContext,
			getStore: context.getStore,
			logger: context.logger,
			chainID: context.chainID,
		});

		// Add an entry in the chain validators substore
		const chainValidatorsSubstore = this.stores.get(ChainValidatorsStore);
		await chainValidatorsSubstore.set(context, chainIDBuffer, {
			activeValidators: initValidators,
			certificateThreshold,
		});

		// Add an entry in the outbox root substore
		const outboxRootSubstore = this.stores.get(OutboxRootStore);
		await outboxRootSubstore.set(context, chainIDBuffer, { root: EMPTY_HASH });

		// Add an entry in the registered names substore
		const registeredNamesSubstore = this.stores.get(RegisteredNamesStore);
		await registeredNamesSubstore.set(
			context,
			Buffer.from(name, 'utf-8'),
			{ id: chainIDBuffer },
			// Note: Uses chainIDSchema
		);

		// Add an entry in the registered network IDs substore
		const registeredNetworkIDsSubstore = this.stores.get(RegisteredNetworkStore);
		await registeredNetworkIDsSubstore.set(
			context,
			networkID,
			{ id: chainIDBuffer },
			// Note: Uses chainIDSchema
		);
	}

	protected getInteroperabilityStore(
		context: StoreGetter | ImmutableStoreGetter,
	): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.stores, context, this.interoperableCCMethods);
	}
}
