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
import { BaseStore } from '../../base_store';

export interface GenesisData {
	height: number;
	initRounds: number;
	initValidators: Buffer[];
}

export const genesisDataStoreSchema = {
	$id: '/pos/store/genesis',
	type: 'object',
	required: ['height', 'initRounds', 'initValidators'],
	properties: {
		height: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		initRounds: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		initValidators: {
			type: 'array',
			fieldNumber: 3,
			items: {
				dataType: 'bytes',
				format: 'lisk32',
			},
		},
	},
};

export class GenesisDataStore extends BaseStore<GenesisData> {
	public schema = genesisDataStoreSchema;
}
