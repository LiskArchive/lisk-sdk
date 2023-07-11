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
	collectionExistsRequestSchema,
	getCollectionIDsRequestSchema,
	getEscrowedNFTIDsRequestSchema,
	getNFTRequestSchema,
	getNFTsRequestSchema,
	hasNFTRequestSchema,
	isNFTSupportedRequestSchema,
} from './schemas';
import { NFTStore } from './stores/nft';
import { LENGTH_ADDRESS, LENGTH_NFT_ID } from './constants';
import { UserStore } from './stores/user';
import { NFT } from './types';
import { SupportedNFTsStore } from './stores/supported_nfts';
import { NFTMethod } from './method';

export class NFTEndpoint extends BaseEndpoint {
	private _nftMethod!: NFTMethod;

	public addDependencies(nftMethod: NFTMethod) {
		this._nftMethod = nftMethod;
	}

	public async getNFTs(
		context: ModuleEndpointContext,
	): Promise<{ nfts: JSONObject<Omit<NFT, 'owner'> & { id: string }>[] }> {
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

	public async getNFT(context: ModuleEndpointContext): Promise<JSONObject<NFT>> {
		const { params } = context;
		validator.validate<{ id: string }>(getNFTRequestSchema, params);

		const nftID = Buffer.from(params.id, 'hex');
		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(context.getImmutableMethodContext(), nftID);

		if (!nftExists) {
			throw new Error('NFT does not exist');
		}

		const userStore = this.stores.get(UserStore);
		const nftData = await nftStore.get(context.getImmutableMethodContext(), nftID);
		if (nftData.owner.length === LENGTH_ADDRESS) {
			const userData = await userStore.get(
				context.getImmutableMethodContext(),
				userStore.getKey(nftData.owner, nftID),
			);

			return {
				owner: nftData.owner.toString('hex'),
				attributesArray: nftData.attributesArray.map(attribute => ({
					module: attribute.module,
					attributes: attribute.attributes.toString('hex'),
				})),
				lockingModule: userData.lockingModule,
			};
		}

		return {
			owner: nftData.owner.toString('hex'),
			attributesArray: nftData.attributesArray.map(attribute => ({
				module: attribute.module,
				attributes: attribute.attributes.toString('hex'),
			})),
		};
	}

	public async getCollectionIDs(
		context: ModuleEndpointContext,
	): Promise<{ collectionIDs: string[] }> {
		const { params } = context;

		validator.validate<{ chainID: string }>(getCollectionIDsRequestSchema, params);

		const chainID = Buffer.from(params.chainID, 'hex');

		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const chainExists = await supportedNFTsStore.has(context.getImmutableMethodContext(), chainID);

		if (!chainExists) {
			return { collectionIDs: [] };
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

	public async collectionExists(
		context: ModuleEndpointContext,
	): Promise<{ collectionExists: boolean }> {
		const { params } = context;

		validator.validate<{ chainID: string; collectionID: string }>(
			collectionExistsRequestSchema,
			params,
		);

		const chainID = Buffer.from(params.chainID, 'hex');

		const supportedNFTsStore = this.stores.get(SupportedNFTsStore);

		const chainExists = await supportedNFTsStore.has(context.getImmutableMethodContext(), chainID);

		if (!chainExists) {
			return { collectionExists: false };
		}

		const collectionID = Buffer.from(params.collectionID, 'hex');

		const supportedNFTsData = await supportedNFTsStore.get(
			context.getImmutableMethodContext(),
			chainID,
		);

		return {
			collectionExists: supportedNFTsData.supportedCollectionIDArray.some(supportedCollection =>
				supportedCollection.collectionID.equals(collectionID),
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

		validator.validate<{ id: string }>(isNFTSupportedRequestSchema, params);

		const nftID = Buffer.from(params.id, 'hex');
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
}
