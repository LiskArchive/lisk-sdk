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
import { BufferMap } from '../../src/data_structures/buffer_map';

describe('BufferMap', () => {
	let map: BufferMap<number>;

	beforeEach(() => {
		map = new BufferMap();
	});

	describe('get', () => {
		it('should return undefined if data does not exist', () => {
			const result = map.get(Buffer.from('random value'));
			expect(result).toBeUndefined();
		});

		it('should return value if exist', () => {
			map.set(Buffer.from('key'), 3);
			const result = map.get(Buffer.from('key'));
			expect(result).toBe(3);
		});
	});

	describe('delete', () => {
		it('should delete the data using the key', () => {
			map.set(Buffer.from('key'), 3);
			map.delete(Buffer.from('key'));
			expect(map.get(Buffer.from('key'))).toBeUndefined();
		});

		it('should not delete if the data does not exist', () => {
			expect(() => map.delete(Buffer.from('key'))).not.toThrow();
		});
	});

	describe('set', () => {
		it('should add to the data if it does not exist', () => {
			map.set(Buffer.from('key'), 3);
			const result = map.get(Buffer.from('key'));
			expect(result).toBe(3);
		});

		it('should update the data if it exists', () => {
			map.set(Buffer.from('key'), 3);
			map.set(Buffer.from('key'), 100);
			const result = map.get(Buffer.from('key'));
			expect(result).toBe(100);
		});
	});

	describe('has', () => {
		it('should return true if data exists', () => {
			map.set(Buffer.from('key'), 3);
			const result = map.has(Buffer.from('key'));
			expect(result).toBeTrue();
		});

		it('should return false if data does not exist', () => {
			map.set(Buffer.from('key'), 3);
			const result = map.has(Buffer.from('not-key'));
			expect(result).toBeFalse();
		});
	});

	describe('clone', () => {
		it('should deep copy all the values', () => {
			map.set(Buffer.from('key'), 3);
			const clonedMap = map.clone();
			clonedMap.set(Buffer.from('key'), 99);

			const result = map.get(Buffer.from('key'));
			expect(result).toBe(3);
		});
	});

	describe('entries', () => {
		it('should return all the key value pairs', () => {
			map.set(Buffer.from('key'), 3);
			map.set(Buffer.from('key2'), 100);
			const result = map.entries();
			expect(result).toHaveLength(2);
			expect(result[0][0]).toBeInstanceOf(Buffer);
		});
	});

	describe('values', () => {
		it('should return all the values', () => {
			map.set(Buffer.from('key'), 3);
			map.set(Buffer.from('key2'), 100);
			const result = map.values();
			expect(result).toHaveLength(2);
			expect(result).toEqual([3, 100]);
		});
	});
});
