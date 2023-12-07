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

import * as cryptography from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { BaseEndpoint } from '../base_endpoint';
import { JSONObject, ModuleEndpointContext } from '../../types';
import {
	isCollectionIDSupportedRequestSchema,
	getEscrowedNFTIDsRequestSchema,
	getNFTRequestSchema,
	getNFTsRequestSchema,
	hasNFTRequestSchema,
	isNFTSupportedRequestSchema,
} from './schemas';
import { NFTStore } from './stores/nft';
import { ALL_SUPPORTED_NFTS_KEY, LENGTH_ADDRESS, LENGTH_NFT_ID } from './constants';
import { UserStore } from './stores/user';
import { NFTJSON } from './types';
import { SupportedNFTsStore } from './stores/supported_nfts';
import { NFTMethod } from './method';

export class NFTEndpoint extends BaseEndpoint {
	private _nftMethod!: NFTMethod;

	public addDependencies(nftMethod: NFTMethod) {
		this._nftMethod = nftMethod;
	}

	/**
	 * Gets all NFT owned by a specific account.
	 *
	 * @example
	 *  ```sh
	 *  lisk-core endpoint:invoke nft_getNFTs '{ "address": "lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu" }' --pretty
	 *  ```
	 *
	 * @param context
	 *
	 * @returns A list of all NFT owned by the specified account.
	 */
	public async getNFTs(
		context: ModuleEndpointContext,
	): Promise<{ nfts: JSONObject<Omit<NFTJSON, 'owner'> & { id: string }>[] }> {
		validator.validate<{ address: string }>(getNFTsRequestSchema, context.params);

		const nftStore = this.stores.get(NFTStore);

		const owner = cryptography.address.getAddressFromLisk32Address(context.params.address);

		const allNFTs = await nftStore.iterate(context.getImmutableMethodContext(), {
			gte: Buffer.alloc(LENGTH_NFT_ID, 0),
			lte: Buffer.alloc(LENGTH_NFT_ID, 255),
		});

		const ownedNFTs = allNFTs.filter(nft => nft.value.owner.equals(owner));

		const userStore = this.stores.get(UserStore);

		const nfts = [];

		for (const ownedNFT of ownedNFTs) {
			const ownedNFTUserData = await userStore.get(
				context.getImmutableMethodContext(),
				userStore.getKey(owner, ownedNFT.key),
			);

			nfts.push({
				id: ownedNFT.key.toString('hex'),
				attributesArray: ownedNFT.value.attributesArray.map(attribute => ({
					module: attribute.module,
					attributes: attribute.attributes.toString('hex'),
				})),
				lockingModule: ownedNFTUserData.lockingModule,
			});
		}

		return { nfts };
	}

	/**
	 * Checks whether an account owns a specific NFT or not.
	 *
	 * @example
	 *  ```sh
	 *  lisk-core endpoint:invoke nft_hasNFT '{ "address": "lsk24cd35u4jdq8szo3pnsqe5dsxwrnazyqqqg5eu", "id":"04000000000000010000000000000001" }' --pretty
	 *  ```
	 *
	 * @param context
	 *
	 * @returns `true` if the account owns the NFT, `false` if not.
	 */
	public async hasNFT(context: ModuleEndpointContext): Promise<{ hasNFT: boolean }> {
		const { params } = context;
		validator.validate<{ address: string; id: string }>(hasNFTRequestSchema, params);

		const nftID = Buffer.from(params.id, 'hex');
		const owner = cryptography.address.getAddressFromLisk32Address(params.address);

		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(context.getImmutableMethodContext(), nftID);

		if (!nftExists) {
			return { hasNFT: nftExists };
		}

		const nftData = await nftStore.get(context.getImmutableMethodContext(), nftID);

		return { hasNFT: nftData.owner.equals(owner) };
	}

