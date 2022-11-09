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

import { Q, Q_OPERATION } from '../../src/math';

describe('Q', () => {
	const base = 8;
	const pow2 = (val: number | bigint) => BigInt(2) ** BigInt(val);
	// mulBasePow2 computes 2 ** base * val
	const mulBasePow2 = (b: number, val: number | bigint) => pow2(b) * BigInt(val);
	// pow2BaseDiffAddition accumulates 2 ** (base-vals[n])
	const pow2BaseDiffAddition = (b: number, vals: number[]) =>
		vals.reduce((prev, curr) => prev + pow2(b - curr), BigInt(0));
	const expectedQ = (b: number, int: number, decimalBinaryPos?: number[]) =>
		mulBasePow2(b, int) + pow2BaseDiffAddition(b, decimalBinaryPos ?? []);
	const bigintToHex = (val: bigint) => Buffer.from(val.toString(16), 'hex').toString('hex');

	describe('constructor', () => {
		const numberCases = [
			[{ input: 10, expected: expectedQ(base, 10), binary: '1010' }],
			[{ input: 10.25, expected: expectedQ(base, 10, [2]), binary: '1010.01' }],
			[{ input: 0.25, expected: expectedQ(base, 0, [2]), binary: '0.01' }],
			[{ input: 0.23, expected: expectedQ(base, 0, [3, 4, 5, 7]), binary: '0.0011101011' }],
		];
		it.each(numberCases)('should create Q from number', val => {
			const q = new Q(val.input, base);
			expect(q.toBuffer().toString('hex')).toEqual(bigintToHex(val.expected));
		});

		const bigintCases = [[{ input: BigInt(10), expected: mulBasePow2(base, 10) }]];

		it.each(bigintCases)('should create Q from bigint', val => {
			const q = new Q(val.input, base);
			expect(q.toBuffer().toString('hex')).toEqual(bigintToHex(val.expected));
		});

		const bytesCases = [
			[{ input: 'a40000000000000000000000', expected: 'a40000000000000000000000' }],
		];

		it.each(bytesCases)('should create Q from Buffer', val => {
			const q = new Q(Buffer.from(val.input, 'hex'), base);
			expect(q.toBuffer().toString('hex')).toEqual(val.expected);
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
			expect(
				new Q(val.original, base).add(new Q(val.value, base)).toBuffer().toString('hex'),
			).toEqual(bigintToHex(val.expected));
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
			expect(
				new Q(val.original, base).sub(new Q(val.value, base)).toBuffer().toString('hex'),
			).toEqual(bigintToHex(val.expected));
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
			expect(
				new Q(val.original, base).mul(new Q(val.value, base)).toBuffer().toString('hex'),
			).toEqual(bigintToHex(val.expected));
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
			expect(
				new Q(val.original, base).div(new Q(val.value, base)).toBuffer().toString('hex'),
			).toEqual(bigintToHex(val.expected));
		});
	});

	describe('mulDiv', () => {
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
			expect(
				new Q(val.original, base)
					.mulDiv(new Q(val.mul, base), new Q(val.div, base))
					.toBuffer()
					.toString('hex'),
			).toEqual(bigintToHex(val.expected));
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
			expect(new Q(val.original, base).inv().toBuffer().toString('hex')).toEqual(
				bigintToHex(val.expected),
			);
		});
	});

	describe('eq', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: false }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(new Q(val.original, base).eq(new Q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('lte', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: true }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(new Q(val.original, base).lte(new Q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('lt', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: true }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(new Q(val.original, base).lt(new Q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('gte', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: false }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(new Q(val.original, base).gte(new Q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('gt', () => {
		const cases = [
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([2, 3, 4]), expected: false }],
			[{ original: Buffer.from([1, 0, 1]), value: Buffer.from([1, 0, 1]), expected: false }],
			[{ original: Buffer.from([10, 0, 1]), value: Buffer.from([1, 0, 1]), expected: true }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(new Q(val.original, base).gt(new Q(val.value, base))).toEqual(val.expected);
		});
	});

	describe('toInt', () => {
		const cases = [
			[{ original: 200.25, expected: BigInt(200), operation: Q_OPERATION.ROUND_DOWN }],
			[{ original: 200.32, expected: BigInt(201), operation: Q_OPERATION.ROUND_UP }],
			[{ original: 200.999999, expected: BigInt(200), operation: Q_OPERATION.ROUND_DOWN }],
			[{ original: 200.999999, expected: BigInt(201), operation: Q_OPERATION.ROUND_UP }],
		];

		it.each(cases)('should result in expected value', val => {
			expect(new Q(val.original, base).toInt(val.operation)).toEqual(val.expected);
		});
	});
});
