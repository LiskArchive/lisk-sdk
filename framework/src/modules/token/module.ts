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
import {
	ADDRESS_LENGTH,
	CHAIN_ID_ALIAS_NATIVE,
	CHAIN_ID_LENGTH,
	defaultConfig,
	EMPTY_BYTES,
	LOCAL_ID_LENGTH,
	STORE_PREFIX_AVAILABLE_LOCAL_ID,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_SUPPLY,
	STORE_PREFIX_TERMINATED_ESCROW,
	STORE_PREFIX_USER,
	TOKEN_ID_LENGTH,
} from './constants';
import { TransferCommand } from './commands/transfer';
import { ModuleInitArgs, ModuleMetadata } from '../base_module';
import { GenesisBlockExecuteContext } from '../../state_machine';
import {
	AvailableLocalIDStoreData,
	availableLocalIDStoreSchema,
	configSchema,
	EscrowStoreData,
	escrowStoreSchema,
	genesisTokenStoreSchema,
	getBalanceRequestSchema,
	getBalanceResponseSchema,
	getBalancesRequestSchema,
	getEscrowedAmountsResponseSchema,
	getSupportedTokensResponseSchema,
	getTotalSupplyResponseSchema,
	SupplyStoreData,
	supplyStoreSchema,
	terminatedEscrowStoreSchema,
	UserStoreData,
	userStoreSchema,
} from './schemas';
import { TokenAPI } from './api';
import { TokenEndpoint } from './endpoint';
import { GenesisTokenStore, MinBalance, ModuleConfig } from './types';
import { getUserStoreKey, splitTokenID } from './utils';
import { CCTransferCommand } from './commands/cc_transfer';
import { BaseInteroperableModule } from '../interoperability/base_interoperable_module';
import { TokenInteroperableAPI } from './cc_api';
import { MainchainInteroperabilityAPI, SidechainInteroperabilityAPI } from '../interoperability';

export class TokenModule extends BaseInteroperableModule {
	public name = 'token';
	public api = new TokenAPI(this.name);
	public endpoint = new TokenEndpoint(this.name);
	public crossChainAPI = new TokenInteroperableAPI(this.name, this.api);

	private _minBalances!: MinBalance[];
	private readonly _transferCommand = new TransferCommand(this.id);
	private readonly _ccTransferCommand = new CCTransferCommand(this.id);

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [this._transferCommand, this._ccTransferCommand];

	public addDependencies(
		interoperabilityAPI: MainchainInteroperabilityAPI | SidechainInteroperabilityAPI,
	) {
		this.api.addDependencies(interoperabilityAPI);
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
				id: command.id,
				name: command.name,
				params: command.schema,
			})),
			events: [],
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
		this.api.init({ minBalances: this._minBalances });
		this.endpoint.init(this.api, config.supportedTokenIDs);
		this._transferCommand.init({
			api: this.api,
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

		const userStore = context.getStore(this.id, STORE_PREFIX_USER);
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
			const key = getUserStoreKey(userData.address, userData.tokenID);
			// Validate uniqueness of address/tokenID pair
			if (userKeySet.has(key)) {
				throw new Error(
					`Address ${userData.address.toString('hex')} and tokenID ${userData.tokenID.toString(
						'hex',
					)} pair is duplicated.`,
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
						`Address ${userData.address.toString('hex')} contains 0 amount locked balance.`,
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
					`Address ${userData.address.toString('hex')} has duplicate module in locked balances.`,
				);
			}
			// Validate userSubstore not to be empty
			if (userData.lockedBalances.length === 0 && userData.availableBalance === BigInt(0)) {
				throw new Error(`Address ${userData.address.toString('hex')} has empty data.`);
			}

			await userStore.setWithSchema(key, userData, userStoreSchema);
		}

		const copiedSupplyStore = [...genesisStore.supplySubstore];
		copiedSupplyStore.sort((a, b) => a.localID.compare(b.localID));

		const supplyStoreKeySet = new dataStructures.BufferSet();
		const supplyStore = context.getStore(this.id, STORE_PREFIX_SUPPLY);
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

			await supplyStore.setWithSchema(
				supplyData.localID,
				{ totalSupply: supplyData.totalSupply },
				supplyStoreSchema,
			);
		}

		const copiedEscrowStore = [...genesisStore.escrowSubstore];
		copiedEscrowStore.sort((a, b) => {
			if (!a.escrowChainID.equals(b.escrowChainID)) {
				return a.escrowChainID.compare(b.escrowChainID);
			}
			return a.localID.compare(b.localID);
		});

		const escrowStore = context.getStore(this.id, STORE_PREFIX_ESCROW);
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
			await escrowStore.setWithSchema(key, { amount: escrowData.amount }, escrowStoreSchema);
		}

		const nextAvailableLocalIDStore = context.getStore(this.id, STORE_PREFIX_AVAILABLE_LOCAL_ID);
		await nextAvailableLocalIDStore.setWithSchema(
			EMPTY_BYTES,
			{ nextAvailableLocalID: genesisStore.availableLocalIDSubstore.nextAvailableLocalID },
			availableLocalIDStoreSchema,
		);

		const terminatedEscrowStore = context.getStore(this.id, STORE_PREFIX_TERMINATED_ESCROW);
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
			await terminatedEscrowStore.setWithSchema(
				terminatedChainID,
				{ escrowTerminated: true },
				terminatedEscrowStoreSchema,
			);
		}

		// verify result
		// validateSupplyStoreEntries
		const computedSupply = new dataStructures.BufferMap<bigint>();
		const allUsers = await userStore.iterateWithSchema<UserStoreData>(
			{
				gte: Buffer.alloc(ADDRESS_LENGTH + TOKEN_ID_LENGTH, 0),
				lte: Buffer.alloc(ADDRESS_LENGTH + TOKEN_ID_LENGTH, 255),
			},
			userStoreSchema,
		);
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
		const allEscrows = await escrowStore.iterateWithSchema<EscrowStoreData>(
			{
				gte: Buffer.alloc(CHAIN_ID_LENGTH + LOCAL_ID_LENGTH, 0),
				lte: Buffer.alloc(CHAIN_ID_LENGTH + LOCAL_ID_LENGTH, 255),
			},
			escrowStoreSchema,
		);
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
		const allSupplies = await supplyStore.iterateWithSchema<SupplyStoreData>(
			{
				gte: Buffer.alloc(LOCAL_ID_LENGTH, 0),
				lte: Buffer.alloc(LOCAL_ID_LENGTH, 255),
			},
			supplyStoreSchema,
		);
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
		const {
			nextAvailableLocalID,
		} = await nextAvailableLocalIDStore.getWithSchema<AvailableLocalIDStoreData>(
			EMPTY_BYTES,
			availableLocalIDStoreSchema,
		);
		// If maxLocalID is larger than nextAvailableLocalID, it is invalid
		if (maxLocalID.compare(nextAvailableLocalID) > 0) {
			throw new Error('Max local ID is higher than next availableLocalID');
		}
	}
}
