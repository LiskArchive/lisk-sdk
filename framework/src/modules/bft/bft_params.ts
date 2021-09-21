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
import { ImmutableSubStore } from '../../node/state_machine';
import { SubStore } from '../../node/state_machine/types';
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
	const exist = await paramsStore.has(intToBuffer(height, 4, BIG_ENDIAN));
	if (!exist) {
		return;
	}
	const start = intToBuffer(0, 4, BIG_ENDIAN);
	const end = intToBuffer(Math.max(height - 1, 0), 4, BIG_ENDIAN);
	const results = await paramsStore.iterate({
		start,
		end,
	});
	for (const result of results) {
		await paramsStore.del(result.key);
	}
};

export class BFTParametersCache {
	private readonly _paramsStore: ImmutableSubStore;
	private readonly _cache: Map<number, BFTParameters>;

	public constructor(paramsStore: ImmutableSubStore) {
		this._paramsStore = paramsStore;
		this._cache = new Map<number, BFTParameters>();
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
