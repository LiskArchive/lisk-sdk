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

import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { BaseMethod } from '../base_method';
import { FeeMethod, InteroperabilityMethod, ModuleConfig, TokenMethod } from './types';
import { NFTAttributes, NFTStore, NFTStoreData, nftStoreSchema } from './stores/nft';
import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import {
	ALL_SUPPORTED_NFTS_KEY,
	FEE_CREATE_NFT,
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	LENGTH_COLLECTION_ID,
	LENGTH_INDEX,
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
import { AllNFTsSupportedEvent } from './events/all_nfts_supported';
import { AllNFTsSupportRemovedEvent } from './events/all_nfts_support_removed';
import { AllNFTsFromChainSupportedEvent } from './events/all_nfts_from_chain_suported';
import { AllNFTsFromCollectionSupportedEvent } from './events/all_nfts_from_collection_suppported';
import { AllNFTsFromCollectionSupportRemovedEvent } from './events/all_nfts_from_collection_support_removed';
import { AllNFTsFromChainSupportRemovedEvent } from './events/all_nfts_from_chain_support_removed';
import { RecoverEvent } from './events/recover';
import { EscrowStore } from './stores/escrow';
import { SetAttributesEvent } from './events/set_attributes';

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

		return nftID.subarray(0, LENGTH_CHAIN_ID);
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

	public getCollectionID(nftID: Buffer): Buffer {
		return nftID.subarray(LENGTH_CHAIN_ID, LENGTH_CHAIN_ID + LENGTH_COLLECTION_ID);
	}

	public async isNFTSupported(
		methodContext: ImmutableMethodContext,
		nftID: Buffer,
	): Promise<boolean> {
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
			const collectionID = this.getCollectionID(nftID);
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
	): Promise<bigint> {
		const nftStore = this.stores.get(NFTStore);

		const nftStoreData = await nftStore.iterate(methodContext, {
			gte: Buffer.concat([this._config.ownChainID, collectionID, Buffer.alloc(LENGTH_INDEX, 0)]),
			lte: Buffer.concat([this._config.ownChainID, collectionID, Buffer.alloc(LENGTH_INDEX, 255)]),
		});

		if (nftStoreData.length === 0) {
			return BigInt(0);
		}

		const latestKey = nftStoreData[nftStoreData.length - 1].key;
		const indexBytes = latestKey.subarray(LENGTH_CHAIN_ID + LENGTH_COLLECTION_ID, LENGTH_NFT_ID);
		const index = indexBytes.readBigUInt64BE();
		const largestIndex = BigInt(BigInt(2 ** 64) - BigInt(1));

		if (index === largestIndex) {
			throw new Error('No more available indexes');
		}

		return index + BigInt(1);
	}

	public async create(
		methodContext: MethodContext,
		address: Buffer,
		collectionID: Buffer,
		attributesArray: NFTAttributes[],
	): Promise<void> {
		const moduleNames = [];
		for (const item of attributesArray) {
			moduleNames.push(item.module);
		}
		if (new Set(moduleNames).size !== attributesArray.length) {
			throw new Error('Invalid attributes array provided');
		}

		const index = await this.getNextAvailableIndex(methodContext, collectionID);
		const indexBytes = Buffer.alloc(LENGTH_INDEX);
		indexBytes.writeBigInt64BE(index);

		const nftID = Buffer.concat([this._config.ownChainID, collectionID, indexBytes]);
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
		});
	}

	public async lock(methodContext: MethodContext, module: string, nftID: Buffer): Promise<void> {
		if (module === NFT_NOT_LOCKED) {
			throw new Error('Cannot be locked by NFT module');
		}

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
		const ownChainID = this._internalMethod.getOwnChainID();
		if (receivingChainID.equals(ownChainID)) {
			this.events.get(TransferCrossChainEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID,
					includeAttributes,
				},
				NftEventResult.INVALID_RECEIVING_CHAIN,
			);
			throw new Error('Receiving chain cannot be the sending chain');
		}

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

		const nftChainID = this.getChainID(nftID);
		if (![ownChainID, receivingChainID].some(allowedChainID => nftChainID.equals(allowedChainID))) {
			this.events.get(TransferCrossChainEvent).error(
				methodContext,
				{
					senderAddress,
					recipientAddress,
					receivingChainID,
					nftID,
					includeAttributes,
				},
				NftEventResult.RESULT_NFT_NOT_NATIVE,
			);
			throw new Error('NFT must be native either to the sending chain or the receiving chain');
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

	public async supportAllNFTs(methodContext: MethodContext): Promise<void> {
		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const alreadySupported = await supportedNFTsStore.has(methodContext, ALL_SUPPORTED_NFTS_KEY);

		if (alreadySupported) {
			return;
		}

		const allSupportedNFTs = await supportedNFTsStore.getAll(methodContext);

		for (const { key } of allSupportedNFTs) {
			await supportedNFTsStore.del(methodContext, key);
		}

		await supportedNFTsStore.set(methodContext, ALL_SUPPORTED_NFTS_KEY, {
			supportedCollectionIDArray: [],
		});

		this.events.get(AllNFTsSupportedEvent).log(methodContext);
	}

	public async removeSupportAllNFTs(methodContext: MethodContext): Promise<void> {
		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const allSupportedNFTs = await supportedNFTsStore.getAll(methodContext);

		for (const { key } of allSupportedNFTs) {
			await supportedNFTsStore.del(methodContext, key);
		}

		await supportedNFTsStore.del(methodContext, ALL_SUPPORTED_NFTS_KEY);

		this.events.get(AllNFTsSupportRemovedEvent).log(methodContext);
	}

	public async supportAllNFTsFromChain(
		methodContext: MethodContext,
		chainID: Buffer,
	): Promise<void> {
		if (chainID.equals(this._config.ownChainID)) {
			return;
		}

		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);
		const allNFTsSuppported = await supportedNFTsStore.has(methodContext, ALL_SUPPORTED_NFTS_KEY);

		if (allNFTsSuppported) {
			return;
		}

		const chainSupportExists = await supportedNFTsStore.has(methodContext, chainID);

		if (chainSupportExists) {
			const supportedCollections = await supportedNFTsStore.get(methodContext, chainID);

			if (supportedCollections.supportedCollectionIDArray.length === 0) {
				return;
			}
		}

		await supportedNFTsStore.save(methodContext, chainID, {
			supportedCollectionIDArray: [],
		});

		this.events.get(AllNFTsFromChainSupportedEvent).log(methodContext, chainID);
	}

	public async removeSupportAllNFTsFromChain(
		methodContext: MethodContext,
		chainID: Buffer,
	): Promise<void> {
		if (chainID.equals(this._config.ownChainID)) {
			throw new Error('Support for native NFTs cannot be removed');
		}

		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const allNFTsSupported = await supportedNFTsStore.has(methodContext, ALL_SUPPORTED_NFTS_KEY);

		if (allNFTsSupported) {
			throw new Error('All NFTs from all chains are supported');
		}

		const isChainSupported = await supportedNFTsStore.has(methodContext, chainID);

		if (!isChainSupported) {
			return;
		}

		await supportedNFTsStore.del(methodContext, chainID);

		this.events.get(AllNFTsFromChainSupportRemovedEvent).log(methodContext, chainID);
	}

	public async supportAllNFTsFromCollection(
		methodContext: MethodContext,
		chainID: Buffer,
		collectionID: Buffer,
	): Promise<void> {
		if (chainID.equals(this._config.ownChainID)) {
			return;
		}

		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);
		const allNFTsSupported = await supportedNFTsStore.has(methodContext, ALL_SUPPORTED_NFTS_KEY);

		if (allNFTsSupported) {
			return;
		}

		const isChainSupported = await supportedNFTsStore.has(methodContext, chainID);

		let supportedChainData;
		if (isChainSupported) {
			supportedChainData = await supportedNFTsStore.get(methodContext, chainID);

			if (supportedChainData.supportedCollectionIDArray.length === 0) {
				return;
			}

			if (
				supportedChainData.supportedCollectionIDArray.some(collection =>
					collection.collectionID.equals(collectionID),
				)
			) {
				return;
			}

			supportedChainData.supportedCollectionIDArray.push({ collectionID });

			await supportedNFTsStore.save(methodContext, chainID, supportedChainData);

			this.events.get(AllNFTsFromCollectionSupportedEvent).log(methodContext, {
				chainID,
				collectionID,
			});

			return;
		}

		await supportedNFTsStore.save(methodContext, chainID, {
			supportedCollectionIDArray: [
				{
					collectionID,
				},
			],
		});

		this.events.get(AllNFTsFromCollectionSupportedEvent).log(methodContext, {
			chainID,
			collectionID,
		});
	}

	public async removeSupportAllNFTsFromCollection(
		methodContext: MethodContext,
		chainID: Buffer,
		collectionID: Buffer,
	): Promise<void> {
		if (chainID.equals(this._config.ownChainID)) {
			throw new Error('Invalid operation. Support for native NFTs cannot be removed');
		}

		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const allNFTsSupported = await supportedNFTsStore.has(methodContext, ALL_SUPPORTED_NFTS_KEY);

		if (allNFTsSupported) {
			throw new Error('All NFTs from all chains are supported');
		}

		const isChainSupported = await supportedNFTsStore.has(methodContext, chainID);

		if (!isChainSupported) {
			return;
		}
		const supportedChainData = await supportedNFTsStore.get(methodContext, chainID);

		if (supportedChainData.supportedCollectionIDArray.length === 0) {
			throw new Error('All NFTs from the specified chain are supported');
		}

		if (
			supportedChainData.supportedCollectionIDArray.some(supportedCollection =>
				supportedCollection.collectionID.equals(collectionID),
			)
		) {
			supportedChainData.supportedCollectionIDArray =
				supportedChainData.supportedCollectionIDArray.filter(
					supportedCollection => !supportedCollection.collectionID.equals(collectionID),
				);
		}

		if (supportedChainData.supportedCollectionIDArray.length === 0) {
			await supportedNFTsStore.del(methodContext, chainID);
		} else {
			await supportedNFTsStore.save(methodContext, chainID, {
				...supportedChainData,
			});
		}

		this.events.get(AllNFTsFromCollectionSupportRemovedEvent).log(methodContext, {
			chainID,
			collectionID,
		});
	}

	public async recover(
		methodContext: MethodContext,
		terminatedChainID: Buffer,
		substorePrefix: Buffer,
		storeKey: Buffer,
		storeValue: Buffer,
	): Promise<void> {
		const nftStore = this.stores.get(NFTStore);
		const nftID = storeKey;
		let isValidInput = true;
		let decodedValue: NFTStoreData;
		try {
			decodedValue = codec.decode<NFTStoreData>(nftStoreSchema, storeValue);
			validator.validate(nftStoreSchema, decodedValue);
		} catch (error) {
			isValidInput = false;
		}

		if (
			!substorePrefix.equals(nftStore.subStorePrefix) ||
			storeKey.length !== LENGTH_NFT_ID ||
			!isValidInput
		) {
			this.events.get(RecoverEvent).error(
				methodContext,
				{
					terminatedChainID,
					nftID,
				},
				NftEventResult.RESULT_RECOVER_FAIL_INVALID_INPUTS,
			);
			throw new Error('Invalid inputs');
		}

		const nftChainID = this.getChainID(nftID);
		const ownChainID = this._internalMethod.getOwnChainID();
		if (!nftChainID.equals(ownChainID)) {
			this.events.get(RecoverEvent).error(
				methodContext,
				{
					terminatedChainID,
					nftID,
				},
				NftEventResult.RESULT_INITIATED_BY_NONNATIVE_CHAIN,
			);
			throw new Error('Recovery called by a foreign chain');
		}

		const nftData = await nftStore.get(methodContext, nftID);
		if (!nftData.owner.equals(terminatedChainID)) {
			this.events.get(RecoverEvent).error(
				methodContext,
				{
					terminatedChainID,
					nftID,
				},
				NftEventResult.RESULT_NFT_NOT_ESCROWED,
			);
			throw new Error('NFT was not escrowed to terminated chain');
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const storeValueOwner = decodedValue!.owner;
		if (storeValueOwner.length !== LENGTH_ADDRESS) {
			this.events.get(RecoverEvent).error(
				methodContext,
				{
					terminatedChainID,
					nftID,
				},
				NftEventResult.RESULT_INVALID_ACCOUNT,
			);
			throw new Error('Invalid account information');
		}

		const escrowStore = this.stores.get(EscrowStore);
		nftData.owner = storeValueOwner;
		const storedAttributes = nftData.attributesArray;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const receivedAttributes = decodedValue!.attributesArray;
		nftData.attributesArray = this._internalMethod.getNewAttributes(
			nftID,
			storedAttributes,
			receivedAttributes,
		);
		await nftStore.save(methodContext, nftID, nftData);
		await this._internalMethod.createUserEntry(methodContext, nftData.owner, nftID);
		await escrowStore.del(methodContext, escrowStore.getKey(terminatedChainID, nftID));

		this.events.get(RecoverEvent).log(methodContext, {
			terminatedChainID,
			nftID,
		});
	}

	public async setAttributes(
		methodContext: MethodContext,
		module: string,
		nftID: Buffer,
		attributes: Buffer,
	): Promise<void> {
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(methodContext, nftID);
		if (!nftExists) {
			this.events.get(SetAttributesEvent).error(
				methodContext,
				{
					nftID,
					attributes,
				},
				NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
			);
			throw new Error('NFT substore entry does not exist');
		}

		const nftData = await nftStore.get(methodContext, nftID);
		const index = nftData.attributesArray.findIndex(attr => attr.module === module);
		if (index > -1) {
			nftData.attributesArray[index] = { module, attributes };
		} else {
			nftData.attributesArray.push({ module, attributes });
		}
		await nftStore.save(methodContext, nftID, nftData);

		this.events.get(SetAttributesEvent).log(methodContext, {
			nftID,
			attributes,
		});
	}
}
