/*
 * Copyright © 2022 Lisk Foundation
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
import { BaseStore, ImmutableStoreGetter } from '../../base_store';
import { TOKEN_ID_LENGTH } from '../constants';

export interface SupplyStoreData {
	totalSupply: bigint;
}

export const supplyStoreSchema = {
	$id: '/token/store/supply',
	type: 'object',
	required: ['totalSupply'],
	properties: {
		totalSupply: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
	},
};

export class SupplyStore extends BaseStore<SupplyStoreData> {
	public schema = supplyStoreSchema;

	public async getAll(
		context: ImmutableStoreGetter,
	): Promise<{ key: Buffer; value: SupplyStoreData }[]> {
		return this.iterate(context, {
			gte: Buffer.alloc(TOKEN_ID_LENGTH, 0),
			lte: Buffer.alloc(TOKEN_ID_LENGTH, 255),
		});
	}
}
