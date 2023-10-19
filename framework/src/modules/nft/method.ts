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
import { FeeMethod, ModuleConfig, NFT } from './types';
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
	NFT_NOT_LOCKED,
	NftEventResult,
} from './constants';
import { UserStore } from './stores/user';
import { DestroyEvent } from './events/destroy';
import { SupportedNFTsStore } from './stores/supported_nfts';
import { CreateEvent } from './events/create';
import { LockEvent } from './events/lock';
import { TransferEvent } from './events/transfer';
import { InternalMethod, TransferVerifyError } from './internal_method';
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
import { NotFoundError } from './error';
import { UnlockEvent } from './events/unlock';

export class NFTMethod extends BaseMethod {
	private _config!: ModuleConfig;
	private _internalMethod!: InternalMethod;
	private _feeMethod!: FeeMethod;

	public init(config: ModuleConfig): void {
		this._config = config;
	}

	public addDependencies(internalMethod: InternalMethod, feeMethod: FeeMethod) {
		this._internalMethod = internalMethod;
		this._feeMethod = feeMethod;
	}

	public getChainID(nftID: Buffer): Buffer {
		if (nftID.length !== LENGTH_NFT_ID) {
			throw new Error(`NFT ID must have length ${LENGTH_NFT_ID}`);
		}

		return nftID.subarray(0, LENGTH_CHAIN_ID);
	}

	public isNFTEscrowed(nft: NFT): boolean {
		return nft.owner.length !== LENGTH_ADDRESS;
	}

	public isNFTLocked(nft: NFT): boolean {
		if (!nft.lockingModule) {
			return false;
		}

		return nft.lockingModule !== NFT_NOT_LOCKED;
	}

	public async getNFT(methodContext: ImmutableMethodContext, nftID: Buffer): Promise<NFT> {
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(methodContext, nftID);

		if (!nftExists) {
			throw new NotFoundError('NFT substore entry does not exist');
		}

		const data = await nftStore.get(methodContext, nftID);
		const { owner } = data;

		if (owner.length === LENGTH_ADDRESS) {
			const userStore = this.stores.get(UserStore);
			const userExists = await userStore.has(methodContext, userStore.getKey(owner, nftID));
			if (!userExists) {
				throw new NotFoundError('User substore entry does not exist');
			}
			const userData = await userStore.get(methodContext, userStore.getKey(owner, nftID));
			return { ...data, lockingModule: userData.lockingModule };
		}

		return data;
	}

	public async destroy(
		methodContext: MethodContext,
		address: Buffer,
		nftID: Buffer,
	): Promise<void> {
		let nft;
		try {
			nft = await this.getNFT(methodContext, nftID);
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events.get(DestroyEvent).error(
					methodContext,
					{
						address,
						nftID,
					},
					NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
				);

				throw new Error('NFT does not exist');
			}
			throw error;
		}

