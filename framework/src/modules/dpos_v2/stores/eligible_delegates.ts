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

export interface EligibleDelegate {
	lastPomHeight: number;
}

export const eligibleDelegatesStoreSchema = {
	$id: '/dpos/eligibleDelegates',
	type: 'object',
	required: ['lastPomHeight'],
	properties: {
		lastPomHeight: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
};

export class EligibleDelegatesStore extends BaseStore<EligibleDelegate> {
	public schema = eligibleDelegatesStoreSchema;

	public getKey(address: Buffer, delegateWeight: bigint): Buffer {
		const buffer = Buffer.alloc(8);
		buffer.writeBigUInt64BE(delegateWeight);
		return Buffer.concat([buffer, address]);
	}

	public async getTop(context: ImmutableStoreGetter, count: number) {
		return this.iterate(context, { limit: count, reverse: true });
	}

	public async getAll(context: ImmutableStoreGetter) {
		return this.iterate(context, { reverse: true });
	}
}