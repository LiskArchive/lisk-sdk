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
	getSupportedCollectionIDsRequestSchema,
	getEscrowedNFTIDsRequestSchema,
	getNFTRequestSchema,
	getNFTsRequestSchema,
	hasNFTRequestSchema,
	isNFTSupportedRequestSchema,
} from './schemas';
import { NFTStore } from './stores/nft';
import { ALL_SUPPORTED_NFTS_KEY, LENGTH_ADDRESS, LENGTH_NFT_ID } from './constants';
import { UserStore } from './stores/user';
import { ModuleConfig, NFTJSON } from './types';
import { SupportedNFTsStore } from './stores/supported_nfts';
import { NFTMethod } from './method';

export class NFTEndpoint extends BaseEndpoint {
	private _config!: ModuleConfig;
	private _nftMethod!: NFTMethod;

	public init(config: ModuleConfig): void {
		this._config = config;
	}

	public addDependencies(nftMethod: NFTMethod) {
		this._nftMethod = nftMethod;
	}

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

	public async getSupportedCollectionIDs(
		context: ModuleEndpointContext,
	): Promise<{ collectionIDs: string[] }> {
		const { params } = context;

		validator.validate<{ chainID: string }>(getSupportedCollectionIDsRequestSchema, params);

		const { ownChainID } = this._config;
		const chainID = Buffer.from(params.chainID, 'hex');
		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const areAllNFTsSupported = await supportedNFTsStore.has(context, ALL_SUPPORTED_NFTS_KEY);
		if (areAllNFTsSupported) {
			return { collectionIDs: ['*'] };
		}

		const isSupported = await supportedNFTsStore.has(context, chainID);
		if (!isSupported) {
			return chainID.equals(ownChainID) ? { collectionIDs: ['*'] } : { collectionIDs: [] };
		}

		const supportedNFTsData = await supportedNFTsStore.get(
			context.getImmutableMethodContext(),
			chainID,
		);

		return {
			collectionIDs: supportedNFTsData.supportedCollectionIDArray.map(collection =>
				collection.collectionID.toString('hex'),
			),
		};
	}

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
