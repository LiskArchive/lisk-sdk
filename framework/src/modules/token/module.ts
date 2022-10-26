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
import { ADDRESS_LENGTH, CHAIN_ID_LENGTH, defaultConfig, TOKEN_ID_LENGTH } from './constants';
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
import { GenesisTokenStore, InteroperabilityMethod, ModuleConfigJSON } from './types';
import { splitTokenID } from './utils';
import { CCTransferCommand } from './commands/cc_transfer';
import { BaseInteroperableModule } from '../interoperability/base_interoperable_module';
import { TokenInteroperableMethod } from './cc_method';
import { UserStore } from './stores/user';
import { EscrowStore } from './stores/escrow';
import { SupplyStore } from './stores/supply';
import { SupportedTokensStore } from './stores/supported_tokens';
import { TransferEvent } from './events/transfer';
import { TransferCrossChainEvent } from './events/transfer_cross_chain';
import { CcmTransferEvent } from './events/ccm_transfer';
import { MintEvent } from './events/mint';
import { BurnEvent } from './events/burn';
import { LockEvent } from './events/lock';
import { UnlockEvent } from './events/unlock';
import { InitializeTokenEvent } from './events/initialize_token';
import { InitializeUserAccountEvent } from './events/initialize_user_account';
import { InitializeEscrowAccountEvent } from './events/initialize_escrow_account';
import { RecoverEvent } from './events/recover';
import { BeforeCCCExecutionEvent } from './events/before_ccc_execution';
import { BeforeCCMForwardingEvent } from './events/before_ccm_forwarding';
import { AllTokensSupportedEvent } from './events/all_tokens_supported';
import { AllTokensSupportRemovedEvent } from './events/all_tokens_supported_removed';
import { AllTokensFromChainSupportedEvent } from './events/all_tokens_from_chain_supported';
import { AllTokensFromChainSupportRemovedEvent } from './events/all_tokens_from_chain_supported_removed';
import { TokenIDSupportedEvent } from './events/token_id_supported';
import { TokenIDSupportRemovedEvent } from './events/token_id_supported_removed';
import { CrossChainTransferCommand } from './cc_commands/cc_transfer';

export class TokenModule extends BaseInteroperableModule {
	public method = new TokenMethod(this.stores, this.events, this.name);
	public endpoint = new TokenEndpoint(this.stores, this.offchainStores);
	public crossChainMethod = new TokenInteroperableMethod(this.stores, this.events);
	public crossChainTransferCommand = new CrossChainTransferCommand(
		this.stores,
		this.events,
		this.method,
	);

	private _ownChainID!: Buffer;
	private readonly _transferCommand = new TransferCommand(this.stores, this.events);
	private readonly _ccTransferCommand = new CCTransferCommand(this.stores, this.events);

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [this._transferCommand, this._ccTransferCommand];

