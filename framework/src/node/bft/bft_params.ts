/*
 * Copyright © 2021 Lisk Foundation
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

import { codec } from '@liskhq/lisk-codec';
import { BIG_ENDIAN, intToBuffer } from '@liskhq/lisk-cryptography';
import { ImmutableSubStore } from '../../state_machine';
import { SubStore } from '../../state_machine/types';
import { BFTParameterNotFoundError } from './errors';
import { BFTParameters, bftParametersSchema } from './schemas';

export const getBFTParameters = async (
	paramsStore: ImmutableSubStore,
	height: number,
): Promise<BFTParameters> => {
	const start = intToBuffer(0, 4, BIG_ENDIAN);
	const end = intToBuffer(height, 4, BIG_ENDIAN);
	const results = await paramsStore.iterate({
		limit: 1,
		start,
		end,
		reverse: true,
	});
	if (results.length !== 1) {
		throw new BFTParameterNotFoundError();
	}
	const [result] = results;
	return codec.decode<BFTParameters>(bftParametersSchema, result.value);
};

export const deleteBFTParameters = async (paramsStore: SubStore, height: number): Promise<void> => {
	const start = intToBuffer(0, 4, BIG_ENDIAN);
	const end = intToBuffer(height, 4, BIG_ENDIAN);
	const results = await paramsStore.iterate({
		start,
		end,
	});
	if (results.length <= 1) {
		return;
	}
	// Delete all BFT Parameters except the one of largest height which is at most the input height
	for (let i = 0; i < results.length - 1; i += 1) {
		await paramsStore.del(results[i].key);
	}
};

export class BFTParametersCache {
	private readonly _paramsStore: ImmutableSubStore;
	private readonly _cache: Map<number, BFTParameters>;

	public constructor(paramsStore: ImmutableSubStore) {
		this._paramsStore = paramsStore;
		this._cache = new Map<number, BFTParameters>();
	}

	public async cache(from: number, to: number): Promise<void> {
		const start = intToBuffer(from, 4, BIG_ENDIAN);
		const end = intToBuffer(to, 4, BIG_ENDIAN);
		const results = await this._paramsStore.iterateWithSchema<BFTParameters>(
			{
				start,
				end,
				reverse: true,
			},
			bftParametersSchema,
		);
		if (from > 0) {
			const nextLowest = await getBFTParameters(this._paramsStore, from);
			results.push({
				key: intToBuffer(from, 4, BIG_ENDIAN),
				value: nextLowest,
			});
		}
		for (let height = from; height <= to; height += 1) {
			// results has key is in order of height desc
			const paramKV = results.find(r => {
				const keyHeight = r.key.readUInt32BE(0);
				return keyHeight <= height;
			});
			if (!paramKV) {
				throw new Error('Invalid state. BFT parameters should always exist in cache range');
			}
			this._cache.set(height, paramKV.value);
		}
	}

	public async getParameters(height: number): Promise<BFTParameters> {
		const cachedValue = this._cache.get(height);
		if (cachedValue) {
			return cachedValue;
		}
		const params = await getBFTParameters(this._paramsStore, height);
		this._cache.set(height, params);
		return params;
	}
}
