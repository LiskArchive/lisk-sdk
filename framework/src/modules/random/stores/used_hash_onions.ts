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
import {
	BaseOffchainStore,
	ImmutableOffchainStoreGetter,
	OffchainStoreGetter,
} from '../../base_offchain_store';
import { NotFoundError } from '../../../state_machine';

export interface UsedHashOnion {
	readonly count: number;
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
				required: ['count', 'height'],
				properties: {
					count: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 2,
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
			const { usedHashOnions } = await this.get(ctx, address);

			return usedHashOnions.reduce<UsedHashOnion | undefined>((prev, curr) => {
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

	public async setLatest(
		ctx: OffchainStoreGetter,
		finalizedHeight: number,
		address: Buffer,
		usedHashOnion: UsedHashOnion,
		originalUsedHashOnions: UsedHashOnion[],
	): Promise<void> {
		const index = originalUsedHashOnions.findIndex(
			hashOnion => hashOnion.count === usedHashOnion.count,
		);

		if (index === -1) {
			originalUsedHashOnions.push(usedHashOnion);
		} else {
			// eslint-disable-next-line no-param-reassign
			originalUsedHashOnions[index] = usedHashOnion;
		}

		await this.set(
			ctx,
			address,
			this._filterUsedHashOnions(originalUsedHashOnions, finalizedHeight),
		);
	}

	private _filterUsedHashOnions(
		usedHashOnions: UsedHashOnion[],
		finalizedHeight: number,
	): UsedHashOnionStoreObject {
		const filteredObject = usedHashOnions.reduce(
			({ others, highest }, current) => {
				if (highest === null) {
					return {
						highest: current,
						others,
					};
				}

				if (highest.height < current.height) {
					others.push(highest);

					return {
						highest: current,
						others,
					};
				}

				others.push(current);

				return {
					highest,
					others,
				};
			},
			{
				others: [] as UsedHashOnion[],
				highest: null as UsedHashOnion | null,
			},
		);

		const filtered = filteredObject.others.filter(ho => ho.height > finalizedHeight);
		filtered.push(filteredObject.highest!);
		return {
			usedHashOnions: filtered,
		};
	}
}
