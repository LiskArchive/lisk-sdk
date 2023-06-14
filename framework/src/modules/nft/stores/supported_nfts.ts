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

import { BaseStore, ImmutableStoreGetter, StoreGetter } from '../../base_store';
import { LENGTH_COLLECTION_ID, LENGTH_CHAIN_ID } from '../constants';

export interface SupportedNFTsStoreData {
	supportedCollectionIDArray: {
		collectionID: Buffer;
	}[];
}

export const supportedNFTsStoreSchema = {
	$id: '/nft/store/supportedNFTs',
	type: 'object',
	required: ['supportedCollectionIDArray'],
	properties: {
		supportedCollectionIDArray: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['collectionID'],
				properties: {
					collectionID: {
						dataType: 'bytes',
						minLength: LENGTH_COLLECTION_ID,
						maxLength: LENGTH_COLLECTION_ID,
						fieldNumber: 1,
					},
				},
			},
		},
	},
};

export class SupportedNFTsStore extends BaseStore<SupportedNFTsStoreData> {
	public schema = supportedNFTsStoreSchema;

	public async save(
		context: StoreGetter,
		chainID: Buffer,
		data: SupportedNFTsStoreData,
	): Promise<void> {
		const supportedCollectionIDArray = data.supportedCollectionIDArray.sort((a, b) =>
			a.collectionID.compare(b.collectionID),
		);

		await this.set(context, chainID, { supportedCollectionIDArray });
	}

	public async getAll(
		context: ImmutableStoreGetter,
	): Promise<{ key: Buffer; value: SupportedNFTsStoreData }[]> {
		return this.iterate(context, {
			gte: Buffer.alloc(LENGTH_CHAIN_ID, 0),
			lte: Buffer.alloc(LENGTH_CHAIN_ID, 255),
		});
	}
}
