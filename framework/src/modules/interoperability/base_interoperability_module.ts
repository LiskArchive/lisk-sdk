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
import { dataStructures } from '@liskhq/lisk-utils';
import { MAX_UINT64, validator } from '@liskhq/lisk-validator';
import { GenesisBlockExecuteContext } from '../../state_machine';
import { splitTokenID } from '../token/utils';
import { BaseCCCommand } from './base_cc_command';
import { BaseCCMethod } from './base_cc_method';
import { BaseInteroperableModule } from './base_interoperable_module';
import { EMPTY_HASH, MODULE_NAME_INTEROPERABILITY } from './constants';
import { genesisInteroperabilitySchema } from './schemas';
import { ChainAccountStore, ChainStatus } from './stores/chain_account';
import { ChainValidatorsStore } from './stores/chain_validators';
import { ChannelDataStore } from './stores/channel_data';
import { OutboxRootStore } from './stores/outbox_root';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { RegisteredNamesStore } from './stores/registered_names';
import { TerminatedOutboxStore } from './stores/terminated_outbox';
import { TerminatedStateStore } from './stores/terminated_state';
import { GenesisInteroperability } from './types';
import { getMainchainID, getMainchainTokenID } from './utils';

export abstract class BaseInteroperabilityModule extends BaseInteroperableModule {
	protected interoperableCCCommands = new Map<string, BaseCCCommand[]>();
	protected interoperableCCMethods = new Map<string, BaseCCMethod>();

	public constructor() {
		super();
		this.stores.register(OutboxRootStore, new OutboxRootStore(this.name, 0));
		this.stores.register(ChainAccountStore, new ChainAccountStore(this.name, 1));
		this.stores.register(OwnChainAccountStore, new OwnChainAccountStore(this.name, 13));
		this.stores.register(ChannelDataStore, new ChannelDataStore(this.name, 5));
		this.stores.register(ChainValidatorsStore, new ChainValidatorsStore(this.name, 9));
		this.stores.register(TerminatedStateStore, new TerminatedStateStore(this.name, 3));
		this.stores.register(TerminatedOutboxStore, new TerminatedOutboxStore(this.name, 11));
		this.stores.register(RegisteredNamesStore, new RegisteredNamesStore(this.name, 7));
	}

	// Common name for mainchain/sidechain interoperability module
	public get name(): string {
		return MODULE_NAME_INTEROPERABILITY;
	}

	public registerInteroperableModule(module: BaseInteroperableModule): void {
		this.interoperableCCMethods.set(module.name, module.crossChainMethod);
		this.interoperableCCCommands.set(module.name, module.crossChainCommand);
	}

