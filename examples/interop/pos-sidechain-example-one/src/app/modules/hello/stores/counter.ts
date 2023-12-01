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
import { Modules } from 'lisk-sdk';

export interface CounterStoreData {
	counter: number;
}

export const counterKey = Buffer.alloc(0);

export const counterStoreSchema = {
	$id: '/hello/counter',
	type: 'object',
	required: ['counter'],
	properties: {
		counter: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
};

export class CounterStore extends Modules.BaseStore<CounterStoreData> {
	public schema = counterStoreSchema;
}
