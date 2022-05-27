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

import { NotFoundError } from '@liskhq/lisk-chain';
import { MAX_UINT64 } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { ImmutableAPIContext, APIContext, ImmutableSubStore } from '../../node/state_machine';
import { BaseAPI } from '../base_api';
import {
	ADDRESS_LENGTH,
	CCM_STATUS_OK,
	CHAIN_ID_ALIAS_NATIVE,
	EMPTY_BYTES,
	LOCAL_ID_LENGTH,
	STORE_PREFIX_AVAILABLE_LOCAL_ID,
	CROSS_CHAIN_COMMAND_ID_FORWARD,
	CROSS_CHAIN_COMMAND_ID_TRANSFER,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_SUPPLY,
	STORE_PREFIX_USER,
	TOKEN_ID_LENGTH,
	TOKEN_ID_LSK,
} from './constants';
import {
	AvailableLocalIDStoreData,
	availableLocalIDStoreSchema,
	crossChainForwardMessageParams,
	crossChainTransferMessageParams,
	EscrowStoreData,
	escrowStoreSchema,
	SupplyStoreData,
	supplyStoreSchema,
	UserStoreData,
	userStoreSchema,
} from './schemas';
import { InteroperabilityAPI, MinBalance, TokenID } from './types';
import { addEscrowAmount, getNativeTokenID, getUserStoreKey, splitTokenID } from './utils';

export class TokenAPI extends BaseAPI {
	private _minBalances!: MinBalance[];
	private _interoperabilityAPI!: InteroperabilityAPI;

	public init(args: { minBalances: MinBalance[] }): void {
		this._minBalances = args.minBalances;
	}

	public addDependencies(interoperabilityAPI: InteroperabilityAPI) {
		this._interoperabilityAPI = interoperabilityAPI;
	}

