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
import { BaseOffchainStore } from '../../base_offchain_store';

export interface HashOnion {
	count: number;
	distance: number;
	hashes: Buffer[];
}

export const hashOnionSchema = {
	$id: 'lisk/random/hashOnion',
	type: 'object',
	required: ['count', 'distance', 'hashes'],
	properties: {
		count: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		distance: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		hashes: {
			type: 'array',
			fieldNumber: 3,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export class HashOnionStore extends BaseOffchainStore<HashOnion> {
	public schema = hashOnionSchema;
}
