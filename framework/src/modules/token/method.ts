/*
 * Copyright © 2021 Lisk Foundation
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
import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { NotFoundError } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { dataStructures } from '@liskhq/lisk-utils';
import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import {
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	LOCAL_ID_LENGTH,
	TokenEventResult,
	MAX_DATA_LENGTH,
} from './constants';
import { crossChainTransferMessageParams } from './schemas';
import { InteroperabilityMethod, ModuleConfig } from './types';
import { splitTokenID } from './utils';
import { UserStore, UserStoreData } from './stores/user';
import { EscrowStore } from './stores/escrow';
import { SupplyStore, SupplyStoreData } from './stores/supply';
import { NamedRegistry } from '../named_registry';
import { TransferEvent } from './events/transfer';
import { InitializeTokenEvent } from './events/initialize_token';
import { MintEvent } from './events/mint';
import { BurnEvent } from './events/burn';
import { LockEvent } from './events/lock';
import { UnlockEvent } from './events/unlock';
import { TransferCrossChainEvent } from './events/transfer_cross_chain';
import { ALL_SUPPORTED_TOKENS_KEY, SupportedTokensStore } from './stores/supported_tokens';
import { AllTokensSupportedEvent } from './events/all_tokens_supported';
import { AllTokensSupportRemovedEvent } from './events/all_tokens_supported_removed';
import { TokenIDSupportedEvent } from './events/token_id_supported';
import { AllTokensFromChainSupportedEvent } from './events/all_tokens_from_chain_supported';
import { AllTokensFromChainSupportRemovedEvent } from './events/all_tokens_from_chain_supported_removed';
import { TokenIDSupportRemovedEvent } from './events/token_id_supported_removed';
import { InternalMethod } from './internal_method';

interface MethodConfig extends ModuleConfig {
	ownChainID: Buffer;
}

export class TokenMethod extends BaseMethod {
	private readonly _moduleName: string;
	private _config!: MethodConfig;
	private _interoperabilityMethod!: InteroperabilityMethod;
	private _internalMethod!: InternalMethod;

	public constructor(stores: NamedRegistry, events: NamedRegistry, moduleName: string) {
		super(stores, events);
		this._moduleName = moduleName;
	}

	public init(config: MethodConfig): void {
		this._config = config;
	}

	public addDependencies(
		interoperabilityMethod: InteroperabilityMethod,
		internalMethod: InternalMethod,
	) {
		this._interoperabilityMethod = interoperabilityMethod;
		this._internalMethod = internalMethod;
	}

	public isNativeToken(tokenID: Buffer): boolean {
		const [chainID] = splitTokenID(tokenID);
		return chainID.equals(this._config.ownChainID);
	}

	public getTokenIDLSK(): Buffer {
		const networkID = this._config.ownChainID.subarray(0, 1);
		// 3 bytes for remaining chainID bytes
		return Buffer.concat([networkID, Buffer.alloc(3 + LOCAL_ID_LENGTH, 0)]);
	}

	public async userSubstoreExists(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<boolean> {
		const userStore = this.stores.get(UserStore);
		return userStore.has(methodContext, userStore.getKey(address, tokenID));
	}

	public async getAvailableBalance(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<bigint> {
		const userStore = this.stores.get(UserStore);
		try {
			const user = await userStore.get(methodContext, userStore.getKey(address, tokenID));
			return user.availableBalance;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return BigInt(0);
		}
	}

	public async getLockedAmount(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: Buffer,
		module: string,
	): Promise<bigint> {
		const userStore = this.stores.get(UserStore);
		try {
			const user = await userStore.get(methodContext, userStore.getKey(address, tokenID));
			return user.lockedBalances.find(lb => lb.module === module)?.amount ?? BigInt(0);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return BigInt(0);
		}
	}

	public async getEscrowedAmount(
		methodContext: ImmutableMethodContext,
		escrowChainID: Buffer,
		tokenID: Buffer,
	): Promise<bigint> {
		if (!this.isNativeToken(tokenID)) {
			throw new Error('Only native token can have escrow amount.');
		}

		if (this._config.ownChainID.equals(escrowChainID)) {
			throw new Error('Escrow is not defined for own chain.');
		}

		const escrowStore = this.stores.get(EscrowStore);

		const key = escrowStore.getKey(escrowChainID, tokenID);

		if (!(await escrowStore.has(methodContext, key))) {
			return BigInt(0);
		}

		const escrowAccount = await escrowStore.get(methodContext, key);

		return escrowAccount.amount;
	}

	public async isTokenIDAvailable(
		methodContext: ImmutableMethodContext,
		tokenID: Buffer,
	): Promise<boolean> {
		const exist = await this.stores.get(SupplyStore).has(methodContext, tokenID);
		return !exist;
	}

	public async initializeToken(methodContext: MethodContext, tokenID: Buffer): Promise<void> {
		if (!this.isNativeToken(tokenID)) {
			this.events
				.get(InitializeTokenEvent)
				.error(methodContext, { tokenID }, TokenEventResult.TOKEN_ID_NOT_NATIVE);
			throw new Error('Only native token can be initialized.');
		}
		const available = await this.isTokenIDAvailable(methodContext, tokenID);
		if (!available) {
			this.events
				.get(InitializeTokenEvent)
				.error(methodContext, { tokenID }, TokenEventResult.TOKEN_ID_NOT_AVAILABLE);
			throw new Error('The specified token ID is not available.');
		}
		await this.stores.get(SupplyStore).set(methodContext, tokenID, { totalSupply: BigInt(0) });

		this.events.get(InitializeTokenEvent).log(methodContext, { tokenID });
	}

	public async mint(
		methodContext: MethodContext,
		address: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		if (amount <= BigInt(0)) {
			return;
		}

		const eventData = {
			address,
			tokenID,
			amount,
		};

		if (!this.isNativeToken(tokenID)) {
			this.events
				.get(MintEvent)
				.error(methodContext, eventData, TokenEventResult.MINT_FAIL_NON_NATIVE_TOKEN);
			throw new Error('Only native token can be minted.');
		}
		const supplyStore = this.stores.get(SupplyStore);
		let supply: SupplyStoreData;
		try {
			supply = await supplyStore.get(methodContext, tokenID);
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events
					.get(MintEvent)
					.error(methodContext, eventData, TokenEventResult.MINT_FAIL_TOKEN_NOT_INITIALIZED);
				throw new Error(`TokenID: ${tokenID.toString('hex')} is not initialized.`);
			}
			throw error;
		}

		if (supply.totalSupply + amount >= BigInt(2) ** BigInt(64)) {
			this.events
				.get(MintEvent)
				.error(methodContext, eventData, TokenEventResult.MINT_FAIL_TOTAL_SUPPLY_TOO_BIG);
			throw new Error(
				`TokenID: ${tokenID.toString(
					'hex',
				)} with ${amount.toString()} exceeds maximum range allowed.`,
			);
		}

		const availableBalance = await this.getAvailableBalance(methodContext, address, tokenID);
		if (availableBalance + amount >= BigInt(2) ** BigInt(64)) {
			this.events
				.get(MintEvent)
				.error(methodContext, eventData, TokenEventResult.MINT_FAIL_TOTAL_SUPPLY_TOO_BIG);
			throw new Error(
				`TokenID: ${tokenID.toString(
					'hex',
				)} with ${amount.toString()} exceeds maximum range allowed.`,
			);
		}

		const userStore = this.stores.get(UserStore);
		const userKey = userStore.getKey(address, tokenID);
		const userExist = await userStore.has(methodContext, userKey);
		if (!userExist) {
			await this._internalMethod.initializeUserAccount(methodContext, address, tokenID);
		}
		const userAccount = await userStore.get(methodContext, userStore.getKey(address, tokenID));
		userAccount.availableBalance += amount;
		await userStore.save(methodContext, address, tokenID, userAccount);

		supply.totalSupply += amount;
		await supplyStore.set(methodContext, tokenID, supply);

		this.events.get(MintEvent).log(methodContext, eventData);
	}

	public async burn(
		methodContext: MethodContext,
		address: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		if (amount <= BigInt(0)) {
			return;
		}

		const userStore = this.stores.get(UserStore);
		const eventData = {
			address,
			tokenID,
			amount,
		};
		let userAccount: UserStoreData;
		try {
			userAccount = await userStore.get(methodContext, userStore.getKey(address, tokenID));
			if (userAccount.availableBalance < amount) {
				this.events
					.get(BurnEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
				throw new Error(
					`Address ${cryptoAddress.getLisk32AddressFromAddress(
						address,
					)} does not have sufficient balance for amount ${amount.toString()}`,
				);
			}
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events
					.get(BurnEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
			}
			throw error;
		}

		userAccount.availableBalance -= amount;
		await userStore.set(methodContext, userStore.getKey(address, tokenID), userAccount);

		if (this.isNativeToken(tokenID)) {
			const supplyStore = this.stores.get(SupplyStore);
			const supply = await supplyStore.get(methodContext, tokenID);
			supply.totalSupply -= amount;
			await supplyStore.set(methodContext, tokenID, supply);
		}

		this.events.get(BurnEvent).log(methodContext, eventData);
	}

	public async initializeUserAccount(
		methodContext: MethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<void> {
		const userAccountExist = await this.userSubstoreExists(methodContext, address, tokenID);
		if (userAccountExist) {
			return;
		}
		await this._internalMethod.initializeUserAccount(methodContext, address, tokenID);
	}

	public async initializeEscrowAccount(
		methodContext: MethodContext,
		chainID: Buffer,
		tokenID: Buffer,
	): Promise<void> {
		if (!this.isNativeToken(tokenID)) {
			throw new Error(`TokenID ${tokenID.toString('hex')} is not native token.`);
		}

		if (this._config.ownChainID.equals(chainID)) {
			throw new Error(
				`Can not initialize escrow account for own chain, ${chainID.toString('hex')}`,
			);
		}

		const escrowStore = this.stores.get(EscrowStore);
		const escrowAccountExist = await escrowStore.has(
			methodContext,
			escrowStore.getKey(chainID, tokenID),
		);
		if (escrowAccountExist) {
			return;
		}
		await this._internalMethod.initializeEscrowAccount(methodContext, chainID, tokenID);
	}

	public async transfer(
		methodContext: MethodContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		if (amount <= BigInt(0)) {
			return;
		}

		const userStore = this.stores.get(UserStore);
		const eventData = {
			senderAddress,
			recipientAddress,
			tokenID,
			amount,
		};
		let senderAccount: UserStoreData;
		try {
			senderAccount = await userStore.get(methodContext, userStore.getKey(senderAddress, tokenID));
			if (senderAccount.availableBalance < amount) {
				this.events
					.get(TransferEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
				throw new Error(
					`Address ${cryptoAddress.getLisk32AddressFromAddress(
						senderAddress,
					)} does not have sufficient balance for amount ${amount.toString()}`,
				);
			}
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events
					.get(TransferEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
			}
			throw error;
		}
		const recipientExist = await userStore.has(
			methodContext,
			userStore.getKey(recipientAddress, tokenID),
		);
		if (!recipientExist) {
			await this._internalMethod.initializeUserAccount(methodContext, recipientAddress, tokenID);
		}
		await this._internalMethod.transfer(
			methodContext,
			senderAddress,
			recipientAddress,
			tokenID,
			amount,
		);
	}

	public async transferCrossChain(
		methodContext: MethodContext,
		senderAddress: Buffer,
		receivingChainID: Buffer,
		recipientAddress: Buffer,
		tokenID: Buffer,
		amount: bigint,
		messageFee: bigint,
		data: string,
	): Promise<void> {
		if (amount <= BigInt(0)) {
			return;
		}
		if (messageFee < BigInt(0)) {
			return;
		}

		const eventData = {
			senderAddress,
			recipientAddress,
			tokenID,
			amount,
			receivingChainID,
			messageFee,
		};

		if (this._config.ownChainID.equals(receivingChainID)) {
			this.events
				.get(TransferCrossChainEvent)
				.error(methodContext, eventData, TokenEventResult.INVALID_RECEIVING_CHAIN);
			throw new Error('Receiving chain cannot be the sending chain.');
		}

		if (data.length > MAX_DATA_LENGTH) {
			this.events
				.get(TransferCrossChainEvent)
				.error(methodContext, eventData, TokenEventResult.DATA_TOO_LONG);
			throw new Error(`Maximum data allowed is ${MAX_DATA_LENGTH}, but received ${data.length}`);
		}

		const balanceChecks = new dataStructures.BufferMap<bigint>();
		balanceChecks.set(tokenID, amount);
		const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
			methodContext,
			receivingChainID,
		);
		const totalMessageFee = (balanceChecks.get(messageFeeTokenID) ?? BigInt(0)) + messageFee;
		balanceChecks.set(messageFeeTokenID, totalMessageFee);

		for (const [checkTokenID, checkAmount] of balanceChecks.entries()) {
			const availableBalnace = await this.getAvailableBalance(
				methodContext,
				senderAddress,
				checkTokenID,
			);
			if (availableBalnace < checkAmount) {
				this.events
					.get(TransferCrossChainEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
				throw new Error(
					`Sender ${cryptoAddress.getLisk32AddressFromAddress(
						senderAddress,
					)} does not have sufficient balance ${checkAmount} for token ${checkTokenID.toString(
						'hex',
					)}.`,
				);
			}
		}
		const [tokenChainID] = splitTokenID(tokenID);

		if (![this._config.ownChainID, receivingChainID].some(id => id.equals(tokenChainID))) {
			this.events
				.get(TransferCrossChainEvent)
				.error(methodContext, eventData, TokenEventResult.INVALID_TOKEN_ID);
			throw new Error(
				`Invalid token ID ${tokenID.toString(
					'hex',
				)}. Token must be native to either the sending or the receiving chain.`,
			);
		}

		const escrowStore = this.stores.get(EscrowStore);
		if (this.isNativeToken(tokenID)) {
			const escrowExist = await escrowStore.has(
				methodContext,
				escrowStore.getKey(receivingChainID, tokenID),
			);
			if (!escrowExist) {
				await this._internalMethod.initializeEscrowAccount(
					methodContext,
					receivingChainID,
					tokenID,
				);
			}
		}

		await this.stores
			.get(UserStore)
			.addAvailableBalance(methodContext, senderAddress, tokenID, -amount);
		if (this.isNativeToken(tokenID)) {
			await this.stores
				.get(EscrowStore)
				.addAmount(methodContext, receivingChainID, tokenID, amount);
		}
		this.events.get(TransferCrossChainEvent).log(methodContext, eventData);
		await this._interoperabilityMethod.send(
			methodContext,
			senderAddress,
			this._moduleName,
			CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			receivingChainID,
			messageFee,
			codec.encode(crossChainTransferMessageParams, {
				tokenID,
				amount,
				senderAddress,
				recipientAddress,
				data,
			}),
		);
	}

	public async lock(
		methodContext: MethodContext,
		address: Buffer,
		module: string,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		if (amount <= BigInt(0)) {
			return;
		}

		const userStore = this.stores.get(UserStore);
		const eventData = {
			address,
			module,
			tokenID,
			amount,
		};
		let account: UserStoreData;
		try {
			account = await userStore.get(methodContext, userStore.getKey(address, tokenID));
			if (account.availableBalance < amount) {
				this.events
					.get(LockEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
				throw new Error(
					`Address ${cryptoAddress.getLisk32AddressFromAddress(
						address,
					)} does not have sufficient balance for amount ${amount.toString()}`,
				);
			}
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events
					.get(LockEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
			}
			throw error;
		}
		account.availableBalance -= amount;
		const existingIndex = account.lockedBalances.findIndex(b => b.module === module);
		if (existingIndex > -1) {
			const locked = account.lockedBalances[existingIndex].amount + amount;
			account.lockedBalances[existingIndex] = {
				module,
				amount: locked,
			};
		} else {
			account.lockedBalances.push({
				module,
				amount,
			});
		}
		await userStore.save(methodContext, address, tokenID, account);
		this.events.get(LockEvent).log(methodContext, eventData);
	}

	public async unlock(
		methodContext: MethodContext,
		address: Buffer,
		module: string,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
		if (amount <= BigInt(0)) {
			return;
		}

		const userStore = this.stores.get(UserStore);
		const eventData = {
			address,
			module,
			tokenID,
			amount,
		};
		let account: UserStoreData;
		try {
			account = await userStore.get(methodContext, userStore.getKey(address, tokenID));
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events
					.get(UnlockEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
			}
			throw error;
		}
		const existingIndex = account.lockedBalances.findIndex(b => b.module === module);
		if (existingIndex < 0) {
			this.events
				.get(UnlockEvent)
				.error(methodContext, eventData, TokenEventResult.INSUFFICIENT_LOCKED_AMOUNT);
			throw new Error(
				`Address ${cryptoAddress.getLisk32AddressFromAddress(
					address,
				)} does not have locked balance for module ${module}`,
			);
		}
		if (account.lockedBalances[existingIndex].amount < amount) {
			this.events
				.get(UnlockEvent)
				.error(methodContext, eventData, TokenEventResult.INSUFFICIENT_LOCKED_AMOUNT);
			throw new Error(
				`Address ${cryptoAddress.getLisk32AddressFromAddress(
					address,
				)} does not have sufficient locked balance for amount ${amount.toString()} for module ${module}`,
			);
		}

		account.lockedBalances[existingIndex].amount -= amount;
		account.availableBalance += amount;

		await userStore.save(methodContext, address, tokenID, account);
		this.events.get(UnlockEvent).log(methodContext, eventData);
	}

	public async payMessageFee(
		methodContext: MethodContext,
		payFromAddress: Buffer,
		receivingChainID: Buffer,
		fee: bigint,
	): Promise<void> {
		if (fee < BigInt(0)) {
			throw new Error('Invalid Message Fee');
		}

		const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
			methodContext,
			receivingChainID,
		);
		const userStore = this.stores.get(UserStore);
		const account = await userStore.get(
			methodContext,
			userStore.getKey(payFromAddress, messageFeeTokenID),
		);
		if (account.availableBalance < fee) {
			throw new Error(
				`Address ${cryptoAddress.getLisk32AddressFromAddress(
					payFromAddress,
				)} does not have sufficient balance ${account.availableBalance.toString()} to pay ${fee.toString()}`,
			);
		}
		account.availableBalance -= fee;
		await userStore.save(methodContext, payFromAddress, messageFeeTokenID, account);

		if (this.isNativeToken(messageFeeTokenID)) {
			await this.stores
				.get(EscrowStore)
				.addAmount(methodContext, receivingChainID, messageFeeTokenID, fee);
		}
	}

	public async isTokenSupported(
		methodContext: ImmutableMethodContext,
		tokenID: Buffer,
	): Promise<boolean> {
		return this.stores.get(SupportedTokensStore).isSupported(methodContext, tokenID);
	}

	public async supportAllTokens(methodContext: MethodContext): Promise<void> {
		await this.stores.get(SupportedTokensStore).supportAll(methodContext);
		this.events.get(AllTokensSupportedEvent).log(methodContext);
	}

	public async removeAllTokensSupport(methodContext: MethodContext): Promise<void> {
		await this.stores.get(SupportedTokensStore).removeAll(methodContext);
		this.events.get(AllTokensSupportRemovedEvent).log(methodContext);
	}

	public async supportAllTokensFromChainID(
		methodContext: MethodContext,
		chainID: Buffer,
	): Promise<void> {
		const allTokensSupported = await this.stores
			.get(SupportedTokensStore)
			.has(methodContext, ALL_SUPPORTED_TOKENS_KEY);

		if (allTokensSupported) {
			return;
		}

		if (chainID.equals(this._config.ownChainID)) {
			return;
		}

		await this.stores
			.get(SupportedTokensStore)
			.set(methodContext, chainID, { supportedTokenIDs: [] });

		this.events.get(AllTokensFromChainSupportedEvent).log(methodContext, chainID);
	}

	public async removeAllTokensSupportFromChainID(
		methodContext: MethodContext,
		chainID: Buffer,
	): Promise<void> {
		const allTokensSupported = await this.stores
			.get(SupportedTokensStore)
			.has(methodContext, ALL_SUPPORTED_TOKENS_KEY);

		if (allTokensSupported) {
			throw new Error('Invalid operation. All tokens from all chains are supported.');
		}

		if (chainID.equals(this._config.ownChainID)) {
			throw new Error(
				'Invalid operation. All tokens from all the specified chain should be supported.',
			);
		}

		const isChainSupported = await this.stores
			.get(SupportedTokensStore)
			.has(methodContext, chainID);

		if (!isChainSupported) {
			return;
		}

		await this.stores.get(SupportedTokensStore).del(methodContext, chainID);

		this.events.get(AllTokensFromChainSupportRemovedEvent).log(methodContext, chainID);
	}

	public async supportTokenID(methodContext: MethodContext, tokenID: Buffer): Promise<void> {
		await this.stores.get(SupportedTokensStore).supportToken(methodContext, tokenID);
		this.events.get(TokenIDSupportedEvent).log(methodContext, tokenID);
	}

	public async removeSupport(methodContext: MethodContext, tokenID: Buffer): Promise<void> {
		const [chainID] = splitTokenID(tokenID);

		const allTokensSupported = await this.stores
			.get(SupportedTokensStore)
			.has(methodContext, ALL_SUPPORTED_TOKENS_KEY);

		if (allTokensSupported) {
			throw new Error('All tokens are supported.');
		}

		if (tokenID.equals(this.getTokenIDLSK()) || chainID.equals(this._config.ownChainID)) {
			throw new Error('Cannot remove support for the specified token.');
		}

		const isChainSupported = await this.stores
			.get(SupportedTokensStore)
			.has(methodContext, chainID);

		if (!isChainSupported) {
			this.events.get(TokenIDSupportRemovedEvent).log(methodContext, tokenID);
			return;
		}

		const supportedTokens = await this.stores.get(SupportedTokensStore).get(methodContext, chainID);

		if (supportedTokens.supportedTokenIDs.length === 0) {
			throw new Error('All tokens from the specified chain are supported.');
		}

		const tokenIndex = supportedTokens.supportedTokenIDs.indexOf(tokenID);

		if (tokenIndex !== -1) {
			supportedTokens.supportedTokenIDs.splice(tokenIndex, 1);

			if (supportedTokens.supportedTokenIDs.length === 0) {
				await this.stores.get(SupportedTokensStore).del(methodContext, chainID);
			}
		}

		this.events.get(TokenIDSupportRemovedEvent).log(methodContext, tokenID);
	}

	public async getTotalSupply(
		context: MethodContext,
	): Promise<{ totalSupply: (SupplyStoreData & { tokenID: Buffer })[] }> {
		const supplyStore = this.stores.get(SupplyStore);
		const supplyData = await supplyStore.getAll(context);

		return {
			totalSupply: supplyData.map(({ key: tokenID, value: supply }) => ({
				tokenID,
				totalSupply: supply.totalSupply,
			})),
		};
	}

	public async escrowSubstoreExists(
		methodContext: MethodContext,
		chainID: Buffer,
		tokenID: Buffer,
	) {
		return this.stores
			.get(EscrowStore)
			.has(methodContext, this.stores.get(EscrowStore).getKey(chainID, tokenID));
	}
}