	public async initGenesisState(ctx: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = ctx.assets.getAsset(MODULE_NAME_INTEROPERABILITY);
		if (!assetBytes) {
			return;
		}
		const mainchainID = getMainchainID(ctx.chainID);
		const mainchainTokenID = getMainchainTokenID(ctx.chainID);

		const genesisStore = codec.decode<GenesisInteroperability>(
			genesisInteroperabilitySchema,
			assetBytes,
		);
		validator.validate<GenesisInteroperability>(genesisInteroperabilitySchema, genesisStore);

		const outboxRootStoreKeySet = new dataStructures.BufferSet();
		const outboxRootStore = this.stores.get(OutboxRootStore);
		for (const outboxRootData of genesisStore.outboxRootSubstore) {
			if (outboxRootStoreKeySet.has(outboxRootData.storeKey)) {
				throw new Error(
					`Outbox root store key ${outboxRootData.storeKey.toString('hex')} is duplicated.`,
				);
			}
			outboxRootStoreKeySet.add(outboxRootData.storeKey);
			await outboxRootStore.set(ctx, outboxRootData.storeKey, outboxRootData.storeValue);
		}

		const channelDataStoreKeySet = new dataStructures.BufferSet();
		const channelDataStore = this.stores.get(ChannelDataStore);
		for (const channelData of genesisStore.channelDataSubstore) {
			if (channelDataStoreKeySet.has(channelData.storeKey)) {
				throw new Error(
					`Channel data store key ${channelData.storeKey.toString('hex')} is duplicated.`,
				);
			}
			channelDataStoreKeySet.add(channelData.storeKey);

			const channel = channelData.storeValue;
			const [chainID] = splitTokenID(channel.messageFeeTokenID);

			if (
				!channel.messageFeeTokenID.equals(mainchainTokenID) && // corresponding to the LSK token
				!chainID.equals(channelData.storeKey) && // Token.getChainID(channel.messageFeeTokenID) must be equal to channelData.storeKey
				!chainID.equals(ctx.chainID) // the message fee token must be a native token of either chains
			) {
				throw new Error(
					`messageFeeTokenID corresponding to the channel data store key ${channelData.storeKey.toString(
						'hex',
					)} is not valid.`,
				);
			}

			await channelDataStore.set(ctx, channelData.storeKey, channelData.storeValue);
		}

		const chainValidatorsStoreKeySet = new dataStructures.BufferSet();
		const chainValidatorsStore = this.stores.get(ChainValidatorsStore);
		for (const chainValidators of genesisStore.chainValidatorsSubstore) {
			if (chainValidatorsStoreKeySet.has(chainValidators.storeKey)) {
				throw new Error(
					`Chain validators store key ${chainValidators.storeKey.toString('hex')} is duplicated.`,
				);
			}
			chainValidatorsStoreKeySet.add(chainValidators.storeKey);

			const { activeValidators, certificateThreshold } = chainValidators.storeValue;

			let totalWeight = BigInt(0);
			for (let j = 0; j < activeValidators.length; j += 1) {
				const activeValidator = activeValidators[j];

				const { blsKey } = activeValidator;
				if (
					j < activeValidators.length - 1 &&
					blsKey.compare(activeValidators[j + 1].blsKey) >= 0
				) {
					throw new Error(
						'Active validators must be ordered lexicographically by blsKey property and pairwise distinct.',
					);
				}
				const { bftWeight } = activeValidator;
				if (bftWeight <= BigInt(0)) {
					throw new Error('BFTWeight must be a positive integer.');
				}
				totalWeight += bftWeight;
			}

			if (totalWeight > MAX_UINT64) {
				throw new Error(
					'The total BFT weight of all active validators has to be less than or equal to MAX_UINT64.',
				);
			}

			const checkBftWeightValue = totalWeight / BigInt(3) + BigInt(1);
			if (certificateThreshold > totalWeight || checkBftWeightValue > certificateThreshold) {
				throw new Error('The total BFT weight of all active validators is not valid.');
			}

			await chainValidatorsStore.set(ctx, chainValidators.storeKey, chainValidators.storeValue);
		}

		const chainDataStoreKeySet = new dataStructures.BufferSet();
		const chainDataStore = this.stores.get(ChainAccountStore);
		let hasSidechainAccount = false;
		for (const chainData of genesisStore.chainDataSubstore) {
			const chainDataStoreKey = chainData.storeKey;
			if (chainDataStoreKeySet.has(chainDataStoreKey)) {
				throw new Error(`Chain data store key ${chainDataStoreKey.toString('hex')} is duplicated.`);
			}
			chainDataStoreKeySet.add(chainDataStoreKey);

			const chainAccountStatus = chainData.storeValue.status;
			if (chainAccountStatus === ChainStatus.TERMINATED) {
				if (outboxRootStoreKeySet.has(chainDataStoreKey)) {
					throw new Error('Outbox root store cannot have entry for a terminated chain account.');
				}
				if (
					!channelDataStoreKeySet.has(chainDataStoreKey) ||
					!chainValidatorsStoreKeySet.has(chainDataStoreKey)
				) {
					throw new Error(
						`Chain data store key ${chainDataStoreKey.toString(
							'hex',
						)} missing in some or all of channel data and chain validators stores.`,
					);
				}
			} else if (
				!outboxRootStoreKeySet.has(chainDataStoreKey) ||
				!channelDataStoreKeySet.has(chainDataStoreKey) ||
				!chainValidatorsStoreKeySet.has(chainDataStoreKey)
			) {
				throw new Error(
					`Chain data store key ${chainDataStoreKey.toString(
						'hex',
					)} missing in some or all of outbox root, channel data and chain validators stores.`,
				);
			}

			if (!(chainDataStoreKey.equals(ctx.chainID) || chainDataStoreKey.equals(mainchainID))) {
				hasSidechainAccount = true;
			}

			await chainDataStore.set(ctx, chainData.storeKey, chainData.storeValue);
		}

		if (
			hasSidechainAccount &&
			!(chainDataStoreKeySet.has(mainchainID) && chainDataStoreKeySet.has(ctx.chainID))
		) {
			throw new Error(
				'If a chain account for another sidechain is present, then a chain account for the mainchain must be present, as well as the own chain account.',
			);
		}

		for (const storeKey of outboxRootStoreKeySet) {
			if (!chainDataStoreKeySet.has(storeKey)) {
				throw new Error(
					`Outbox root store key ${storeKey.toString('hex')} is missing in chain data store.`,
				);
			}
		}

		for (const storeKey of channelDataStoreKeySet) {
			if (!chainDataStoreKeySet.has(storeKey)) {
				throw new Error(
					`Channel data store key ${storeKey.toString('hex')} is missing in chain data store.`,
				);
			}
		}

		for (const storeKey of chainValidatorsStoreKeySet) {
			if (!chainDataStoreKeySet.has(storeKey)) {
				throw new Error(
					`Chain validators store key ${storeKey.toString('hex')} is missing in chain data store.`,
				);
			}
		}

		const ownChainAccountStore = this.stores.get(OwnChainAccountStore);
		const ownChainDataStoreKeySet = new dataStructures.BufferSet();
		for (const ownChainData of genesisStore.ownChainDataSubstore) {
			if (ownChainDataStoreKeySet.has(ownChainData.storeKey)) {
				throw new Error(
					`Own chain data store key ${ownChainData.storeKey.toString('hex')} is duplicated.`,
				);
			}
			ownChainDataStoreKeySet.add(ownChainData.storeKey);

			await ownChainAccountStore.set(ctx, ownChainData.storeKey, ownChainData.storeValue);
		}

		const terminatedOutboxStoreKeySet = new dataStructures.BufferSet();
		const terminatedOutboxStore = this.stores.get(TerminatedOutboxStore);
		for (const terminatedOutbox of genesisStore.terminatedOutboxSubstore) {
			if (terminatedOutboxStoreKeySet.has(terminatedOutbox.storeKey)) {
				throw new Error(
					`Terminated outbox store key ${terminatedOutbox.storeKey.toString('hex')} is duplicated.`,
				);
			}
			terminatedOutboxStoreKeySet.add(terminatedOutbox.storeKey);

			await terminatedOutboxStore.set(ctx, terminatedOutbox.storeKey, terminatedOutbox.storeValue);
		}

		const terminatedStateStoreKeySet = new dataStructures.BufferSet();
		const terminatedStateStore = this.stores.get(TerminatedStateStore);
		for (const terminatedState of genesisStore.terminatedStateSubstore) {
			const terminatedStateStoreKey = terminatedState.storeKey;
			if (terminatedStateStoreKeySet.has(terminatedStateStoreKey)) {
				throw new Error(
					`Terminated state store key ${terminatedStateStoreKey.toString('hex')} is duplicated.`,
				);
			}
			terminatedStateStoreKeySet.add(terminatedStateStoreKey);

			const terminatedStateStoreValue = terminatedState.storeValue;
			if (!terminatedStateStoreValue.initialized) {
				if (terminatedOutboxStoreKeySet.has(terminatedStateStoreKey)) {
					throw new Error(
						`Uninitialized account associated with terminated state store key ${terminatedStateStoreKey.toString(
							'hex',
						)} cannot be present in terminated outbox store.`,
					);
				}
				if (
					!terminatedStateStoreValue.stateRoot.equals(EMPTY_HASH) ||
					terminatedStateStoreValue.mainchainStateRoot.equals(EMPTY_HASH)
				) {
					throw new Error(
						`For the uninitialized account associated with terminated state store key ${terminatedStateStoreKey.toString(
							'hex',
						)} the stateRoot must be set to empty hash and mainchainStateRoot to a 32-bytes value.`,
					);
				}
			} else if (
				terminatedStateStoreValue.stateRoot.equals(EMPTY_HASH) ||
				!terminatedStateStoreValue.mainchainStateRoot.equals(EMPTY_HASH)
			) {
				throw new Error(
					`For the initialized account associated with terminated state store key ${terminatedStateStoreKey.toString(
						'hex',
					)} the mainchainStateRoot must be set empty value and stateRoot to a 32-bytes value.`,
				);
			}

			await terminatedStateStore.set(ctx, terminatedState.storeKey, terminatedState.storeValue);
		}

		for (const storeKey of terminatedOutboxStoreKeySet) {
			if (!terminatedStateStoreKeySet.has(storeKey)) {
				throw new Error(
					`Terminated outbox store key ${storeKey.toString(
						'hex',
					)} missing in terminated state store.`,
				);
			}
		}

		const registeredNamesStoreKeySet = new dataStructures.BufferSet();
		const registeredNamesStore = this.stores.get(RegisteredNamesStore);
		for (const registeredNames of genesisStore.registeredNamesSubstore) {
			if (registeredNamesStoreKeySet.has(registeredNames.storeKey)) {
				throw new Error(
					`Registered names store key ${registeredNames.storeKey.toString('hex')} is duplicated.`,
				);
			}
			registeredNamesStoreKeySet.add(registeredNames.storeKey);

			await registeredNamesStore.set(ctx, registeredNames.storeKey, registeredNames.storeValue);
		}
	}
}
