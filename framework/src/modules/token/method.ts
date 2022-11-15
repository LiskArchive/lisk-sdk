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
	CCM_STATUS_OK,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	LOCAL_ID_LENGTH,
	TokenEventResult,
	MAX_DATA_LENGTH,
	CHAIN_ID_LENGTH,
} from './constants';
import { crossChainTransferMessageParams, UserStoreData } from './schemas';
import { InteroperabilityMethod, ModuleConfig } from './types';
import { splitTokenID } from './utils';
import { UserStore } from './stores/user';
import { EscrowStore } from './stores/escrow';
import { SupplyStore, SupplyStoreData } from './stores/supply';
import { NamedRegistry } from '../named_registry';
import { TransferEvent } from './events/transfer';
import { InitializeTokenEvent } from './events/initialize_token';
import { MintEvent } from './events/mint';
import { BurnEvent } from './events/burn';
import { InitializeUserAccountEvent } from './events/initialize_user_account';
import { InitializeEscrowAccountEvent } from './events/initialize_escrow_account';
import { LockEvent } from './events/lock';
import { UnlockEvent } from './events/unlock';
import { TransferCrossChainEvent } from './events/transfer_cross_chain';
import { SupportedTokensStore } from './stores/supported_tokens';
import { AllTokensSupportedEvent } from './events/all_tokens_supported';
import { AllTokensSupportRemovedEvent } from './events/all_tokens_supported_removed';
import { TokenIDSupportedEvent } from './events/token_id_supported';
import { AllTokensFromChainSupportedEvent } from './events/all_tokens_from_chain_supported';
import { AllTokensFromChainSupportRemovedEvent } from './events/all_tokens_from_chain_supported_removed';
import { TokenIDSupportRemovedEvent } from './events/token_id_supported_removed';

interface MethodConfig extends ModuleConfig {
	ownChainID: Buffer;
}

export class TokenMethod extends BaseMethod {
	private readonly _moduleName: string;
	private _config!: MethodConfig;
	private _interoperabilityMethod!: InteroperabilityMethod;

	public constructor(stores: NamedRegistry, events: NamedRegistry, moduleName: string) {
		super(stores, events);
		this._moduleName = moduleName;
	}

	public init(config: MethodConfig): void {
		this._config = config;
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod) {
		this._interoperabilityMethod = interoperabilityMethod;
	}

	public isNativeToken(tokenID: Buffer): boolean {
		const [chainID] = splitTokenID(tokenID);
		return chainID.equals(this._config.ownChainID);
	}

	public getMainchainTokenID(): Buffer {
		const networkID = this._config.ownChainID.slice(0, 1);
		// 3 bytes for remaining chainID bytes
		return Buffer.concat([networkID, Buffer.alloc(3 + LOCAL_ID_LENGTH, 0)]);
	}

	public async userAccountExists(
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
		const escrowStore = this.stores.get(EscrowStore);
		const escrowAccount = await escrowStore.get(
			methodContext,
			escrowStore.getKey(escrowChainID, tokenID),
		);
		return escrowAccount.amount;
	}

	public async initializeToken(methodContext: MethodContext): Promise<Buffer> {
		const supplyStore = this.stores.get(SupplyStore);
		const nextTokenID = await this._getNextTokenID(methodContext);

		await supplyStore.set(methodContext, nextTokenID, { totalSupply: BigInt(0) });

		this.events.get(InitializeTokenEvent).log(methodContext, { tokenID: nextTokenID });

		return nextTokenID;
	}

