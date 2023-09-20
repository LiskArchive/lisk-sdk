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

import { MAX_SINT32, MAX_SINT64, MAX_UINT32, MAX_UINT64 } from '@liskhq/lisk-validator';

import {
	writeUInt32,
	writeSInt32,
	writeSInt64,
	writeUInt64,
	readSInt32,
	readUInt32,
	readSInt64,
	readUInt64,
} from '../src/varint';

describe('varint', () => {
	describe('writer', () => {
		it('should fail to encode uint32 when input is out of range', () => {
			expect(() => writeUInt32(MAX_UINT32 + 1)).toThrow('Value out of range of uint32');
		});

		it('should fail to encode uint64 when input is out of range', () => {
			expect(() => writeUInt64(MAX_UINT64 + BigInt(1))).toThrow('Value out of range of uint64');
		});

		it('should fail to encode sint32 when input is out of range', () => {
			expect(() => writeSInt32(MAX_SINT32 + 1)).toThrow('Value out of range of sint32');
		});

		it('should fail to encode sint64 when input is out of range', () => {
			expect(() => writeSInt64(MAX_SINT64 + BigInt(1))).toThrow('Value out of range of sint64');
		});

		it('should encode uint32', () => {
			expect(writeUInt32(0)).toEqual(Buffer.from('00', 'hex'));
			expect(writeUInt32(300)).toEqual(Buffer.from('ac02', 'hex'));
			expect(writeUInt32(2147483647)).toEqual(Buffer.from('ffffffff07', 'hex'));
			expect(writeUInt32(4294967295)).toEqual(Buffer.from('ffffffff0f', 'hex'));
		});

		it('should encode uint64', () => {
			expect(writeUInt64(BigInt(0))).toEqual(Buffer.from('00', 'hex'));
			expect(writeUInt64(BigInt(300))).toEqual(Buffer.from('ac02', 'hex'));
			expect(writeUInt64(BigInt(2147483647))).toEqual(Buffer.from('ffffffff07', 'hex'));
			expect(writeUInt64(BigInt(4294967295))).toEqual(Buffer.from('ffffffff0f', 'hex'));
			expect(writeUInt64(BigInt('8294967295'))).toEqual(Buffer.from('ffcfacf31e', 'hex'));
			expect(writeUInt64(BigInt('18446744073709551615'))).toEqual(
				Buffer.from('ffffffffffffffffff01', 'hex'),
			);
		});

		it('should encode sint32', () => {
			expect(writeSInt32(0)).toEqual(Buffer.from('00', 'hex'));
			expect(writeSInt32(1300)).toEqual(Buffer.from('a814', 'hex'));
			expect(writeSInt32(-1300)).toEqual(Buffer.from('a714', 'hex'));
			expect(writeSInt32(2147483647)).toEqual(Buffer.from('feffffff0f', 'hex'));
			expect(writeSInt32(-2147483648)).toEqual(Buffer.from('ffffffff0f', 'hex'));
		});

		it('should encode sint64', () => {
			expect(writeSInt64(BigInt(0))).toEqual(Buffer.from('00', 'hex'));
			expect(writeSInt64(BigInt(1300))).toEqual(Buffer.from('a814', 'hex'));
			expect(writeSInt64(BigInt(-1300))).toEqual(Buffer.from('a714', 'hex'));
			expect(writeSInt64(BigInt(2147483647))).toEqual(Buffer.from('feffffff0f', 'hex'));
			expect(writeSInt64(BigInt(-2147483648))).toEqual(Buffer.from('ffffffff0f', 'hex'));
			expect(writeSInt64(BigInt('9223372036854775807'))).toEqual(
				Buffer.from('feffffffffffffffff01', 'hex'),
			);
			expect(writeSInt64(BigInt('-9223372036854775808'))).toEqual(
				Buffer.from('ffffffffffffffffff01', 'hex'),
			);
		});
	});

	describe('reader', () => {
		it('should decode uint32', () => {
			expect(readUInt32(Buffer.from('00', 'hex'), 0)).toEqual([0, 1]);
			expect(readUInt32(Buffer.from('ac02', 'hex'), 0)).toEqual([300, 2]);
			expect(readUInt32(Buffer.from('ffffffff07', 'hex'), 0)).toEqual([2147483647, 5]);
			expect(readUInt32(Buffer.from('001122ffffffff0f', 'hex'), 3)).toEqual([4294967295, 5]);
		});

		it('should fail to decode uint32 when input is out of range', () => {
			expect(() => readUInt32(Buffer.from('118080808010', 'hex'), 1)).toThrow(
				'Value out of range of uint32',
			);
		});

		it('should decode uint64', () => {
			expect(readUInt64(Buffer.from('00', 'hex'), 0)).toEqual([BigInt(0), 1]);
			expect(readUInt64(Buffer.from('ac02', 'hex'), 0)).toEqual([BigInt(300), 2]);
			expect(readUInt64(Buffer.from('ffffffff07', 'hex'), 0)).toEqual([BigInt(2147483647), 5]);
			expect(readUInt64(Buffer.from('ffffffff0f', 'hex'), 0)).toEqual([BigInt(4294967295), 5]);
			expect(readUInt64(Buffer.from('ffcfacf31e', 'hex'), 0)).toEqual([BigInt(8294967295), 5]);
			expect(readUInt64(Buffer.from('99ffffffffffffffffff01', 'hex'), 1)).toEqual([
				BigInt('18446744073709551615'),
				10,
			]);
		});

		it('should fail to decode uint64 when input is out of range', () => {
			expect(() => readUInt64(Buffer.from('80808080808080808002', 'hex'), 0)).toThrow(
				'Value out of range of uint64',
			);
		});

		it('should decode sint32', () => {
			expect(readSInt32(Buffer.from('00', 'hex'), 0)).toEqual([0, 1]);
			expect(readSInt32(Buffer.from('a814', 'hex'), 0)).toEqual([1300, 2]);
			expect(readSInt32(Buffer.from('a714', 'hex'), 0)).toEqual([-1300, 2]);
			expect(readSInt32(Buffer.from('feffffff0f', 'hex'), 0)).toEqual([2147483647, 5]);
			expect(readSInt32(Buffer.from('012345ffffffff0f', 'hex'), 3)).toEqual([-2147483648, 5]);
		});

		it('should decode sint64', () => {
			expect(readSInt64(Buffer.from('00', 'hex'), 0)).toEqual([BigInt(0), 1]);
			expect(readSInt64(Buffer.from('a814', 'hex'), 0)).toEqual([BigInt(1300), 2]);
			expect(readSInt64(Buffer.from('a714', 'hex'), 0)).toEqual([BigInt(-1300), 2]);
			expect(readSInt64(Buffer.from('feffffff0f', 'hex'), 0)).toEqual([BigInt(2147483647), 5]);
			expect(readSInt64(Buffer.from('ffffffff0f', 'hex'), 0)).toEqual([BigInt(-2147483648), 5]);
			expect(readSInt64(Buffer.from('feffffffffffffffff01', 'hex'), 0)).toEqual([
				BigInt('9223372036854775807'),
				10,
			]);
			expect(readSInt64(Buffer.from('0000ffffffffffffffffff01', 'hex'), 2)).toEqual([
				BigInt('-9223372036854775808'),
				10,
			]);
		});
	});
});
