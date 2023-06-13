/*
 * Copyright © 2023 Lisk Foundation
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

import { BaseMethod } from '../base_method';
import { FeeMethod, InteroperabilityMethod, ModuleConfig, TokenMethod } from './types';
import { NFTAttributes, NFTStore } from './stores/nft';
import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import {
	ALL_SUPPORTED_NFTS_KEY,
	FEE_CREATE_NFT,
	LENGTH_CHAIN_ID,
	LENGTH_COLLECTION_ID,
	LENGTH_NFT_ID,
	MAX_LENGTH_DATA,
	NFT_NOT_LOCKED,
	NftEventResult,
} from './constants';
import { UserStore } from './stores/user';
import { DestroyEvent } from './events/destroy';
import { SupportedNFTsStore } from './stores/supported_nfts';
import { CreateEvent } from './events/create';
import { LockEvent } from './events/lock';
import { TransferEvent } from './events/transfer';
import { InternalMethod } from './internal_method';
import { TransferCrossChainEvent } from './events/transfer_cross_chain';

export class NFTMethod extends BaseMethod {
	private _config!: ModuleConfig;
	private _interoperabilityMethod!: InteroperabilityMethod;
	private _internalMethod!: InternalMethod;
	private _feeMethod!: FeeMethod;
	private _tokenMethod!: TokenMethod;

	public init(config: ModuleConfig): void {
		this._config = config;
	}

	public addDependencies(
		interoperabilityMethod: InteroperabilityMethod,
		internalMethod: InternalMethod,
		feeMethod: FeeMethod,
		tokenMethod: TokenMethod,
	) {
		this._interoperabilityMethod = interoperabilityMethod;
		this._internalMethod = internalMethod;
		this._feeMethod = feeMethod;
		this._tokenMethod = tokenMethod;
	}

	public getChainID(nftID: Buffer): Buffer {
		if (nftID.length !== LENGTH_NFT_ID) {
			throw new Error(`NFT ID must have length ${LENGTH_NFT_ID}`);
		}

		return nftID.slice(0, LENGTH_CHAIN_ID);
	}

	public async getNFTOwner(methodContext: ImmutableMethodContext, nftID: Buffer): Promise<Buffer> {
		const nftStore = this.stores.get(NFTStore);

		const nftExists = await nftStore.has(methodContext, nftID);

		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}

		const data = await nftStore.get(methodContext, nftID);

		return data.owner;
	}

	public async getLockingModule(
		methodContext: ImmutableMethodContext,
		nftID: Buffer,
	): Promise<string> {
		const owner = await this.getNFTOwner(methodContext, nftID);

		if (owner.length === LENGTH_CHAIN_ID) {
			throw new Error('NFT is escrowed to another chain');
		}

		const userStore = this.stores.get(UserStore);
		const userData = await userStore.get(methodContext, userStore.getKey(owner, nftID));

		return userData.lockingModule;
	}

	public async destroy(
		methodContext: MethodContext,
		address: Buffer,
		nftID: Buffer,
	): Promise<void> {
		const nftStore = this.stores.get(NFTStore);

		const nftExists = await nftStore.has(methodContext, nftID);

		if (!nftExists) {
			this.events.get(DestroyEvent).error(
				methodContext,
				{
					address,
					nftID,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);

			throw new Error('NFT substore entry does not exist');
		}

		const owner = await this.getNFTOwner(methodContext, nftID);

		if (owner.length === LENGTH_CHAIN_ID) {
			this.events.get(DestroyEvent).error(
				methodContext,
				{
					address,
					nftID,
				},
				NftEventResult.RESULT_NFT_ESCROWED,
			);

			throw new Error('NFT is escrowed to another chain');
		}

		if (!owner.equals(address)) {
			this.events.get(DestroyEvent).error(
				methodContext,
				{
					address,
					nftID,
				},
				NftEventResult.RESULT_INITIATED_BY_NONOWNER,
			);

			throw new Error('Not initiated by the NFT owner');
		}

		const userStore = this.stores.get(UserStore);
		const userKey = userStore.getKey(owner, nftID);
		const { lockingModule } = await userStore.get(methodContext, userKey);

		if (lockingModule !== NFT_NOT_LOCKED) {
			this.events.get(DestroyEvent).error(
				methodContext,
				{
					address,
					nftID,
				},
				NftEventResult.RESULT_NFT_LOCKED,
			);

			throw new Error('Locked NFTs cannot be destroyed');
		}

		await nftStore.del(methodContext, nftID);

		await userStore.del(methodContext, userKey);

		this.events.get(DestroyEvent).log(methodContext, {
			address,
			nftID,
		});
	}

	public async getCollectionID(methodContext: MethodContext, nftID: Buffer): Promise<Buffer> {
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(methodContext, nftID);
		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}
		return nftID.slice(LENGTH_CHAIN_ID, LENGTH_CHAIN_ID + LENGTH_COLLECTION_ID);
	}

	public async isNFTSupported(methodContext: MethodContext, nftID: Buffer): Promise<boolean> {
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(methodContext, nftID);
		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}

		const nftChainID = this.getChainID(nftID);
		if (nftChainID.equals(this._config.ownChainID)) {
			return true;
		}

		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);
		const supportForAllKeysExists = await supportedNFTsStore.has(
			methodContext,
			ALL_SUPPORTED_NFTS_KEY,
		);
		if (supportForAllKeysExists) {
			return true;
		}

		const supportForNftChainIdExists = await supportedNFTsStore.has(methodContext, nftChainID);
		if (supportForNftChainIdExists) {
			const supportedNFTsStoreData = await supportedNFTsStore.get(methodContext, nftChainID);
			if (supportedNFTsStoreData.supportedCollectionIDArray.length === 0) {
				return true;
			}
			const collectionID = await this.getCollectionID(methodContext, nftID);
			if (
				supportedNFTsStoreData.supportedCollectionIDArray.some(id =>
					collectionID.equals(id.collectionID),
				)
			) {
				return true;
			}
		}

		return false;
	}

	public async getAttributesArray(
		methodContext: MethodContext,
		nftID: Buffer,
	): Promise<NFTAttributes[]> {
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(methodContext, nftID);
		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}

		const storeData = await nftStore.get(methodContext, nftID);
		return storeData.attributesArray;
	}

	public async getAttributes(
		methodContext: MethodContext,
		module: string,
		nftID: Buffer,
	): Promise<Buffer> {
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(methodContext, nftID);
		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}

		const storeData = await nftStore.get(methodContext, nftID);

		for (const nftAttributes of storeData.attributesArray) {
			if (nftAttributes.module === module) {
				return nftAttributes.attributes;
			}
		}

		throw new Error('Specific module did not set any attributes.');
	}

	public async getNextAvailableIndex(
		methodContext: MethodContext,
		collectionID: Buffer,
	): Promise<number> {
		const nftStore = this.stores.get(NFTStore);
		const nftStoreData = await nftStore.iterate(methodContext, {
			gte: Buffer.alloc(LENGTH_NFT_ID, 0),
			lte: Buffer.alloc(LENGTH_NFT_ID, 255),
		});

		let count = 0;
		for (const { key } of nftStoreData) {
			if (key.slice(LENGTH_CHAIN_ID, LENGTH_CHAIN_ID + LENGTH_COLLECTION_ID).equals(collectionID)) {
				count += 1;
			}
		}

		return count;
	}

	public async create(
		methodContext: MethodContext,
		address: Buffer,
		collectionID: Buffer,
		attributesArray: NFTAttributes[],
	): Promise<void> {
		const index = await this.getNextAvailableIndex(methodContext, collectionID);
		const nftID = Buffer.concat([
			this._config.ownChainID,
			collectionID,
			Buffer.from(index.toString()),
		]);
		this._feeMethod.payFee(methodContext, BigInt(FEE_CREATE_NFT));

		const nftStore = this.stores.get(NFTStore);
		await nftStore.save(methodContext, nftID, {
			owner: address,
			attributesArray,
		});

		const userStore = this.stores.get(UserStore);
		await userStore.set(methodContext, userStore.getKey(address, nftID), {
			lockingModule: NFT_NOT_LOCKED,
		});

		this.events.get(CreateEvent).log(methodContext, {
			address,
			nftID,
			collectionID,
		});
	}

	public async lock(methodContext: MethodContext, module: string, nftID: Buffer): Promise<void> {
		const nftStore = this.stores.get(NFTStore);

		const nftExists = await nftStore.has(methodContext, nftID);

		if (!nftExists) {
			this.events.get(LockEvent).error(
				methodContext,
				{
					module,
					nftID,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);

			throw new Error('NFT substore entry does not exist');
		}

		const owner = await this.getNFTOwner(methodContext, nftID);

		if (owner.length === LENGTH_CHAIN_ID) {
			this.events.get(LockEvent).error(
				methodContext,
				{
					module,
					nftID,
				},
				NftEventResult.RESULT_NFT_ESCROWED,
			);

			throw new Error('NFT is escrowed to another chain');
		}

		const userStore = this.stores.get(UserStore);
		const userKey = userStore.getKey(owner, nftID);
		const userData = await userStore.get(methodContext, userKey);

		if (userData.lockingModule !== NFT_NOT_LOCKED) {
			this.events.get(LockEvent).error(
				methodContext,
				{
					module,
					nftID,
				},
				NftEventResult.RESULT_NFT_LOCKED,
			);

			throw new Error('NFT is already locked');
		}

		userData.lockingModule = module;

		await userStore.set(methodContext, userKey, userData);

		this.events.get(LockEvent).log(methodContext, {
			module,
			nftID,
		});
	}

	public async unlock(methodContext: MethodContext, module: string, nftID: Buffer): Promise<void> {
		const nftStore = this.stores.get(NFTStore);

		const nftExists = await nftStore.has(methodContext, nftID);

		if (!nftExists) {
			this.events.get(LockEvent).error(
				methodContext,
				{
					module,
					nftID,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);

			throw new Error('NFT substore entry does not exist');
		}

		const nftData = await nftStore.get(methodContext, nftID);

		if (nftData.owner.length === LENGTH_CHAIN_ID) {
			throw new Error('NFT is escrowed to another chain');
		}

		const userStore = this.stores.get(UserStore);
		const userKey = userStore.getKey(nftData.owner, nftID);
		const userData = await userStore.get(methodContext, userKey);

		if (userData.lockingModule === NFT_NOT_LOCKED) {
			this.events.get(LockEvent).error(
				methodContext,
				{
					module,
					nftID,
				},
				NftEventResult.RESULT_NFT_NOT_LOCKED,
			);

			throw new Error('NFT is not locked');
		}

		if (userData.lockingModule !== module) {
			this.events.get(LockEvent).error(
				methodContext,
				{
					module,
					nftID,
				},
				NftEventResult.RESULT_UNAUTHORIZED_UNLOCK,
			);

			throw new Error('Unlocking NFT via module that did not lock it');
		}

		userData.lockingModule = NFT_NOT_LOCKED;

		await userStore.set(methodContext, userKey, userData);

		this.events.get(LockEvent).log(methodContext, {
			module,
			nftID,
		});
	}

	public async transfer(
		methodContext: MethodContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		nftID: Buffer,
	): Promise<void> {
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(methodContext, nftID);
		if (!nftExists) {
			this.events.get(TransferEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					nftID,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
			throw new Error('NFT substore entry does not exist');
		}

		const owner = await this.getNFTOwner(methodContext, nftID);
		if (owner.length === LENGTH_CHAIN_ID) {
			this.events.get(TransferEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					nftID,
				},
				NftEventResult.RESULT_NFT_ESCROWED,
			);
			throw new Error('NFT is escrowed to another chain');
		}

		if (!owner.equals(senderAddress)) {
			this.events.get(TransferEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					nftID,
				},
				NftEventResult.RESULT_INITIATED_BY_NONOWNER,
			);
			throw new Error('Transfer not initiated by the NFT owner');
		}

		const userStore = this.stores.get(UserStore);
		const userData = await userStore.get(methodContext, userStore.getKey(owner, nftID));
		if (userData.lockingModule !== NFT_NOT_LOCKED) {
			this.events.get(TransferEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					nftID,
				},
				NftEventResult.RESULT_NFT_LOCKED,
			);
			throw new Error('Locked NFTs cannot be transferred');
		}

		await this._internalMethod.transferInternal(methodContext, recipientAddress, nftID);
	}

	public async transferCrossChain(
		methodContext: MethodContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		nftID: Buffer,
		receivingChainID: Buffer,
		messageFee: bigint,
		data: string,
		includeAttributes: boolean,
	): Promise<void> {
		if (data.length > MAX_LENGTH_DATA) {
			this.events.get(TransferCrossChainEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_DATA_TOO_LONG,
			);
			throw new Error('Data field is too long');
		}

		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(methodContext, nftID);
		if (!nftExists) {
			this.events.get(TransferCrossChainEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
			throw new Error('NFT substore entry does not exist');
		}

		const owner = await this.getNFTOwner(methodContext, nftID);
		if (owner.length === LENGTH_CHAIN_ID) {
			this.events.get(TransferCrossChainEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_NFT_ESCROWED,
			);
			throw new Error('NFT is escrowed to another chain');
		}

		if (!owner.equals(senderAddress)) {
			this.events.get(TransferCrossChainEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_INITIATED_BY_NONOWNER,
			);
			throw new Error('Transfer not initiated by the NFT owner');
		}

		const userStore = this.stores.get(UserStore);
		const userData = await userStore.get(methodContext, userStore.getKey(owner, nftID));
		if (userData.lockingModule !== NFT_NOT_LOCKED) {
			this.events.get(TransferCrossChainEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_NFT_LOCKED,
			);
			throw new Error('Locked NFTs cannot be transferred');
		}

		const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
			methodContext,
			receivingChainID,
		);
		const availableBalance = await this._tokenMethod.getAvailableBalance(
			methodContext,
			senderAddress,
			messageFeeTokenID,
		);
		if (availableBalance < messageFee) {
			this.events.get(TransferCrossChainEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_INSUFFICIENT_BALANCE,
			);
			throw new Error('Insufficient balance for the message fee');
		}

		await this._internalMethod.transferCrossChainInternal(
			methodContext,
			senderAddress,
			recipientAddress,
			nftID,
			receivingChainID,
			messageFee,
			data,
			includeAttributes,
		);
	}
}
