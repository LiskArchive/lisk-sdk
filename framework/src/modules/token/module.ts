/*
 * Copyright © 2020 Lisk Foundation
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
import { isUInt64, validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { objects, dataStructures } from '@liskhq/lisk-utils';
import { address } from '@liskhq/lisk-cryptography';
import {
	ADDRESS_LENGTH,
	CHAIN_ID_ALIAS_NATIVE,
	CHAIN_ID_LENGTH,
	defaultConfig,
	EMPTY_BYTES,
	LOCAL_ID_LENGTH,
	TOKEN_ID_LENGTH,
} from './constants';
import { TransferCommand } from './commands/transfer';
import { ModuleInitArgs, ModuleMetadata } from '../base_module';
import { GenesisBlockExecuteContext } from '../../state_machine';
import {
	configSchema,
	genesisTokenStoreSchema,
	getBalanceRequestSchema,
	getBalanceResponseSchema,
	getBalancesRequestSchema,
	getEscrowedAmountsResponseSchema,
	getSupportedTokensResponseSchema,
	getTotalSupplyResponseSchema,
} from './schemas';
import { TokenMethod } from './method';
import { TokenEndpoint } from './endpoint';
import { GenesisTokenStore, MinBalance, ModuleConfig } from './types';
import { splitTokenID } from './utils';
import { CCTransferCommand } from './commands/cc_transfer';
import { BaseInteroperableModule } from '../interoperability/base_interoperable_module';
import { TokenInteroperableMethod } from './cc_method';
import {
	MainchainInteroperabilityMethod,
	SidechainInteroperabilityMethod,
} from '../interoperability';
import { UserStore } from './stores/user';
import { EscrowStore } from './stores/escrow';
import { SupplyStore } from './stores/supply';
import { TerminatedEscrowStore } from './stores/terminated_escrow';
import { AvailableLocalIDStore } from './stores/available_local_id';
import { TransferEvent } from './events/transfer';

export class TokenModule extends BaseInteroperableModule {
	public method = new TokenMethod(this.stores, this.events, this.name);
	public endpoint = new TokenEndpoint(this.stores, this.offchainStores, this.events);
	public crossChainMethod = new TokenInteroperableMethod(this.stores, this.events, this.method);

	private _minBalances!: MinBalance[];
	private readonly _transferCommand = new TransferCommand(this.stores, this.events);
	private readonly _ccTransferCommand = new CCTransferCommand(this.stores, this.events);

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [this._transferCommand, this._ccTransferCommand];

	public constructor() {
		super();
		this.stores.register(UserStore, new UserStore(this.name));
		this.stores.register(EscrowStore, new EscrowStore(this.name));
		this.stores.register(SupplyStore, new SupplyStore(this.name));
		this.stores.register(TerminatedEscrowStore, new TerminatedEscrowStore(this.name));
		this.stores.register(AvailableLocalIDStore, new AvailableLocalIDStore(this.name));
		this.events.register(TransferEvent, new TransferEvent(this.name));
	}

	public addDependencies(
		interoperabilityMethod: MainchainInteroperabilityMethod | SidechainInteroperabilityMethod,
	) {
		this.method.addDependencies(interoperabilityMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			endpoints: [
				{
					name: this.endpoint.getBalance.name,
					request: getBalanceRequestSchema,
					response: getBalanceResponseSchema,
				},
				{
					name: this.endpoint.getBalances.name,
					request: getBalancesRequestSchema,
					response: getBalancesRequestSchema,
				},
				{
					name: this.endpoint.getTotalSupply.name,
					response: getTotalSupplyResponseSchema,
				},
				{
					name: this.endpoint.getSupportedTokens.name,
					response: getSupportedTokensResponseSchema,
				},
				{
					name: this.endpoint.getEscrowedAmounts.name,
					response: getEscrowedAmountsResponseSchema,
				},
			],
			commands: this.commands.map(command => ({
				name: command.name,
				params: command.schema,
			})),
			events: this.events.values().map(v => ({
				name: v.name,
				data: v.schema,
			})),
			assets: [
				{
					version: 0,
					data: genesisTokenStoreSchema,
				},
			],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs) {
		const { moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig) as ModuleConfig;
		validator.validate(configSchema, config);

		this._minBalances = config.minBalances.map(mb => ({
			tokenID: Buffer.from(mb.tokenID, 'hex'),
			amount: BigInt(mb.amount),
		}));
		this.method.init({ minBalances: this._minBalances });
		this.endpoint.init(this.method, config.supportedTokenIDs);
		this._transferCommand.init({
			method: this.method,
		});
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = context.assets.getAsset(this.name);
		// if there is no asset, do not initialize
		if (!assetBytes) {
			return;
		}
		const genesisStore = codec.decode<GenesisTokenStore>(genesisTokenStoreSchema, assetBytes);
		validator.validate(genesisTokenStoreSchema, genesisStore);

		const userStore = this.stores.get(UserStore);
		const copiedUserStore = [...genesisStore.userSubstore];
		copiedUserStore.sort((a, b) => {
			if (!a.address.equals(b.address)) {
				return a.address.compare(b.address);
			}
			return a.tokenID.compare(b.tokenID);
		});
		const userKeySet = new dataStructures.BufferSet();
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < genesisStore.userSubstore.length; i += 1) {
			const userData = genesisStore.userSubstore[i];
			const key = userStore.getKey(userData.address, userData.tokenID);
			// Validate uniqueness of address/tokenID pair
			if (userKeySet.has(key)) {
				throw new Error(
					`Address ${address.getLisk32AddressFromAddress(
						userData.address,
					)} and tokenID ${userData.tokenID.toString('hex')} pair is duplicated.`,
				);
			}
			userKeySet.add(key);

			// Validate sorting of userSubstore
			if (
				!userData.address.equals(copiedUserStore[i].address) ||
				!userData.tokenID.equals(copiedUserStore[i].tokenID)
			) {
				throw new Error('UserSubstore must be sorted by address and tokenID.');
			}

			const lockedBalanceModuleIDSet = new Set();
			let lastModuleID = '';
			for (const lockedBalance of userData.lockedBalances) {
				lockedBalanceModuleIDSet.add(lockedBalance.module);
				// Validate locked balances must not be zero
				if (lockedBalance.amount === BigInt(0)) {
					throw new Error(
						`Address ${address.getLisk32AddressFromAddress(
							userData.address,
						)} contains 0 amount locked balance.`,
					);
				}
				// Validate locked balances must be sorted
				if (lockedBalance.module.localeCompare(lastModuleID, 'en') < 0) {
					throw new Error('Locked balances must be sorted by moduleID.');
				}
				lastModuleID = lockedBalance.module;
			}
			// Validate locked balance module ID uniqueness
			if (lockedBalanceModuleIDSet.size !== userData.lockedBalances.length) {
				throw new Error(
					`Address ${address.getLisk32AddressFromAddress(
						userData.address,
					)} has duplicate module in locked balances.`,
				);
			}
			// Validate userSubstore not to be empty
			if (userData.lockedBalances.length === 0 && userData.availableBalance === BigInt(0)) {
				throw new Error(
					`Address ${address.getLisk32AddressFromAddress(userData.address)} has empty data.`,
				);
			}

			await userStore.set(context, key, userData);
		}

		const copiedSupplyStore = [...genesisStore.supplySubstore];
		copiedSupplyStore.sort((a, b) => a.localID.compare(b.localID));

		const supplyStoreKeySet = new dataStructures.BufferSet();
		const supplyStore = this.stores.get(SupplyStore);
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < genesisStore.supplySubstore.length; i += 1) {
			const supplyData = genesisStore.supplySubstore[i];
			if (supplyStoreKeySet.has(supplyData.localID)) {
				throw new Error(
					`Supply store local ID ${supplyData.localID.toString('hex')} is duplicated.`,
				);
			}
			supplyStoreKeySet.add(supplyData.localID);
			// Validate sorting of userSubstore
			if (!supplyData.localID.equals(copiedSupplyStore[i].localID)) {
				throw new Error('SupplySubstore must be sorted by localID.');
			}

			await supplyStore.set(context, supplyData.localID, { totalSupply: supplyData.totalSupply });
		}

		const copiedEscrowStore = [...genesisStore.escrowSubstore];
		copiedEscrowStore.sort((a, b) => {
			if (!a.escrowChainID.equals(b.escrowChainID)) {
				return a.escrowChainID.compare(b.escrowChainID);
			}
			return a.localID.compare(b.localID);
		});

		const escrowStore = this.stores.get(EscrowStore);
		const escrowKeySet = new dataStructures.BufferSet();
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < genesisStore.escrowSubstore.length; i += 1) {
			const escrowData = genesisStore.escrowSubstore[i];
			// validate terminated escrow chain ID/local ID uniqueness
			const key = Buffer.concat([escrowData.escrowChainID, escrowData.localID]);
			if (escrowKeySet.has(key)) {
				throw new Error(
					`Escrow store escrowChainID ${escrowData.escrowChainID.toString(
						'hex',
					)} and localID ${escrowData.localID.toString('hex')} pair is duplicated.`,
				);
			}
			escrowKeySet.add(key);
			// validate terminated escrow chain ID/local ID order
			if (
				!escrowData.escrowChainID.equals(copiedEscrowStore[i].escrowChainID) ||
				!escrowData.localID.equals(copiedEscrowStore[i].localID)
			) {
				throw new Error('EscrowSubstore must be sorted by escrowChainID and localID.');
			}
			await escrowStore.set(context, key, { amount: escrowData.amount });
		}

		const nextAvailableLocalIDStore = this.stores.get(AvailableLocalIDStore);
		await nextAvailableLocalIDStore.set(context, EMPTY_BYTES, {
			nextAvailableLocalID: genesisStore.availableLocalIDSubstore.nextAvailableLocalID,
		});

		const terminatedEscrowStore = this.stores.get(TerminatedEscrowStore);
		const terminatedEscrowKeySet = new dataStructures.BufferSet(
			genesisStore.terminatedEscrowSubstore,
		);
		// validate terminated escrow chain ID uniqueness
		if (terminatedEscrowKeySet.size !== genesisStore.terminatedEscrowSubstore.length) {
			throw new Error(`Terminated escrow store chainID has duplicate.`);
		}
		// validate terminated escrow chain ID order
		if (!objects.bufferArrayOrderByLex(genesisStore.terminatedEscrowSubstore)) {
			throw new Error(`Terminated escrow store must be sorted by chainID.`);
		}
		for (const terminatedChainID of genesisStore.terminatedEscrowSubstore) {
			await terminatedEscrowStore.set(context, terminatedChainID, { escrowTerminated: true });
		}

		// verify result
		// validateSupplyStoreEntries
		const computedSupply = new dataStructures.BufferMap<bigint>();
		const allUsers = await userStore.iterate(context, {
			gte: Buffer.alloc(ADDRESS_LENGTH + TOKEN_ID_LENGTH, 0),
			lte: Buffer.alloc(ADDRESS_LENGTH + TOKEN_ID_LENGTH, 255),
		});
		for (const { key, value: user } of allUsers) {
			const tokenID = key.slice(ADDRESS_LENGTH);
			const [chainID, localID] = splitTokenID(tokenID);
			if (chainID.equals(CHAIN_ID_ALIAS_NATIVE)) {
				const existingSupply = computedSupply.get(localID) ?? BigInt(0);
				computedSupply.set(
					localID,
					existingSupply +
						user.availableBalance +
						user.lockedBalances.reduce((prev, current) => prev + current.amount, BigInt(0)),
				);
			}
		}
		const allEscrows = await escrowStore.iterate(context, {
			gte: Buffer.alloc(CHAIN_ID_LENGTH + LOCAL_ID_LENGTH, 0),
			lte: Buffer.alloc(CHAIN_ID_LENGTH + LOCAL_ID_LENGTH, 255),
		});
		for (const { key, value } of allEscrows) {
			const [, localID] = splitTokenID(key);
			const existingSupply = computedSupply.get(localID) ?? BigInt(0);
			computedSupply.set(localID, existingSupply + value.amount);
		}
		for (const [localID, supply] of computedSupply.entries()) {
			if (!isUInt64(supply)) {
				throw new Error(
					`Total supply for LocalID: ${localID.toString('hex')} exceeds uint64 range.`,
				);
			}
		}
		const storedSupply = new dataStructures.BufferMap<bigint>();
		const allSupplies = await supplyStore.iterate(context, {
			gte: Buffer.alloc(LOCAL_ID_LENGTH, 0),
			lte: Buffer.alloc(LOCAL_ID_LENGTH, 255),
		});
		const maxLocalID = allSupplies[allSupplies.length - 1].key;
		for (const { key, value } of allSupplies) {
			storedSupply.set(key, value.totalSupply);
		}

		for (const [localID, supply] of computedSupply.entries()) {
			const stored = storedSupply.get(localID);
			if (!stored || stored !== supply) {
				throw new Error('Stored total supply conflicts with computed supply.');
			}
		}
		for (const [localID, supply] of storedSupply.entries()) {
			if (!computedSupply.has(localID) && supply !== BigInt(0)) {
				throw new Error('Stored total supply is non zero but cannot be computed.');
			}
		}

		// validate next available ID
		const { nextAvailableLocalID } = await nextAvailableLocalIDStore.get(context, EMPTY_BYTES);
		// If maxLocalID is larger than nextAvailableLocalID, it is invalid
		if (maxLocalID.compare(nextAvailableLocalID) > 0) {
			throw new Error('Max local ID is higher than next availableLocalID');
		}
	}
}
