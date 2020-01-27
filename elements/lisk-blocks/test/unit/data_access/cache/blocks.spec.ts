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

import { Blocks } from '../../../../src/data_access/cache';
import { BlockHeader as BlockHeaderInstance } from '../../../fixtures/block';

describe('data_access.blocksCache.blocks', () => {
	const DEFAULT_CACHE_SIZE = 500;
	let blocksCache: Blocks;

	beforeEach(() => {
		blocksCache = new Blocks(DEFAULT_CACHE_SIZE);
	});

	describe('constructor', () => {
		it('should initialize private variables', () => {
			expect(blocksCache.size).toEqual(DEFAULT_CACHE_SIZE);
			expect(blocksCache.length).toEqual(0);
			expect(blocksCache.items).toEqual([]);
		});
	});

	describe('getById', () => {
		it('should return the block for a given id', () => {
			const block = BlockHeaderInstance({ height: 1 });
			blocksCache.add(block);

			expect(blocksCache.items).toStrictEqual([block]);
			expect(blocksCache.getById(block.id)).toEqual(block);
		});
	});
});