	/**
	 * Gets a specific NFT.
	 *
	 * @example
	 *  ```sh
	 *  lisk-core endpoint:invoke nft_getNFT '{ "id":"04000000000000010000000000000001" }' --pretty
	 *  ```
	 *
	 * @param context
	 *
	 * @returns The NFT with the specified {@link NFTModule | "NFT ID"}.
	 */
	public async getNFT(context: ModuleEndpointContext): Promise<JSONObject<NFTJSON>> {
		const { params } = context;
		validator.validate<{ id: string }>(getNFTRequestSchema, params);

		const nftID = Buffer.from(params.id, 'hex');
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(context.getImmutableMethodContext(), nftID);

		if (!nftExists) {
			throw new Error('NFT substore entry does not exist');
		}

		const userStore = this.stores.get(UserStore);
		const nftData = await nftStore.get(context.getImmutableMethodContext(), nftID);
		const owner = nftData.owner.toString('hex');
		const attributesArray = nftData.attributesArray.map(attribute => ({
			module: attribute.module,
			attributes: attribute.attributes.toString('hex'),
		}));

		if (nftData.owner.length === LENGTH_ADDRESS) {
			const userExists = await userStore.has(
				context.getImmutableMethodContext(),
				userStore.getKey(nftData.owner, nftID),
			);
			if (!userExists) {
				throw new Error('User substore entry does not exist');
			}
			const userData = await userStore.get(
				context.getImmutableMethodContext(),
				userStore.getKey(nftData.owner, nftID),
			);

			return {
				owner,
				attributesArray,
				lockingModule: userData.lockingModule,
			};
		}

		return {
			owner,
			attributesArray,
		};
	}

	/**
	 * Returns all supported NFT collections of the network.
	 *
	 * @example
	 *  ```sh
	 *  lisk-core endpoint:invoke nft_getSupportedCollectionIDs --pretty
	 *  ```
	 *
	 * @param context
	 *
	 * @returns A list of all NFT collection IDs that are supported by the network.
	 */
	public async getSupportedCollectionIDs(
		context: ModuleEndpointContext,
	): Promise<{ supportedCollectionIDs: string[] }> {
		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);
		if (await supportedNFTsStore.has(context, ALL_SUPPORTED_NFTS_KEY)) {
			return { supportedCollectionIDs: ['*'] };
		}

		const supportedCollectionIDs: string[] = [];

		supportedCollectionIDs.push(`${context.chainID.toString('hex')}********`);

		const supportedNFTsStoreData = await supportedNFTsStore.getAll(context);
		for (const { key, value } of supportedNFTsStoreData) {
			if (!value.supportedCollectionIDArray.length) {
				supportedCollectionIDs.push(`${key.toString('hex')}********`);
			} else {
				const collectionIDs = value.supportedCollectionIDArray.map(
					supportedCollectionID =>
						key.toString('hex') + supportedCollectionID.collectionID.toString('hex'),
				);
				supportedCollectionIDs.push(...collectionIDs);
			}
		}