		if (this.isNFTEscrowed(nft)) {
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

		if (!nft.owner.equals(address)) {
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

		if (this.isNFTLocked(nft)) {
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

		const nftStore = this.stores.get(NFTStore);
		const userStore = this.stores.get(UserStore);
		await nftStore.del(methodContext, nftID);
		await userStore.del(methodContext, userStore.getKey(nft.owner, nftID));

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
		const index = await this.getNextAvailableIndex(methodContext, collectionID);
		const indexBytes = Buffer.alloc(LENGTH_INDEX);
		indexBytes.writeBigInt64BE(index);

		const nftID = Buffer.concat([this._config.ownChainID, collectionID, indexBytes]);
		this._feeMethod.payFee(methodContext, BigInt(FEE_CREATE_NFT));

		await this._internalMethod.createNFTEntry(methodContext, address, nftID, attributesArray);

		await this._internalMethod.createUserEntry(methodContext, address, nftID);

		this.events.get(CreateEvent).log(methodContext, {
			address,
			nftID,
		});
	}

	public async lock(methodContext: MethodContext, module: string, nftID: Buffer): Promise<void> {
		if (module === NFT_NOT_LOCKED) {
			throw new Error('Cannot be locked by NFT module');
		}

		let nft;
		try {
			nft = await this.getNFT(methodContext, nftID);
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events.get(LockEvent).error(
					methodContext,
					{
						module,
						nftID,
					},
					NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
				);

				throw new Error('NFT does not exist');
			}
			throw error;
		}

		if (this.isNFTEscrowed(nft)) {
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

		if (this.isNFTLocked(nft)) {
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

		const userStore = this.stores.get(UserStore);
		await userStore.set(methodContext, userStore.getKey(nft.owner, nftID), {
			lockingModule: module,
		});

		this.events.get(LockEvent).log(methodContext, {
			module,
			nftID,
		});
	}

	public async unlock(methodContext: MethodContext, module: string, nftID: Buffer): Promise<void> {
		let nft;
		try {
			nft = await this.getNFT(methodContext, nftID);
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events.get(UnlockEvent).error(
					methodContext,
					{
						module,
						nftID,
					},
					NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
				);

				throw new Error('NFT does not exist');
			}
			throw error;
		}

		if (this.isNFTEscrowed(nft)) {
			throw new Error('NFT is escrowed to another chain');
		}

		if (!this.isNFTLocked(nft)) {
			this.events.get(UnlockEvent).error(
				methodContext,
				{
					module,
					nftID,
				},
				NftEventResult.RESULT_NFT_NOT_LOCKED,
			);

			throw new Error('NFT is not locked');
		}

		if (nft.lockingModule !== module) {
			this.events.get(UnlockEvent).error(
				methodContext,
				{
					module,
					nftID,
				},
				NftEventResult.RESULT_UNAUTHORIZED_UNLOCK,
			);

			throw new Error('Unlocking NFT via module that did not lock it');
		}

		const userStore = this.stores.get(UserStore);
		await userStore.set(methodContext, userStore.getKey(nft.owner, nftID), {
			lockingModule: NFT_NOT_LOCKED,
		});

		this.events.get(UnlockEvent).log(methodContext, {
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
		try {
			await this._internalMethod.verifyTransfer(methodContext, senderAddress, nftID);
		} catch (error) {
			if (error instanceof TransferVerifyError) {
				this.events.get(TransferEvent).error(
					methodContext,
					{
						senderAddress,
						recipientAddress,
						nftID,
					},
					error.code,
				);
			}

			throw error;
		}

		await this._internalMethod.transfer(methodContext, recipientAddress, nftID);
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
		try {
			await this._internalMethod.verifyTransferCrossChain(
				methodContext,
				senderAddress,
				nftID,
				this._internalMethod.getOwnChainID(),
				receivingChainID,
				messageFee,
				data,
			);
		} catch (error) {
			if (error instanceof TransferVerifyError) {
				this.events.get(TransferCrossChainEvent).error(
					methodContext,
					{
						senderAddress,
						recipientAddress,
						receivingChainID,
						nftID,
						includeAttributes,
					},
					error.code,
				);
			}

			throw error;
		}

		await this._internalMethod.transferCrossChain(
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
		nftID: Buffer,
		nft: Buffer,
	): Promise<void> {
		const nftStore = this.stores.get(NFTStore);
		let isValidInput = true;
		let decodedValue: NFTStoreData;
		try {
			decodedValue = codec.decode<NFTStoreData>(nftStoreSchema, nft);
			validator.validate(nftStoreSchema, decodedValue);
		} catch (error) {
			isValidInput = false;
		}

		if (
			!substorePrefix.equals(nftStore.subStorePrefix) ||
			nftID.length !== LENGTH_NFT_ID ||
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

		let nftData;
		try {
			nftData = await this.getNFT(methodContext, nftID);
		} catch (error) {
			if (error instanceof NotFoundError) {
				this.events.get(RecoverEvent).error(
					methodContext,
					{
						terminatedChainID,
						nftID,
					},
					NftEventResult.RESULT_NFT_DOES_NOT_EXIST,
				);

				throw new Error('NFT substore entry does not exist');
			}
			throw error;
		}

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
		await this._internalMethod.createNFTEntry(
			methodContext,
			nftData.owner,
			nftID,
			nftData.attributesArray,
		);
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

		const nft = await nftStore.get(methodContext, nftID);
		const index = nft.attributesArray.findIndex(attr => attr.module === module);
		if (index > -1) {
			nft.attributesArray[index] = { module, attributes };
		} else {
			nft.attributesArray.push({ module, attributes });
		}

		await this._internalMethod.createNFTEntry(methodContext, nft.owner, nftID, nft.attributesArray);

		this.events.get(SetAttributesEvent).log(methodContext, {
			nftID,
			attributes,
		});
	}
}