	public async mint(
		methodContext: MethodContext,
		address: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
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
		try {
			const userAccount = await userStore.get(methodContext, userStore.getKey(address, tokenID));
			userAccount.availableBalance += amount;
			await userStore.save(methodContext, address, tokenID, userAccount);
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events
					.get(MintEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_RECIPIENT_NOT_INITIALIZED);
			}
			throw error;
		}

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
		initPayingAddress: Buffer,
		initializationFee: bigint,
	): Promise<void> {
		const userStore = this.stores.get(UserStore);

		const userAccountExist = await this.userAccountExists(methodContext, address, tokenID);
		if (userAccountExist) {
			return;
		}
		const eventData = {
			address,
			tokenID,
			initPayingAddress,
			initializationFee,
		};
		if (initializationFee !== this._config.userAccountInitializationFee) {
			this.events
				.get(InitializeUserAccountEvent)
				.error(methodContext, eventData, TokenEventResult.INVALID_INITIALIZATION_FEE_VALUE);
			throw new Error(
				`Invalid initialization fee ${initializationFee.toString()}. Expected: ${this._config.userAccountInitializationFee.toString()}.`,
			);
		}

		const availableBanace = await this.getAvailableBalance(
			methodContext,
			initPayingAddress,
			this._config.feeTokenID,
		);
		if (availableBanace < initializationFee) {
			this.events
				.get(InitializeUserAccountEvent)
				.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
			throw new Error(
				`Insufficient balance ${availableBanace.toString()} to pay for initialization fee ${initializationFee.toString()}`,
			);
		}

		await this.burn(methodContext, initPayingAddress, this._config.feeTokenID, initializationFee);

		await userStore.createDefaultAccount(methodContext, address, tokenID);
		this.events.get(InitializeUserAccountEvent).log(methodContext, {
			address,
			tokenID,
			initPayingAddress,
			initializationFee: this._config.userAccountInitializationFee,
		});
	}

	public async initializeEscrowAccount(
		methodContext: MethodContext,
		chainID: Buffer,
		tokenID: Buffer,
		initPayingAddress: Buffer,
		initializationFee: bigint,
	): Promise<void> {
		if (!this.isNativeToken(tokenID)) {
			throw new Error(`TokenID ${tokenID.toString('hex')} is not native token.`);
		}
		const eventData = {
			chainID,
			tokenID,
			initPayingAddress,
			initializationFee,
		};

		const escrowStore = this.stores.get(EscrowStore);
		const escrowAccountExist = await escrowStore.has(
			methodContext,
			escrowStore.getKey(chainID, tokenID),
		);
		if (escrowAccountExist) {
			return;
		}

		if (initializationFee !== this._config.escrowAccountInitializationFee) {
			this.events
				.get(InitializeEscrowAccountEvent)
				.error(methodContext, eventData, TokenEventResult.INVALID_INITIALIZATION_FEE_VALUE);
			throw new Error(
				`Invalid initialization fee ${initializationFee.toString()}. Expected: ${this._config.escrowAccountInitializationFee.toString()}.`,
			);
		}

		const availableBanace = await this.getAvailableBalance(
			methodContext,
			initPayingAddress,
			this._config.feeTokenID,
		);
		if (availableBanace < initializationFee) {
			this.events
				.get(InitializeEscrowAccountEvent)
				.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
			throw new Error(
				`Insufficient balance ${availableBanace.toString()} to pay for initialization fee ${initializationFee.toString()}`,
			);
		}

		await this.burn(methodContext, initPayingAddress, this._config.feeTokenID, initializationFee);

		await escrowStore.createDefaultAccount(methodContext, chainID, tokenID);

		this.events.get(InitializeEscrowAccountEvent).log(methodContext, {
			chainID,
			tokenID,
			initPayingAddress,
			initializationFee: this._config.userAccountInitializationFee,
		});
	}

	public async transfer(
		methodContext: MethodContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void> {
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
		let recipientAccount: UserStoreData;
		try {
			recipientAccount = await userStore.get(
				methodContext,
				userStore.getKey(recipientAddress, tokenID),
			);
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events
					.get(TransferEvent)
					.error(methodContext, eventData, TokenEventResult.FAIL_RECIPIENT_NOT_INITIALIZED);
				throw new Error(
					`Recipient ${cryptoAddress.getLisk32AddressFromAddress(
						recipientAddress,
					)} does not have an account for the specified token ${tokenID.toString('hex')}`,
				);
			}
			throw error;
		}

		senderAccount.availableBalance -= amount;
		await userStore.save(methodContext, senderAddress, tokenID, senderAccount);
		recipientAccount.availableBalance += amount;
		await userStore.save(methodContext, recipientAddress, tokenID, recipientAccount);

		this.events.get(TransferEvent).log(methodContext, eventData);
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
		const eventData = {
			senderAddress,
			recipientAddress,
			tokenID,
			amount,
			receivingChainID,
			messageFee,
		};

		if (data.length > MAX_DATA_LENGTH) {
			this.events
				.get(TransferCrossChainEvent)
				.error(methodContext, eventData, TokenEventResult.DATA_TOO_LONG);
			throw new Error(`Maximum data allowed is ${MAX_DATA_LENGTH}, but received ${data.length}`);
		}
		const escrowStore = this.stores.get(EscrowStore);
		if (this.isNativeToken(tokenID)) {
			const escrowExist = await escrowStore.has(
				methodContext,
				escrowStore.getKey(receivingChainID, tokenID),
			);
			if (!escrowExist) {
				this.events
					.get(TransferCrossChainEvent)
					.error(methodContext, eventData, TokenEventResult.ESCROW_NOT_INITIALIZED);
				throw new Error(
					`Escrow account for receiving chain ${receivingChainID.toString(
						'hex',
					)} token ${tokenID.toString('hex')} is not initialized.`,
				);
			}
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
		const [mainchainID] = splitTokenID(this.getMainchainTokenID());

		if (
			![mainchainID, this._config.ownChainID, receivingChainID].some(id => id.equals(tokenChainID))
		) {
			this.events
				.get(TransferCrossChainEvent)
				.error(methodContext, eventData, TokenEventResult.INVALID_TOKEN_ID);
			throw new Error(
				`Invalid token ID ${tokenID.toString(
					'hex',
				)}. Token must be native to either the sending, the receiving chain or the mainchain.`,
			);
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
			CCM_STATUS_OK,
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
				.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
			throw new Error(
				`Address ${cryptoAddress.getLisk32AddressFromAddress(
					address,
				)} does not have locked balance for module ${module}`,
			);
		}
		if (account.lockedBalances[existingIndex].amount < amount) {
			this.events
				.get(UnlockEvent)
				.error(methodContext, eventData, TokenEventResult.FAIL_INSUFFICIENT_BALANCE);
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
		await this.stores.get(SupportedTokensStore).supportChain(methodContext, chainID);
		this.events.get(AllTokensFromChainSupportedEvent).log(methodContext, chainID);
	}

	public async removeAllTokensSupportFromChainID(
		methodContext: MethodContext,
		chainID: Buffer,
	): Promise<void> {
		await this.stores.get(SupportedTokensStore).removeSupportForChain(methodContext, chainID);
		this.events.get(AllTokensFromChainSupportRemovedEvent).log(methodContext, chainID);
	}

	public async supportTokenID(methodContext: MethodContext, tokenID: Buffer): Promise<void> {
		await this.stores.get(SupportedTokensStore).supportToken(methodContext, tokenID);
		this.events.get(TokenIDSupportedEvent).log(methodContext, tokenID);
	}

	public async removeSupportTokenID(methodContext: MethodContext, tokenID: Buffer): Promise<void> {
		await this.stores.get(SupportedTokensStore).removeSupportForToken(methodContext, tokenID);
		this.events.get(TokenIDSupportRemovedEvent).log(methodContext, tokenID);
	}

	private async _getNextTokenID(context: MethodContext): Promise<Buffer> {
		const supplyStore = this.stores.get(SupplyStore);
		const allSupplies = await supplyStore.getAll(context);
		if (allSupplies.length === 0) {
			return Buffer.concat([this._config.ownChainID, Buffer.alloc(LOCAL_ID_LENGTH, 0)]);
		}
		const maxLocalID = allSupplies.reduce((prev, curr) => {
			const currentID = curr.key.slice(CHAIN_ID_LENGTH).readUInt32BE(0);
			if (currentID > prev) {
				return currentID;
			}
			return prev;
		}, 0);

		if (maxLocalID === 2 ** (8 * LOCAL_ID_LENGTH) - 1) {
			this.events
				.get(InitializeTokenEvent)
				.error(context, { tokenID: Buffer.alloc(0) }, TokenEventResult.MAX_AVAILABLE_ID_REACHED);
			throw new Error('No available token ID');
		}

		const nextLocalID = Buffer.alloc(4);
		nextLocalID.writeUInt32BE(maxLocalID + 1, 0);
		const nextTokenID = Buffer.concat([this._config.ownChainID, nextLocalID]);
		return nextTokenID;
	}
}