	public async getAvailableBalance(
		apiContext: ImmutableAPIContext,
		address: Buffer,
		tokenID: TokenID,
	): Promise<bigint> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		try {
			const user = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(address, canonicalTokenID),
				userStoreSchema,
			);
			return user.availableBalance;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return BigInt(0);
		}
	}

	public async getLockedAmount(
		apiContext: ImmutableAPIContext,
		address: Buffer,
		tokenID: TokenID,
		moduleID: number,
	): Promise<bigint> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		try {
			const user = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(address, canonicalTokenID),
				userStoreSchema,
			);
			return user.lockedBalances.find(lb => lb.moduleID === moduleID)?.amount ?? BigInt(0);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return BigInt(0);
		}
	}

	public async getEscrowedAmount(
		apiContext: ImmutableAPIContext,
		escrowChainID: Buffer,
		tokenID: TokenID,
	): Promise<bigint> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		const isNative = await this.isNative(apiContext, canonicalTokenID);
		if (!isNative) {
			throw new Error('Only native token can have escrow amount.');
		}
		const [, localID] = splitTokenID(tokenID);
		const escrowStore = apiContext.getStore(this.moduleID, STORE_PREFIX_ESCROW);
		try {
			const { amount } = await escrowStore.getWithSchema<EscrowStoreData>(
				Buffer.concat([escrowChainID, localID]),
				escrowStoreSchema,
			);
			return amount;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return BigInt(0);
		}
	}

	public async accountExists(apiContext: ImmutableAPIContext, address: Buffer): Promise<boolean> {
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		return this._accountExist(userStore, address);
	}

	public async getNextAvailableLocalID(apiContext: ImmutableAPIContext): Promise<Buffer> {
		const nextAvailableLocalIDStore = apiContext.getStore(
			this.moduleID,
			STORE_PREFIX_AVAILABLE_LOCAL_ID,
		);
		const {
			nextAvailableLocalID,
		} = await nextAvailableLocalIDStore.getWithSchema<AvailableLocalIDStoreData>(
			EMPTY_BYTES,
			availableLocalIDStoreSchema,
		);

		return nextAvailableLocalID;
	}

	public async initializeToken(apiContext: APIContext, localID: Buffer): Promise<void> {
		const supplyStore = apiContext.getStore(this.moduleID, STORE_PREFIX_SUPPLY);
		const supplyExist = await supplyStore.has(localID);
		if (supplyExist) {
			throw new Error('Token is already initialized.');
		}
		await supplyStore.setWithSchema(localID, { totalSupply: BigInt(0) }, supplyStoreSchema);

		const nextAvailableLocalIDStore = apiContext.getStore(
			this.moduleID,
			STORE_PREFIX_AVAILABLE_LOCAL_ID,
		);
		const {
			nextAvailableLocalID,
		} = await nextAvailableLocalIDStore.getWithSchema<AvailableLocalIDStoreData>(
			EMPTY_BYTES,
			availableLocalIDStoreSchema,
		);
		if (localID.compare(nextAvailableLocalID) >= 0) {
			const newAvailableLocalID = Buffer.alloc(LOCAL_ID_LENGTH);
			newAvailableLocalID.writeUInt32BE(localID.readUInt32BE(0) + 1, 0);
			await nextAvailableLocalIDStore.setWithSchema(
				EMPTY_BYTES,
				{ nextAvailableLocalID: newAvailableLocalID },
				availableLocalIDStoreSchema,
			);
		}
	}

	public async mint(
		apiContext: APIContext,
		address: Buffer,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		const isNative = await this.isNative(apiContext, canonicalTokenID);
		if (!isNative) {
			throw new Error('Only native token can be minted.');
		}
		if (amount < BigInt(0)) {
			throw new Error('Amount must be a positive integer to mint.');
		}
		const [, localID] = splitTokenID(canonicalTokenID);
		const supplyStore = apiContext.getStore(this.moduleID, STORE_PREFIX_SUPPLY);
		const supplyExist = await supplyStore.has(localID);
		if (!supplyExist) {
			throw new Error(`LocalID ${localID.toString('hex')} is not initialized to mint.`);
		}
		const supply = await supplyStore.getWithSchema<SupplyStoreData>(localID, supplyStoreSchema);
		if (supply.totalSupply > MAX_UINT64 - amount) {
			throw new Error(`Supply cannot exceed MAX_UINT64 ${MAX_UINT64.toString()}.`);
		}

		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const recipientExist = await this._accountExist(userStore, address);

		const minBalance = this._getMinBalance(canonicalTokenID);
		let receivedAmount = amount;
		if (!recipientExist) {
			if (!minBalance) {
				throw new Error(
					`Address cannot be initialized because min balance is not set for TokenID ${canonicalTokenID.toString(
						'hex',
					)}.`,
				);
			}
			if (minBalance > receivedAmount) {
				throw new Error(
					`Amount ${receivedAmount.toString()} does not satisfy min balance requirement.`,
				);
			}
			receivedAmount -= minBalance;
		}

		let recipient: UserStoreData;
		try {
			recipient = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(address, canonicalTokenID),
				userStoreSchema,
			);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			recipient = {
				availableBalance: BigInt(0),
				lockedBalances: [],
			};
		}
		recipient.availableBalance += receivedAmount;
		await userStore.setWithSchema(
			getUserStoreKey(address, canonicalTokenID),
			recipient,
			userStoreSchema,
		);
		supply.totalSupply += receivedAmount;
		await supplyStore.setWithSchema(localID, supply, supplyStoreSchema);
	}

	public async burn(
		apiContext: APIContext,
		address: Buffer,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		const isNative = await this.isNative(apiContext, canonicalTokenID);
		if (!isNative) {
			throw new Error('Only native token can be burnt.');
		}
		if (amount < BigInt(0)) {
			throw new Error('Amount must be a positive integer to burn.');
		}
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const sender = await userStore.getWithSchema<UserStoreData>(
			getUserStoreKey(address, canonicalTokenID),
			userStoreSchema,
		);
		if (sender.availableBalance < amount) {
			throw new Error(
				`Sender ${address.toString(
					'hex',
				)} balance ${sender.availableBalance.toString()} is not sufficient for ${amount.toString()}`,
			);
		}
		sender.availableBalance -= amount;
		await userStore.setWithSchema(
			getUserStoreKey(address, canonicalTokenID),
			sender,
			userStoreSchema,
		);

		const supplyStore = apiContext.getStore(this.moduleID, STORE_PREFIX_SUPPLY);
		const [, localID] = splitTokenID(canonicalTokenID);
		const supply = await supplyStore.getWithSchema<SupplyStoreData>(localID, supplyStoreSchema);
		supply.totalSupply -= amount;
		await supplyStore.setWithSchema(localID, supply, supplyStoreSchema);
	}

	public async transfer(
		apiContext: APIContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const sender = await userStore.getWithSchema<UserStoreData>(
			getUserStoreKey(senderAddress, canonicalTokenID),
			userStoreSchema,
		);
		if (sender.availableBalance < amount) {
			throw new Error(
				`Sender ${senderAddress.toString(
					'hex',
				)} balance ${sender.availableBalance.toString()} is not sufficient for ${amount.toString()}`,
			);
		}
		sender.availableBalance -= amount;
		await userStore.setWithSchema(
			getUserStoreKey(senderAddress, canonicalTokenID),
			sender,
			userStoreSchema,
		);

		const recipientExist = await this._accountExist(userStore, recipientAddress);

		const minBalance = this._getMinBalance(canonicalTokenID);
		let receivedAmount = amount;
		if (!recipientExist) {
			if (!minBalance) {
				throw new Error(
					`Address cannot be initialized because min balance is not set for TokenID ${canonicalTokenID.toString(
						'hex',
					)}.`,
				);
			}
			if (minBalance > receivedAmount) {
				throw new Error(
					`Amount ${receivedAmount.toString()} does not satisfy min balance requirement.`,
				);
			}
			receivedAmount -= minBalance;
			const [chainID] = splitTokenID(canonicalTokenID);
			if (chainID.equals(CHAIN_ID_ALIAS_NATIVE)) {
				const supplyStore = apiContext.getStore(this.moduleID, STORE_PREFIX_SUPPLY);
				const [, localID] = splitTokenID(canonicalTokenID);
				const supply = await supplyStore.getWithSchema<SupplyStoreData>(localID, supplyStoreSchema);
				supply.totalSupply -= minBalance;
				await supplyStore.setWithSchema(localID, supply, supplyStoreSchema);
			}
		}

		let recipient: UserStoreData;
		try {
			recipient = await userStore.getWithSchema<UserStoreData>(
				getUserStoreKey(recipientAddress, canonicalTokenID),
				userStoreSchema,
			);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			recipient = {
				availableBalance: BigInt(0),
				lockedBalances: [],
			};
		}
		recipient.availableBalance += receivedAmount;
		await userStore.setWithSchema(
			getUserStoreKey(recipientAddress, canonicalTokenID),
			recipient,
			userStoreSchema,
		);
	}

	public async lock(
		apiContext: APIContext,
		address: Buffer,
		moduleID: number,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		if (amount < BigInt(0)) {
			throw new Error('Amount must be a positive integer to lock.');
		}
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const user = await userStore.getWithSchema<UserStoreData>(
			getUserStoreKey(address, canonicalTokenID),
			userStoreSchema,
		);
		if (user.availableBalance < amount) {
			throw new Error(
				`User ${address.toString(
					'hex',
				)} balance ${user.availableBalance.toString()} is not sufficient for ${amount.toString()}`,
			);
		}
		user.availableBalance -= amount;
		const existingIndex = user.lockedBalances.findIndex(b => b.moduleID === moduleID);
		if (existingIndex > -1) {
			const locked = user.lockedBalances[existingIndex].amount + amount;
			user.lockedBalances[existingIndex] = {
				moduleID,
				amount: locked,
			};
		} else {
			user.lockedBalances.push({
				moduleID,
				amount,
			});
		}
		user.lockedBalances.sort((a, b) => a.moduleID - b.moduleID);
		await userStore.setWithSchema(
			getUserStoreKey(address, canonicalTokenID),
			user,
			userStoreSchema,
		);
	}

	public async unlock(
		apiContext: APIContext,
		address: Buffer,
		moduleID: number,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		if (amount < BigInt(0)) {
			throw new Error('Amount must be a positive integer to unlock.');
		}

		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const user = await userStore.getWithSchema<UserStoreData>(
			getUserStoreKey(address, canonicalTokenID),
			userStoreSchema,
		);
		const lockedIndex = user.lockedBalances.findIndex(b => b.moduleID === moduleID);
		if (lockedIndex < 0) {
			throw new Error(`No balance is locked for module ID ${moduleID}`);
		}
		const lockedObj = user.lockedBalances[lockedIndex];
		if (lockedObj.amount < amount) {
			throw new Error(
				`Not enough amount is locked for module ${moduleID} to unlock ${amount.toString()}`,
			);
		}
		lockedObj.amount -= amount;
		user.availableBalance += amount;
		if (lockedObj.amount !== BigInt(0)) {
			user.lockedBalances[lockedIndex] = lockedObj;
		} else {
			user.lockedBalances.splice(lockedIndex, 1);
		}
		await userStore.setWithSchema(
			getUserStoreKey(address, canonicalTokenID),
			user,
			userStoreSchema,
		);
	}

	public async isNative(apiContext: ImmutableAPIContext, tokenID: TokenID): Promise<boolean> {
		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		const [chainID] = splitTokenID(canonicalTokenID);
		return chainID.equals(CHAIN_ID_ALIAS_NATIVE);
	}

	public async transferCrossChain(
		apiContext: APIContext,
		senderAddress: Buffer,
		receivingChainID: Buffer,
		recipientAddress: Buffer,
		tokenID: Buffer,
		amount: bigint,
		messageFee: bigint,
		data: string,
	): Promise<void> {
		if (amount < BigInt(0)) {
			throw new Error('Amount must be greater or equal to zero.');
		}
		if (senderAddress.length !== ADDRESS_LENGTH) {
			throw new Error(`Invalid sender address ${senderAddress.toString('hex')}.`);
		}
		if (recipientAddress.length !== ADDRESS_LENGTH) {
			throw new Error(`Invalid recipient address ${recipientAddress.toString('hex')}.`);
		}

		const canonicalTokenID = await this.getCanonicalTokenID(apiContext, tokenID);
		const userStore = apiContext.getStore(this.moduleID, STORE_PREFIX_USER);
		const sender = await userStore.getWithSchema<UserStoreData>(
			getUserStoreKey(senderAddress, canonicalTokenID),
			userStoreSchema,
		);

		if (sender.availableBalance < amount) {
			throw new Error(
				`Sender ${senderAddress.toString(
					'hex',
				)} balance ${sender.availableBalance.toString()} is not sufficient for ${amount.toString()}`,
			);
		}
		const [chainID, localID] = splitTokenID(canonicalTokenID);

		const [LSK_CHAIN_ID] = splitTokenID(TOKEN_ID_LSK);
		const possibleChainIDs = [CHAIN_ID_ALIAS_NATIVE, receivingChainID, LSK_CHAIN_ID];
		const isAllowed = possibleChainIDs.some(id => id.equals(chainID));
		if (!isAllowed) {
			throw new Error(`Invalid chain id ${chainID.toString('hex')} for transfer cross chain.`);
		}
		let newTokenID: Buffer;
		if (CHAIN_ID_ALIAS_NATIVE.equals(chainID)) {
			const { id: ownChainID } = await this._interoperabilityAPI.getOwnChainAccount(apiContext);
			newTokenID = Buffer.concat([ownChainID, localID]);
		} else {
			newTokenID = tokenID;
		}

		if ([CHAIN_ID_ALIAS_NATIVE, receivingChainID].some(id => id.equals(chainID))) {
			const message = codec.encode(crossChainTransferMessageParams, {
				tokenID: newTokenID,
				amount,
				senderAddress,
				recipientAddress,
				data,
			});
			const sendResult = await this._interoperabilityAPI.send(
				apiContext,
				senderAddress,
				this.moduleID,
				CROSS_CHAIN_COMMAND_ID_TRANSFER,
				receivingChainID,
				messageFee,
				CCM_STATUS_OK,
				message,
			);
			if (!sendResult) {
				return;
			}
			sender.availableBalance -= amount;
			await userStore.setWithSchema(
				getUserStoreKey(senderAddress, canonicalTokenID),
				sender,
				userStoreSchema,
			);
			if (chainID.equals(CHAIN_ID_ALIAS_NATIVE)) {
				await addEscrowAmount(apiContext, this.moduleID, receivingChainID, localID, amount);
			}
			return;
		}
		if (sender.availableBalance < amount + messageFee) {
			throw new Error(
				`Sender ${senderAddress.toString(
					'hex',
				)} balance ${sender.availableBalance.toString()} is not sufficient for ${(
					amount + messageFee
				).toString()}`,
			);
		}
		const message = codec.encode(crossChainForwardMessageParams, {
			tokenID,
			amount,
			senderAddress,
			forwardToChainID: receivingChainID,
			recipientAddress,
			data,
			forwardedMessageFee: messageFee,
		});
		const sendResult = await this._interoperabilityAPI.send(
			apiContext,
			senderAddress,
			this.moduleID,
			CROSS_CHAIN_COMMAND_ID_FORWARD,
			chainID,
			BigInt(0),
			CCM_STATUS_OK,
			message,
		);
		if (!sendResult) {
			return;
		}
		sender.availableBalance -= amount + messageFee;
		await userStore.setWithSchema(
			getUserStoreKey(senderAddress, canonicalTokenID),
			sender,
			userStoreSchema,
		);
	}

	public async getCanonicalTokenID(
		apiContext: ImmutableAPIContext,
		tokenID: TokenID,
	): Promise<TokenID> {
		const [chainID] = splitTokenID(tokenID);
		// tokenID is already canonical
		if (chainID.equals(CHAIN_ID_ALIAS_NATIVE)) {
			return tokenID;
		}
		const { id } = await this._interoperabilityAPI.getOwnChainAccount(apiContext);
		if (chainID.equals(id)) {
			return getNativeTokenID(tokenID);
		}
		return tokenID;
	}

	private _getMinBalance(tokenID: TokenID): bigint | undefined {
		const minBalance = this._minBalances.find(mb => mb.tokenID.equals(tokenID));
		return minBalance?.amount;
	}

	private async _accountExist(userStore: ImmutableSubStore, address: Buffer): Promise<boolean> {
		const allUserData = await userStore.iterate({
			start: Buffer.concat([address, Buffer.alloc(TOKEN_ID_LENGTH, 0)]),
			end: Buffer.concat([address, Buffer.alloc(TOKEN_ID_LENGTH, 255)]),
		});
		return allUserData.length !== 0;
	}
}