	public constructor() {
		super();
		this.stores.register(UserStore, new UserStore(this.name));
		this.stores.register(EscrowStore, new EscrowStore(this.name));
		this.stores.register(SupplyStore, new SupplyStore(this.name));
		this.stores.register(SupportedTokensStore, new SupportedTokensStore(this.name));
		this.events.register(TransferEvent, new TransferEvent(this.name));
		this.events.register(TransferCrossChainEvent, new TransferCrossChainEvent(this.name));
		this.events.register(CcmTransferEvent, new CcmTransferEvent(this.name));
		this.events.register(MintEvent, new MintEvent(this.name));
		this.events.register(BurnEvent, new BurnEvent(this.name));
		this.events.register(LockEvent, new LockEvent(this.name));
		this.events.register(UnlockEvent, new UnlockEvent(this.name));
		this.events.register(InitializeTokenEvent, new InitializeTokenEvent(this.name));
		this.events.register(InitializeUserAccountEvent, new InitializeUserAccountEvent(this.name));
		this.events.register(InitializeEscrowAccountEvent, new InitializeEscrowAccountEvent(this.name));
		this.events.register(RecoverEvent, new RecoverEvent(this.name));
		this.events.register(BeforeCCCExecutionEvent, new BeforeCCCExecutionEvent(this.name));
		this.events.register(BeforeCCMForwardingEvent, new BeforeCCMForwardingEvent(this.name));
		this.events.register(AllTokensSupportedEvent, new AllTokensSupportedEvent(this.name));
		this.events.register(AllTokensSupportRemovedEvent, new AllTokensSupportRemovedEvent(this.name));
		this.events.register(
			AllTokensFromChainSupportedEvent,
			new AllTokensFromChainSupportedEvent(this.name),
		);
		this.events.register(
			AllTokensFromChainSupportRemovedEvent,
			new AllTokensFromChainSupportRemovedEvent(this.name),
		);
		this.events.register(TokenIDSupportedEvent, new TokenIDSupportedEvent(this.name));
		this.events.register(TokenIDSupportRemovedEvent, new TokenIDSupportRemovedEvent(this.name));
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod) {
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
		const { moduleConfig, genesisConfig } = args;
		this._ownChainID = Buffer.from(genesisConfig.chainID, 'hex');

		const config = objects.mergeDeep(
			{},
			defaultConfig,
			{ feeTokenID: Buffer.concat([this._ownChainID, Buffer.alloc(4, 0)]).toString('hex') },
			moduleConfig,
		) as ModuleConfigJSON;
		validator.validate(configSchema, config);

		this.stores.get(SupportedTokensStore).registerOwnChainID(this._ownChainID);
		this.crossChainTransferCommand.init({ ownChainID: this._ownChainID });

		this.method.init({
			ownChainID: this._ownChainID,
			escrowAccountInitializationFee: BigInt('50000000'),
			feeTokenID: Buffer.from(config.feeTokenID, 'hex'),
			userAccountInitializationFee: BigInt('50000000'),
		});
		this.crossChainMethod.init(this._ownChainID);
		this.endpoint.init(this.method);
		this._transferCommand.init({
			method: this.method,
			accountInitializationFee: BigInt(config.userAccountInitializationFee),
			feeTokenID: Buffer.from(config.feeTokenID, 'hex'),
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
			let lastModule = '';
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
				if (lockedBalance.module.localeCompare(lastModule, 'en') < 0) {
					throw new Error('Locked balances must be sorted by module.');
				}
				lastModule = lockedBalance.module;
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

			await userStore.save(context, userData.address, userData.tokenID, userData);
		}

		const copiedSupplyStore = [...genesisStore.supplySubstore];
		copiedSupplyStore.sort((a, b) => a.tokenID.compare(b.tokenID));

		const supplyStoreKeySet = new dataStructures.BufferSet();
		const supplyStore = this.stores.get(SupplyStore);
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < genesisStore.supplySubstore.length; i += 1) {
			const supplyData = genesisStore.supplySubstore[i];
			if (supplyStoreKeySet.has(supplyData.tokenID)) {
				throw new Error(
					`Supply store token ID ${supplyData.tokenID.toString('hex')} is duplicated.`,
				);
			}
			supplyStoreKeySet.add(supplyData.tokenID);
			// Validate sorting of userSubstore
			if (!supplyData.tokenID.equals(copiedSupplyStore[i].tokenID)) {
				throw new Error('SupplySubstore must be sorted by tokenID.');
			}

			await supplyStore.set(context, supplyData.tokenID, { totalSupply: supplyData.totalSupply });
		}

		const copiedEscrowStore = [...genesisStore.escrowSubstore];
		copiedEscrowStore.sort((a, b) => {
			if (!a.escrowChainID.equals(b.escrowChainID)) {
				return a.escrowChainID.compare(b.escrowChainID);
			}
			return a.tokenID.compare(b.tokenID);
		});

		const escrowStore = this.stores.get(EscrowStore);
		const escrowKeySet = new dataStructures.BufferSet();
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < genesisStore.escrowSubstore.length; i += 1) {
			const escrowData = genesisStore.escrowSubstore[i];
			const key = Buffer.concat([escrowData.escrowChainID, escrowData.tokenID]);
			// validate terminated escrow chain ID/local ID uniqueness
			if (escrowKeySet.has(key)) {
				throw new Error(
					`Escrow store escrowChainID ${escrowData.escrowChainID.toString(
						'hex',
					)} and tokenID ${escrowData.tokenID.toString('hex')} pair is duplicated.`,
				);
			}
			escrowKeySet.add(key);
			// validate terminated escrow chain ID/token ID order
			if (
				!escrowData.escrowChainID.equals(copiedEscrowStore[i].escrowChainID) ||
				!escrowData.tokenID.equals(copiedEscrowStore[i].tokenID)
			) {
				throw new Error('EscrowSubstore must be sorted by escrowChainID and tokenID.');
			}
			await escrowStore.set(context, key, { amount: escrowData.amount });
		}

