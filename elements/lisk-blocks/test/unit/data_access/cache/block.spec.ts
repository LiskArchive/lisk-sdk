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

import { BlockCache } from '../../../../src/data_access/cache';
import { BlockHeader as BlockHeaderInstance } from '../../../fixtures/block';

describe('data_access.cache.block', () => {
	const DEFAULT_CACHE_SIZE = 500;
	let blocksCache: BlockCache;

	beforeEach(() => {
		blocksCache = new BlockCache(DEFAULT_CACHE_SIZE);
	});

	describe('constructor', () => {
		it('should initialize private variables', () => {
			expect(blocksCache.size).toEqual(DEFAULT_CACHE_SIZE);
			expect(blocksCache.length).toEqual(0);
			expect(blocksCache.items).toEqual([]);
		});
	});

	describe('add', () => {
		it('should add block header to cache', () => {
			const block = BlockHeaderInstance({ height: 1 });
			blocksCache.add(block);

			expect(blocksCache.items).toStrictEqual([block]);
		});

		it('should only contain maximum of 500 block header at given point in time', () => {
			const [blocks] = Array.from({ length: 510 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i })),
			);
			const blockIds = blocks.map(b => b.id);

			expect(blocksCache.items).toStrictEqual(blocks);
			expect(blocksCache.items.length).toEqual(DEFAULT_CACHE_SIZE);
			expect(blocksCache.getByIDs(blockIds)).toStrictEqual(blocks);
		});

		it('should remove the least height block header and add new heighest height block header', () => {
			const [blocks] = Array.from({ length: 510 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i })),
			);
			const maxHeight = Math.max(...blocksCache.items.map(b => b.height));
			const minHeight = Math.min(...blocksCache.items.map(b => b.height));
			const [lowesHeightBlock] = blocks.filter(b => b.height === minHeight);
			const newBlock = BlockHeaderInstance({ height: maxHeight + 1 });

			expect(blocksCache.getByHeight(minHeight)).toEqual(lowesHeightBlock);

			blocksCache.add(newBlock);
			const [newMinHeightBlock] = blocks.filter(
				b => b.height === minHeight + 1,
			);

			expect(blocksCache.getByHeight(minHeight)).toBeUndefined();
			expect(blocksCache.getByHeight(minHeight + 1)).toEqual(newMinHeightBlock);
			expect(blocksCache.getByHeight(maxHeight + 1)).toEqual(newBlock);
		});

		it('should only allow to insert block header with highest height', () => {
			const [blocks] = Array.from({ length: 510 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i })),
			);
			const minHeight = Math.min(...blocksCache.items.map(b => b.height));
			const [lowesHeightBlock] = blocks.filter(b => b.height === minHeight);
			const newBlock = BlockHeaderInstance({ height: minHeight + 1 });

			expect(blocksCache.getByHeight(minHeight)).toEqual(lowesHeightBlock);

			expect(() => {
				blocksCache.add(newBlock);
			}).toThrow(
				'Block header with height 510 can only be added, instead received height 11',
			);
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
			expect(blocksCache.getByHeightBetween(-100, 99)).toBeEmpty();
			expect(blocksCache.getByHeightBetween(10, 11)).toBeEmpty();
		});

		it('should return all the blocks for given block height range', () => {
			const [blocks] = Array.from({ length: 10 }, (_, i) =>
				blocksCache.add(BlockHeaderInstance({ height: i + 1 })),
			);
			const heights = blocks.map(b => b.height);
			const fromHeight = heights[0];
			const toHeight = heights.length;

			expect(blocksCache.items).toStrictEqual(blocks);
			expect(
				blocksCache.getByHeightBetween(fromHeight, toHeight),
			).toStrictEqual(blocks);
			expect(
				blocksCache.getByHeightBetween(fromHeight + 2, toHeight - 5),
			).toStrictEqual(
				blocks.filter(
					b => b.height >= fromHeight + 2 && b.height <= toHeight - 5,
				),
			);
		});
	});
});
