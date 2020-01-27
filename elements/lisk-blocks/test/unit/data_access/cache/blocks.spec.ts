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

	describe('getByID', () => {
		it('should return undefined if block does not exists', () => {
			const block = BlockHeaderInstance({ height: 1 });
			blocksCache.add(block);

			expect(blocksCache.items).toStrictEqual([block]);
			expect(blocksCache.getByID('123')).toBeUndefined;
		});

		it('should return undefined if block does not exists', () => {
			expect(blocksCache.items).toStrictEqual([]);
			expect(blocksCache.getByID('123')).toBeUndefined;
		});

		it('should return the block for a given id', () => {
			const block = BlockHeaderInstance({ height: 1 });
			blocksCache.add(block);

			expect(blocksCache.items).toStrictEqual([block]);
			expect(blocksCache.getByID(block.id)).toEqual(block);
		});
	});

	describe('getByIDs', () => {
		it('should return empty array if the cache is empty', () => {
			expect(blocksCache.getByIDs(['123'])).toBeEmpty();
		});

		it('should return empty array if matching block ids does not exists', () => {
			const [blocks] = Array.from({ length: 10 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i })),
			);
			const blockIds = blocks.map(b => b.id);

			expect(blocksCache.items).toStrictEqual(blocks);
			expect(blocksCache.getByIDs([...blockIds, '111111'])).toBeEmpty();
		});

		it('should return all the blocks for given block ids', () => {
			const [blocks] = Array.from({ length: 10 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i })),
			);
			const blockIds = blocks.map(b => b.id);

			expect(blocksCache.items).toStrictEqual(blocks);
			expect(blocksCache.getByIDs(blockIds)).toStrictEqual(blocks);
		});
	});

	describe('getByHeightBetween', () => {
		it('should return empty array if the cache is empty', () => {
			expect(blocksCache.getByHeightBetween(1, 7)).toBeEmpty();
		});

		it('should return empty array if blocks does not exists between height range', () => {
			const [blocks] = Array.from({ length: 10 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i + 1 })),
			);

			expect(blocksCache.items).toStrictEqual(blocks);
			expect(blocksCache.getByHeightBetween(0, 99)).toBeEmpty();
		});

		it('should return all the blocks for given block height range', () => {
			const [blocks] = Array.from({ length: 10 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i + 1 })),
			);
			const heights = blocks.map(b => b.height);

			expect(blocksCache.items).toStrictEqual(blocks);
			expect(
				blocksCache.getByHeightBetween(heights[0], heights.length),
			).toStrictEqual(blocks);
		});
	});

	describe('getLastCommonBlockHeader', () => {
		it('should return empty array if the cache is empty', () => {
			expect(blocksCache.getLastCommonBlockHeader(['123'])).toBeUndefined();
		});

		it('should return empty array if matching block ids does not exists', () => {
			const [blocks] = Array.from({ length: 10 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i })),
			);
			const blockIds = blocks.map(b => b.id);

			expect(blocksCache.items).toStrictEqual(blocks);
			expect(
				blocksCache.getLastCommonBlockHeader([...blockIds, '111111']),
			).toBeEmpty();
		});

		it('should return all the blocks for given block ids', () => {
			const [blocks] = Array.from({ length: 10 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i })),
			);
			const blockIds = blocks.map(b => b.id);

			expect(blocksCache.items).toStrictEqual(blocks);
			expect(blocksCache.getLastCommonBlockHeader(blockIds)).toStrictEqual(
				blocks[blocks.length - 1],
			);
		});
	});
});