		return { supportedCollectionIDs };
	}

	/**
	 * Checks whether a specific NFT collection ID is supported by the network.
	 *
	 * @example
	 *  ```sh
	 *  lisk-core endpoint:invoke nft_isCollectionIDSupported '{ "chainID":"04000001","collectionID":"00000001" }' --pretty
	 *  ```
	 *
	 * @param context
	 *
	 * @returns `true` if the specified NFT collection is supported, `false` if not.
	 */
	public async isCollectionIDSupported(
		context: ModuleEndpointContext,
	): Promise<{ isCollectionIDSupported: boolean }> {
		const { params } = context;

		validator.validate<{ chainID: string; collectionID: string }>(
			isCollectionIDSupportedRequestSchema,
			params,
		);

		const chainID = Buffer.from(params.chainID, 'hex');
		const collectionID = Buffer.from(params.collectionID, 'hex');
		const nftID = Buffer.concat([chainID, collectionID, Buffer.alloc(8)]);

		const isNFTSupported = await this._nftMethod.isNFTSupported(
			context.getImmutableMethodContext(),
			nftID,
		);

		if (!isNFTSupported) {
			return { isCollectionIDSupported: false };
		}

		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const supportedNFTsData = await supportedNFTsStore.get(
			context.getImmutableMethodContext(),
			chainID,
		);

		return {
			isCollectionIDSupported: supportedNFTsData.supportedCollectionIDArray.some(
				supportedCollection => supportedCollection.collectionID.equals(collectionID),
			),
		};
	}

	/**
	 * Gets all escrowed NFTs for a specific chain ID.
	 *
	 * @example
	 *  ```sh
	 *  lisk-core endpoint:invoke nft_getEscrowedNFTIDs '{ "chainID":"04000001" }' --pretty
	 *  ```
	 *
	 * @param context
	 *
	 * @returns A list of escrowed NFT for the specified chain ID.
	 */
	public async getEscrowedNFTIDs(
		context: ModuleEndpointContext,
	): Promise<{ escrowedNFTIDs: string[] }> {
		const { params } = context;

		validator.validate<{ chainID: string }>(getEscrowedNFTIDsRequestSchema, params);

		const chainD = Buffer.from(params.chainID, 'hex');

		const nftStore = this.stores.get(NFTStore);

		const allNFTs = await nftStore.iterate(context.getImmutableMethodContext(), {
			gte: Buffer.alloc(LENGTH_NFT_ID, 0),
			lte: Buffer.alloc(LENGTH_NFT_ID, 255),
		});

		return {
			escrowedNFTIDs: allNFTs
				.filter(nft => nft.value.owner.equals(chainD))
				.map(nft => nft.key.toString('hex')),
		};
	}

	/**
	 * Checks wheter a specific NFT is supported by the network.
	 *
	 * @example
	 *  ```sh
	 *  lisk-core endpoint:invoke nft_isNFTSupported '{ "nftID":"04000000000000010000000000000001" }' --pretty
	 *  ```
	 *
	 * @param context
	 *
	 * @returns `true` if the NFT is supported, `false` if not.
	 */
	public async isNFTSupported(
		context: ModuleEndpointContext,
	): Promise<{ isNFTSupported: boolean }> {
		const { params } = context;

		validator.validate<{ nftID: string }>(isNFTSupportedRequestSchema, params);

		const nftID = Buffer.from(params.nftID, 'hex');
		let isNFTSupported = false;

		try {
			isNFTSupported = await this._nftMethod.isNFTSupported(
				context.getImmutableMethodContext(),
				nftID,
			);
		} catch (err) {
			return { isNFTSupported };
		}

		return { isNFTSupported };
	}

	/**
	 * Returns all NFT supported by the network.
	 *
	 * @example
	 *  ```sh
	 *  lisk-core endpoint:invoke nft_getSupportedNFTs --pretty
	 *  ```
	 *
	 * @param context
	 *
	 * @returns A list of all supported NFT IDs
	 */
	public async getSupportedNFTs(
		context: ModuleEndpointContext,
	): Promise<{ supportedNFTs: string[] }> {
		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const areAllNFTsSupported = await supportedNFTsStore.has(context, ALL_SUPPORTED_NFTS_KEY);
		if (areAllNFTsSupported) {
			return {
				supportedNFTs: ['*'],
			};
		}

		const supportedNFTs: string[] = [];

		const storeData = await supportedNFTsStore.getAll(context);
		for (const { key, value } of storeData) {
			if (!value.supportedCollectionIDArray.length) {
				supportedNFTs.push(`${key.toString('hex')}********`);
			} else {
				for (const supportedCollectionID of value.supportedCollectionIDArray) {
					supportedNFTs.push(
						key.toString('hex') + supportedCollectionID.collectionID.toString('hex'),
					);
				}
			}
		}

		return { supportedNFTs };
	}
}
