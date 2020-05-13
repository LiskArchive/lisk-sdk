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
import {
	writeVarInt,
	readVarInt,
	readSignedVarInt,
	writeSignedVarInt,
} from '../src/varint';

describe('varint', () => {
	describe('writer', () => {
		it('should encode uint32', () => {
			expect(writeVarInt(0, { dataType: 'uint32' })).toEqual(
				Buffer.from('00', 'hex'),
			);
			expect(writeVarInt(300, { dataType: 'uint32' })).toEqual(
				Buffer.from('ac02', 'hex'),
			);
			expect(writeVarInt(2147483647, { dataType: 'uint32' })).toEqual(
				Buffer.from('ffffffff07', 'hex'),
			);
			expect(writeVarInt(4294967295, { dataType: 'uint32' })).toEqual(
				Buffer.from('ffffffff0f', 'hex'),
			);
		});

		it('should encode uint64', () => {
			expect(writeVarInt(BigInt(0), { dataType: 'uint64' })).toEqual(
				Buffer.from('00', 'hex'),
			);
			expect(writeVarInt(BigInt(300), { dataType: 'uint64' })).toEqual(
				Buffer.from('ac02', 'hex'),
			);
			expect(writeVarInt(BigInt(2147483647), { dataType: 'uint64' })).toEqual(
				Buffer.from('ffffffff07', 'hex'),
			);
			expect(writeVarInt(BigInt(4294967295), { dataType: 'uint64' })).toEqual(
				Buffer.from('ffffffff0f', 'hex'),
			);
			expect(writeVarInt(BigInt('8294967295'), { dataType: 'uint64' })).toEqual(
				Buffer.from('ffcfacf31e', 'hex'),
			);
			expect(
				writeVarInt(BigInt('18446744073709551615'), { dataType: 'uint64' }),
			).toEqual(Buffer.from('ffffffffffffffffff01', 'hex'));
		});

		it('should encode sint32', () => {
			expect(writeSignedVarInt(0, { dataType: 'sint32' })).toEqual(
				Buffer.from('00', 'hex'),
			);
			expect(writeSignedVarInt(1300, { dataType: 'sint32' })).toEqual(
				Buffer.from('a814', 'hex'),
			);
			expect(writeSignedVarInt(-1300, { dataType: 'sint32' })).toEqual(
				Buffer.from('a714', 'hex'),
			);
			expect(writeSignedVarInt(2147483647, { dataType: 'sint32' })).toEqual(
				Buffer.from('feffffff0f', 'hex'),
			);
			expect(writeSignedVarInt(-2147483648, { dataType: 'sint32' })).toEqual(
				Buffer.from('ffffffff0f', 'hex'),
			);
		});

		it('should encode sint64', () => {
			expect(writeSignedVarInt(BigInt(0), { dataType: 'sint64' })).toEqual(
				Buffer.from('00', 'hex'),
			);
			expect(writeSignedVarInt(BigInt(1300), { dataType: 'sint64' })).toEqual(
				Buffer.from('a814', 'hex'),
			);
			expect(writeSignedVarInt(BigInt(-1300), { dataType: 'sint64' })).toEqual(
				Buffer.from('a714', 'hex'),
			);
			expect(
				writeSignedVarInt(BigInt(2147483647), { dataType: 'sint64' }),
			).toEqual(Buffer.from('feffffff0f', 'hex'));
			expect(
				writeSignedVarInt(BigInt(-2147483648), { dataType: 'sint64' }),
			).toEqual(Buffer.from('ffffffff0f', 'hex'));
			expect(
				writeSignedVarInt(BigInt('9223372036854775807'), {
					dataType: 'sint64',
				}),
			).toEqual(Buffer.from('feffffffffffffffff01', 'hex'));
			expect(
				writeSignedVarInt(BigInt('-9223372036854775808'), {
					dataType: 'sint64',
				}),
			).toEqual(Buffer.from('ffffffffffffffffff01', 'hex'));
		});
	});

	describe('reader', () => {
		it('should decode uint32', () => {
			expect(
				readVarInt(Buffer.from('00', 'hex'), { dataType: 'uint32' }),
			).toEqual(0);
			expect(
				readVarInt(Buffer.from('ac02', 'hex'), { dataType: 'uint32' }),
			).toEqual(300);
			expect(
				readVarInt(Buffer.from('ffffffff07', 'hex'), { dataType: 'uint32' }),
			).toEqual(2147483647);
			expect(
				readVarInt(Buffer.from('ffffffff0f', 'hex'), { dataType: 'uint32' }),
			).toEqual(4294967295);
		});

		it('should fail to decode uint32 when input is out of range', () => {
			expect(() =>
				readVarInt(Buffer.from('ffffffff7f', 'hex'), { dataType: 'uint32' }),
			).toThrow('Value out of range of uint32');
		});

		it('should decode uint64', () => {
			expect(
				readVarInt(Buffer.from('00', 'hex'), { dataType: 'uint64' }),
			).toEqual(BigInt(0));
			expect(
				readVarInt(Buffer.from('ac02', 'hex'), { dataType: 'uint64' }),
			).toEqual(BigInt(300));
			expect(
				readVarInt(Buffer.from('ffffffff07', 'hex'), { dataType: 'uint64' }),
			).toEqual(BigInt(2147483647));
			expect(
				readVarInt(Buffer.from('ffffffff0f', 'hex'), { dataType: 'uint64' }),
			).toEqual(BigInt(4294967295));
			expect(
				readVarInt(Buffer.from('ffcfacf31e', 'hex'), { dataType: 'uint64' }),
			).toEqual(BigInt(8294967295));
			expect(
				readVarInt(Buffer.from('ffffffffffffffffff01', 'hex'), {
					dataType: 'uint64',
				}),
			).toEqual(BigInt('18446744073709551615'));
		});

		it('should decode sint32', () => {
			expect(
				readSignedVarInt(Buffer.from('00', 'hex'), { dataType: 'sint32' }),
			).toEqual(0);
			expect(
				readSignedVarInt(Buffer.from('a814', 'hex'), { dataType: 'sint32' }),
			).toEqual(1300);
			expect(
				readSignedVarInt(Buffer.from('a714', 'hex'), { dataType: 'sint32' }),
			).toEqual(-1300);
			expect(
				readSignedVarInt(Buffer.from('feffffff0f', 'hex'), {
					dataType: 'sint32',
				}),
			).toEqual(2147483647);
			expect(
				readSignedVarInt(Buffer.from('ffffffff0f', 'hex'), {
					dataType: 'sint32',
				}),
			).toEqual(-2147483648);
		});

		it('should decode sint64', () => {
			expect(
				readSignedVarInt(Buffer.from('00', 'hex'), { dataType: 'sint64' }),
			).toEqual(BigInt(0));
			expect(
				readSignedVarInt(Buffer.from('a814', 'hex'), { dataType: 'sint64' }),
			).toEqual(BigInt(1300));
			expect(
				readSignedVarInt(Buffer.from('a714', 'hex'), { dataType: 'sint64' }),
			).toEqual(BigInt(-1300));
			expect(
				readSignedVarInt(Buffer.from('feffffff0f', 'hex'), {
					dataType: 'sint64',
				}),
			).toEqual(BigInt(2147483647));
			expect(
				readSignedVarInt(Buffer.from('ffffffff0f', 'hex'), {
					dataType: 'sint64',
				}),
			).toEqual(BigInt(-2147483648));
			expect(
				readSignedVarInt(Buffer.from('feffffffffffffffff01', 'hex'), {
					dataType: 'sint64',
				}),
			).toEqual(BigInt('9223372036854775807'));
			expect(
				readSignedVarInt(Buffer.from('ffffffffffffffffff01', 'hex'), {
					dataType: 'sint64',
				}),
			).toEqual(BigInt('-9223372036854775808'));
		});
	});
});
