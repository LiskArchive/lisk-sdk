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

import * as bufferArray from '../../src/objects/buffer_array';

describe('buffer arrays', () => {
	describe('bufferArrayIncludes', () => {
		it('should return true if array includes the value', () => {
			expect(
				bufferArray.bufferArrayIncludes(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					Buffer.from('target'),
				),
			).toBeTrue();
		});

		it('should return false if array does not include the value', () => {
			expect(
				bufferArray.bufferArrayIncludes(
					[Buffer.from('val2'), Buffer.from('val1')],
					Buffer.from('target'),
				),
			).toBeFalse();
		});
	});

	describe('bufferArrayContains', () => {
		it('should return true if array contains the values', () => {
			expect(
				bufferArray.bufferArrayContains(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					[Buffer.from('target'), Buffer.from('val1')],
				),
			).toBeTrue();
		});

		it('should return false if array contains the partial value', () => {
			expect(
				bufferArray.bufferArrayContains(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					[Buffer.from('target'), Buffer.from('val4')],
				),
			).toBeFalse();
		});

		it('should return false if array does not contain the value', () => {
			expect(
				bufferArray.bufferArrayContains(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					[Buffer.from('val3'), Buffer.from('val4')],
				),
			).toBeFalse();
		});
	});

	describe('bufferArrayContainsSome', () => {
		it('should return true if array contains the values', () => {
			expect(
				bufferArray.bufferArrayContainsSome(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					[Buffer.from('target'), Buffer.from('val1')],
				),
			).toBeTrue();
		});

		it('should return false if array contains the partial value', () => {
			expect(
				bufferArray.bufferArrayContainsSome(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					[Buffer.from('target'), Buffer.from('val4')],
				),
			).toBeTrue();
		});

		it('should return false if array does not contain the value', () => {
			expect(
				bufferArray.bufferArrayContainsSome(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					[Buffer.from('val3'), Buffer.from('val4')],
				),
			).toBeFalse();
		});
	});

	describe('bufferArrayEqual', () => {
		it('should return true if array are equal', () => {
			expect(
				bufferArray.bufferArrayEqual(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
				),
			).toBeTrue();
		});

		it('should return false if array are not equal', () => {
			expect(
				bufferArray.bufferArrayEqual(
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
					[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val11')],
				),
			).toBeFalse();
		});
	});

	describe('bufferArraySubtract', () => {
		it('should remove matching buffer', () => {
			const result = bufferArray.bufferArraySubtract(
				[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
				[Buffer.from('val2'), Buffer.from('val1')],
			);
			expect(result).toHaveLength(1);
			expect(result).toEqual([Buffer.from('target')]);
		});

		it('should not remove if non of them matches', () => {
			const result = bufferArray.bufferArraySubtract(
				[Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')],
				[Buffer.from('val3'), Buffer.from('val4')],
			);
			expect(result).toHaveLength(3);
		});
	});

	describe('isBufferArrayOrdered', () => {
		it('should not mutate the original array', () => {
			const original = [Buffer.from('val2'), Buffer.from('target'), Buffer.from('val1')];
			bufferArray.isBufferArrayOrdered(original);
			expect(original[0]).toEqual(Buffer.from('val2'));
		});

		it('should return true if ordered lexicographically', () => {
			expect(
				bufferArray.isBufferArrayOrdered([
					Buffer.from('target'),
					Buffer.from('val1'),
					Buffer.from('val1'),
					Buffer.from('val2'),
				]),
			).toBeTrue();
		});

		it('should return false if ordered lexicographically', () => {
			expect(
				bufferArray.isBufferArrayOrdered([
					Buffer.from('val1'),
					Buffer.from('target'),
					Buffer.from('val1'),
					Buffer.from('val2'),
				]),
			).toBeFalse();
		});

		it('should return true if provided array is empty', () => {
			expect(bufferArray.isBufferArrayOrdered([])).toBeTrue();
		});
	});

	describe('bufferArrayUniqueItems', () => {
		it('should return false if array contain duplicate buffer', () => {
			expect(
				bufferArray.bufferArrayUniqueItems([
					Buffer.from('val1'),
					Buffer.from('val2'),
					Buffer.from('val1'),
				]),
			).toBeFalse();
		});

		it('should return false if array contain reference to same instance', () => {
			const instance = Buffer.from('val1');
			expect(
				bufferArray.bufferArrayUniqueItems([
					Buffer.from('val2'),
					instance,
					Buffer.from('target'),
					instance,
				]),
			).toBeFalse();
		});

		it('should return true if all items are unique', () => {
			expect(
				bufferArray.bufferArrayUniqueItems([
					Buffer.from('val1'),
					Buffer.from('val2'),
					Buffer.from('target'),
				]),
			).toBeTrue();
		});

		it('should return true if provided array is empty', () => {
			expect(bufferArray.bufferArrayUniqueItems([])).toBeTrue();
		});
	});
});