		const copiedSupportedTokenIDsStore = [...genesisStore.supportedTokensSubstore];
		copiedSupportedTokenIDsStore.sort((a, b) => a.chainID.compare(b.chainID));

		const supportedTokenIDsStore = this.stores.get(SupportedTokensStore);
		const supportedTokenIDsSet = new dataStructures.BufferSet();
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < genesisStore.supportedTokensSubstore.length; i += 1) {
			const supportedTokenIDsData = genesisStore.supportedTokensSubstore[i];
			// validate terminated escrow chain ID/local ID uniqueness
			if (supportedTokenIDsSet.has(supportedTokenIDsData.chainID)) {
				throw new Error(
					`supportedTokenIDsSet chain ID ${supportedTokenIDsData.chainID.toString(
						'hex',
					)} is duplicated.`,
				);
			}
			supportedTokenIDsSet.add(supportedTokenIDsData.chainID);
			// validate terminated escrow chain ID/local ID order
			if (!supportedTokenIDsData.chainID.equals(copiedSupportedTokenIDsStore[i].chainID)) {
				throw new Error('supportedTokensSubstore must be sorted by chainID.');
			}
			if (
				!objects.bufferArrayUniqueItems(supportedTokenIDsData.supportedTokenIDs) ||
				!objects.bufferArrayOrderByLex(supportedTokenIDsData.supportedTokenIDs)
			) {
				throw new Error(
					'supportedTokensSubstore tokenIDs must be unique and sorted by lexicographically.',
				);
			}
			for (const tokenID of supportedTokenIDsData.supportedTokenIDs) {
				if (!tokenID.slice(0, CHAIN_ID_LENGTH).equals(supportedTokenIDsData.chainID)) {
					throw new Error('supportedTokensSubstore tokenIDs must match the chainID.');
				}
			}
			await supportedTokenIDsStore.set(context, supportedTokenIDsData.chainID, {
				supportedTokenIDs: supportedTokenIDsData.supportedTokenIDs,
			});
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
			const [chainID] = splitTokenID(tokenID);
			if (chainID.equals(this._ownChainID)) {
				const existingSupply = computedSupply.get(tokenID) ?? BigInt(0);
				computedSupply.set(
					tokenID,
					existingSupply +
						user.availableBalance +
						user.lockedBalances.reduce((prev, current) => prev + current.amount, BigInt(0)),
				);
			}
		}
		const allEscrows = await escrowStore.iterate(context, {
			gte: Buffer.alloc(CHAIN_ID_LENGTH + TOKEN_ID_LENGTH, 0),
			lte: Buffer.alloc(CHAIN_ID_LENGTH + TOKEN_ID_LENGTH, 255),
		});
		for (const { key, value } of allEscrows) {
			const tokenID = key.slice(CHAIN_ID_LENGTH);
			const existingSupply = computedSupply.get(tokenID) ?? BigInt(0);
			computedSupply.set(tokenID, existingSupply + value.amount);
		}
		for (const [tokenID, supply] of computedSupply.entries()) {
			if (!isUInt64(supply)) {
				throw new Error(
					`Total supply for tokenID: ${tokenID.toString('hex')} exceeds uint64 range.`,
				);
			}
		}
		const storedSupply = new dataStructures.BufferMap<bigint>();
		const allSupplies = await supplyStore.iterate(context, {
			gte: Buffer.alloc(TOKEN_ID_LENGTH, 0),
			lte: Buffer.alloc(TOKEN_ID_LENGTH, 255),
		});
		for (const { key, value } of allSupplies) {
			storedSupply.set(key, value.totalSupply);
		}

		for (const [tokenID, supply] of computedSupply.entries()) {
			const stored = storedSupply.get(tokenID);
			if (!stored || stored !== supply) {
				throw new Error('Stored total supply conflicts with computed supply.');
			}
		}
		for (const [tokenID, supply] of storedSupply.entries()) {
			if (!computedSupply.has(tokenID) && supply !== BigInt(0)) {
				throw new Error('Stored total supply is non zero but cannot be computed.');
			}
		}
	}
}
