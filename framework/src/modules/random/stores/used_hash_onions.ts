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
import { BaseOffchainStore, ImmutableOffchainStoreGetter } from '../../base_offchain_store';
import { NotFoundError } from '../../../state_machine';
import { STORE_PREFIX_USED_HASH_ONION } from '../constants';

export interface UsedHashOnion {
	readonly count: number;
	readonly address: Buffer;
	readonly height: number;
}

export interface UsedHashOnionStoreObject {
	readonly usedHashOnions: UsedHashOnion[];
}

export const usedHashOnionsStoreSchema = {
	title: 'Used hash onion',
	$id: '/node/forger/usedHashOnion',
	type: 'object',
	required: ['usedHashOnions'],
	properties: {
		usedHashOnions: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'count', 'height'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					count: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
		},
	},
};

export class UsedHashOnionsStore extends BaseOffchainStore<UsedHashOnionStoreObject> {
	public schema = usedHashOnionsStoreSchema;

	public async getLatest(
		ctx: ImmutableOffchainStoreGetter,
		address: Buffer,
		height?: number,
	): Promise<UsedHashOnion | undefined> {
		try {
			const { usedHashOnions } = await this.get(ctx, STORE_PREFIX_USED_HASH_ONION);
			return usedHashOnions.reduce<UsedHashOnion | undefined>((prev, curr) => {
				if (!curr.address.equals(address)) {
					return prev;
				}
				// if the height is not specified, return the highest
				if (height === undefined) {
					if (!prev || prev.height < curr.height) {
						return curr;
					}
					return prev;
				}
				// if the height is specified, return the highest below the specified height
				if (curr.height < height && (!prev || prev.height < curr.height)) {
					return curr;
				}
				return prev;
			}, undefined);
		} catch (error) {
			if (error instanceof NotFoundError) {
				return undefined;
			}
			throw error;
		}
	}
}
