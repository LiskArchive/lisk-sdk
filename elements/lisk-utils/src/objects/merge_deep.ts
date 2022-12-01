/*
 * Copyright © 2020 Lisk Foundation
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

interface KVPair {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

const isIterable = (item: unknown): item is KVPair =>
	typeof item === 'object' && item !== null && !Array.isArray(item) && !Buffer.isBuffer(item);

export const mergeDeep = (dest: KVPair, ...srcs: KVPair[]): KVPair => {
	const result = dest; // clone deep here
	if (!isIterable(result)) {
		return result;
	}
	for (const src of srcs) {
		// eslint-disable-next-line no-restricted-syntax
		for (const key in src) {
			if (isIterable(src[key])) {
				if (!result[key]) {
					result[key] = {};
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				mergeDeep(result[key], src[key]);
			} else if (src[key] !== undefined && src[key] !== null) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				result[key] = src[key];
			}
		}
	}
	return result;
};
