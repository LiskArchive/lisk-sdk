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

import { BaseStore, StoreGetter } from '../../base_store';
import { MAX_LENGTH_MODULE_NAME, MIN_LENGTH_MODULE_NAME } from '../constants';

export interface NFTAttributes {
	module: string;
	attributes: Buffer;
}

export interface NFTStoreData {
	owner: Buffer;
	attributesArray: NFTAttributes[];
}

export const nftStoreSchema = {
	$id: '/nft/store/nft',
	type: 'object',
	required: ['owner', 'attributesArray'],
	properties: {
		owner: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		attributesArray: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['module', 'attributes'],
				properties: {
					module: {
						dataType: 'string',
						minLength: MIN_LENGTH_MODULE_NAME,
						maxLength: MAX_LENGTH_MODULE_NAME,
						pattern: '^[a-zA-Z0-9]*$',
						fieldNumber: 1,
					},
					attributes: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

export class NFTStore extends BaseStore<NFTStoreData> {
	public schema = nftStoreSchema;

	public async save(context: StoreGetter, nftID: Buffer, data: NFTStoreData): Promise<void> {
		const attributesArray = data.attributesArray.filter(
			attribute => attribute.attributes.length > 0,
		);
		attributesArray.sort((a, b) => a.module.localeCompare(b.module, 'en'));

		await this.set(context, nftID, {
			...data,
			attributesArray,
		});
	}
}
