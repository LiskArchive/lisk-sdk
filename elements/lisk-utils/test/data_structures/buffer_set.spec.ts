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
import { BufferSet } from '../../src/data_structures/buffer_set';

describe('BufferSet', () => {
	let set: BufferSet;

	beforeEach(() => {
		set = new BufferSet();
	});

	describe('delete', () => {
		it('should delete the data using the key', () => {
			set.add(Buffer.from('123'));
			set.delete(Buffer.from('123'));
			expect(set.size).toBe(0);
		});

		it('should not delete if the data does not exist', () => {
			set.add(Buffer.from('123'));
			set.delete(Buffer.from('123'));
			expect(set.size).toBe(0);
		});
	});

	describe('add', () => {
		it('should add to the data if it does not exist', () => {
			set.add(Buffer.from('123'));
			expect(set.size).toBe(1);
		});

		it('should not add the data if it exists', () => {
			set.add(Buffer.from('123'));
			set.add(Buffer.from('123'));
			expect(set.size).toBe(1);
		});
	});

	describe('has', () => {
		it('should return true if data exists', () => {
			set.add(Buffer.from('123'));
			expect(set.has(Buffer.from('123'))).toBeTrue();
		});

		it('should return false if data does not exist', () => {
			set.add(Buffer.from('123'));
			expect(set.has(Buffer.from('456'))).toBeFalse();
		});
	});

	describe('size', () => {
		it('should return the correct size', () => {
			set.add(Buffer.from('123'));
			set.add(Buffer.from('123'));
			set.add(Buffer.from('456'));
			expect(set.size).toBe(2);
		});
	});

	describe('iterator', () => {
		it('should be able to iterate through all the data', () => {
			set.add(Buffer.from('123'));
			set.add(Buffer.from('123'));
			set.add(Buffer.from('456'));
			expect.assertions(2);
			for (const val of set) {
				expect(val).toBeInstanceOf(Buffer);
			}
		});
	});
});
