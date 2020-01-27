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

import { BlockHeader } from '../../../../src/types';
import { Cache } from '../../../../src/data_access/cache';
import { BlockHeader as BlockHeaderInstance } from '../../../fixtures/block';

describe('data_access.cache', () => {
	const DEFAULT_CACHE_SIZE = 500;
	let cache: Cache<BlockHeader>;

	beforeEach(() => {
		cache = new Cache<BlockHeader>(DEFAULT_CACHE_SIZE);
	});

	describe('constructor', () => {
		it('should initialize private variables', () => {
			expect(cache.size).toEqual(DEFAULT_CACHE_SIZE);
			expect(cache.length).toEqual(0);
			expect(cache.items).toBeEmpty();
		});
	});

	describe('add', () => {
		it('should return the item added to cache list', () => {
			const block = BlockHeaderInstance({ height: 1 });
			cache.add(block);

			expect(cache.items).toStrictEqual([block]);
		});
	});

	describe('empty', () => {
		it('should clear all the items from cache list', () => {
			const blocks = Array.from({ length: 10 }, (_, i) =>
				cache.add(BlockHeaderInstance({ height: i })),
			);

			expect(cache.items).toStrictEqual(blocks[0]);

			cache.empty();
			expect(cache.items).toBeArrayOfSize(0);
			expect(cache.length).toEqual(0);
		});
	});
});
