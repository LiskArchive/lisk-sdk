/*
 * Copyright © 2022 Lisk Foundation
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

import { q, q96 } from '../../src/math';

/**
 * For the test cases `binary` represents the calculation result in binary.
 */
describe('Q', () => {
	//  In this test Q8 is used as example because 8 bit is easier to generate the tests.
	// For Q8 after 9th bit should be ignored
	const base = 8;
	const pow2 = (val: number | bigint) => BigInt(2) ** BigInt(val);
	// mulBasePow2 computes 2 ** base * val
	const mulBasePow2 = (b: number, val: number | bigint) => pow2(b) * BigInt(val);
	// pow2BaseDiffAddition accumulates 2 ** (base-vals[n])
	const pow2BaseDiffAddition = (b: number, vals: number[]) =>
		vals.reduce((prev, curr) => prev + pow2(b - curr), BigInt(0));
	// ExpectedQ generates the Q format big integer
	// int: integer part of the result
	// decimalBinaryPosthe elements should bein the array means the position of "1" in binary.
	const expectedQ = (b: number, int: number, decimalBinaryPos?: number[]) =>
		mulBasePow2(b, int) + pow2BaseDiffAddition(b, decimalBinaryPos ?? []);

	describe('constructor', () => {
		const numberCases = [
			[{ input: 0, expected: expectedQ(base, 0), binary: '0' }],
			[{ input: 10, expected: expectedQ(base, 10), binary: '1010' }],
			[{ input: 10.25, expected: expectedQ(base, 10, [2]), binary: '1010.01' }],
			[{ input: 0.25, expected: expectedQ(base, 0, [2]), binary: '0.01' }],
			[{ input: 0.23, expected: expectedQ(base, 0, [3, 4, 5, 7]), binary: '0.0011101011' }],
		];
		it.each(numberCases)('should create Q from number', val => {
			const actual = q(val.input, base);
			expect(actual['_val']).toEqual(val.expected);
		});

		const bigintCases = [[{ input: BigInt(10), expected: mulBasePow2(base, 10) }]];

		it.each(bigintCases)('should create Q from bigint', val => {
			const actual = q(val.input, base);
			expect(actual['_val']).toEqual(val.expected);
		});

		const bytesCases = [
			[{ input: 'a40000000000000000000000', expected: 'a40000000000000000000000' }],
		];

		it.each(bytesCases)('should create Q from Buffer', val => {
			const actual = q(Buffer.from(val.input, 'hex'), base);
			expect(actual.toBuffer().toString('hex')).toEqual(val.expected);
		});
	});

	describe('add', () => {
		const cases = [
			[
				{
					original: 10.25,
					value: 20.3,
					expected: expectedQ(base, 30, [1, 5, 6]),
					binary: '11110.1000110011',
				},
			],
			[{ original: 10, value: 20, expected: expectedQ(base, 30), binary: '11110' }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).add(q(val.value, base))['_val']).toEqual(val.expected);
		});
	});

	describe('sub', () => {
		const cases = [
			[
				{
					original: 20.3,
					value: 10.25,
					expected: expectedQ(base, 10, [5, 6]),
					binary: '1010.0000110011',
				},
			],
			[{ original: 20, value: 10, expected: expectedQ(base, 10), binary: '11110' }],
			[{ original: 20.444444, value: 20.444444, expected: BigInt(0), binary: '0' }],
			[{ original: 20.444444, value: 20.444445, expected: BigInt(0), binary: '0' }],
			[{ original: 20.444445, value: 20.444444, expected: BigInt(0), binary: '0' }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).sub(q(val.value, base))['_val']).toEqual(val.expected);
		});

		it('should result in empty bytes for zero value', () => {
			expect(q(20.444444, base).sub(q(20.444444, base)).toBuffer()).toEqual(Buffer.alloc(0));
		});
	});

	describe('mul', () => {
		const cases = [
			[
				{
					original: 10.25,
					value: 20.3333,
					expected: expectedQ(base, 208, [2, 3, 6, 7, 8]),
					binary: '11010000.0110011111',
				},
			],
			[{ original: 10, value: 20, expected: expectedQ(base, 200), binary: '11001000' }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).mul(q(val.value, base))['_val']).toEqual(val.expected);
		});

		it('should result in empty bytes for zero value', () => {
			expect(q(20.444444, base).mul(q(0, base)).toBuffer()).toEqual(Buffer.alloc(0));
		});
	});

	describe('div', () => {
		const cases = [
			[{ original: 60, value: 20, expected: expectedQ(base, 3), binary: '11110' }],
			[
				{
					original: 60,
					value: 33,
					expected: expectedQ(base, 1, [1, 2, 4, 8]),
					binary: '1.1101000101110100010111',
				},
			],
			[
				{
					original: 6,
					value: 33,
					expected: expectedQ(base, 0, [3, 5, 6, 7]),
					binary: '0.00101110100010111010001',
				},
			],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).div(q(val.value, base))['_val']).toEqual(val.expected);
		});

		it('should result in empty bytes for zero value', () => {
			expect(q(0, base).mul(q(20.444444, base)).toBuffer()).toEqual(Buffer.alloc(0));
		});
	});

	describe('muldiv', () => {
		const cases = [
			[
				{
					original: 10.25,
					mul: 20.3333,
					div: 10,
					expected: expectedQ(base, 20, [1, 2, 4, 6, 7, 8]),
					binary: '10100.1101011100011101111001101001',
				},
			],
			[
				{
					original: 30,
					mul: 20,
					div: 33,
					expected: expectedQ(base, 18, [3, 5, 6, 7]),
					binary: '10010.0010111010001',
				},
			],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).muldiv(q(val.mul, base), q(val.div, base))['_val']).toEqual(
				val.expected,
			);
		});

		it('should result in empty bytes for zero value', () => {
			expect(q(0, base).muldiv(q(20.444444, base), q(3, base)).toBuffer()).toEqual(Buffer.alloc(0));
		});
	});

	describe('inv', () => {
		const cases = [
			[{ original: 0.25, expected: expectedQ(base, 4), binary: '' }],
			[
				{
					original: 1.5,
					expected: expectedQ(base, 0, [1, 3, 5, 7]),
					binary: '0.10101010101010101010',
				},
			],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).inv()['_val']).toEqual(val.expected);
		});
	});

	describe('eq', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: false }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).eq(q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('lte', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: true }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).lte(q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('lt', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: true }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).lt(q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('gte', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: false }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).gte(q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('gt', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: false }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).gt(q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('ceil', () => {
		const cases = [
			[{ original: 0, expected: BigInt(0) }],
			[{ original: 0.1, expected: BigInt(1) }],
			[{ original: 200, expected: BigInt(200) }],
			[{ original: 200.32, expected: BigInt(201) }],
			[{ original: 200.999999, expected: BigInt(201) }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).ceil()).toEqual(val.expected);
		});
	});

	describe('floor', () => {
		const cases = [
			[{ original: 200.25, expected: BigInt(200) }],
			[{ original: 200.999999, expected: BigInt(200) }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(q(val.original, base).floor()).toEqual(val.expected);
		});
	});

	describe('q96', () => {
		it('should compute add', () => {
			expect(q96(18.875).add(q96(18.875))).toEqual(q96(37.75));
		});

		it('should compute sub', () => {
			expect(q96(10.5).sub(q96(6.125))).toEqual(q96(4.375));
		});

		it('should compute mul', () => {
			expect(q96(3.125).mul(q96(12.1875))).toEqual(q96(38.0859375));
		});

		it('should compute div', () => {
			expect(q96(14).div(q96(4))).toEqual(q96(3.5));
		});

		it('should compute muldiv', () => {
			const oneThird = q96(1).div(q96(3));
			const quarter = q96(1).div(q96(4));
			const fourNinths = q96(4).div(q96(9));

			// there is round down with mul. Result hsould be different
			const muldivResult = oneThird.muldiv(oneThird, quarter);
			const mulThenDivResult = oneThird.mul(oneThird).div(quarter);
			expect(muldivResult).not.toEqual(mulThenDivResult);
			// muldiv should have closer value to fourNinths
			expect(fourNinths.sub(muldivResult).lt(fourNinths.sub(mulThenDivResult))).toBeTrue();
		});
	});
});
