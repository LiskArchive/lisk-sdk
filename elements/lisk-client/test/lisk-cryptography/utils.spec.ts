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
 *
 */

import { cryptography } from '../../src';

const {
	utils: { generateHashOnionSeed, hexToBuffer, intToBuffer, hashOnion, hash: hashFunction },
} = cryptography;

describe('buffer', () => {
	const defaultBuffer = Buffer.from('\xe5\xe4\xf6');
	const defaultHex = 'c3a5c3a4c3b6';

	describe('#hexToBuffer', () => {
		it('should create a Buffer from a hex string', () => {
			const buffer = hexToBuffer(defaultHex);
			expect(buffer).toEqual(defaultBuffer);
		});

		it('should throw TypeError with number', () => {
			expect(hexToBuffer.bind(null, 123 as any)).toThrow(TypeError);
		});

		it('should throw TypeError with object', () => {
			expect(hexToBuffer.bind(null, {} as any)).toThrow(TypeError);
		});

		it('should throw an error for a non-string input with custom argument name', () => {
			expect(hexToBuffer.bind(null, {} as any, 'Custom')).toThrow('Custom must be a string.');
		});

		it('should throw TypeError with non hex string', () => {
			expect(hexToBuffer.bind(null, 'yKJj')).toThrow(TypeError);
		});

		it('should throw TypeError with partially correct hex string', () => {
			expect(hexToBuffer.bind(null, 'Abxzzzz')).toThrow(TypeError);
		});

		it('should throw TypeError with odd number of string with partially correct hex string', () => {
			expect(hexToBuffer.bind(null, 'Abxzzab')).toThrow(TypeError);
		});

		it('should throw TypeError with odd number hex string with invalid hex', () => {
			expect(hexToBuffer.bind(null, '123xxxx')).toThrow(TypeError);
		});

		it('should throw an error for a non-hex string input with custom argument name', () => {
			expect(hexToBuffer.bind(null, 'yKJj', 'Custom')).toThrow(
				'Custom must be a valid hex string.',
			);
		});

		it('should throw TypeError with odd-length hex string', () => {
			expect(hexToBuffer.bind(null, 'c3a5c3a4c3b6a')).toThrow(TypeError);
		});

		it('should throw an error for an odd-length hex string input with custom argument name', () => {
			expect(hexToBuffer.bind(null, 'c3a5c3a4c3b6a', 'Custom')).toThrow(
				'Custom must have a valid length of hex string.',
			);
		});
	});

	describe('#intToBuffer', () => {
		it('should convert a integer to a 1 byte buffer when size=1, endian=big', () => {
			const value = 127;
			const size = 1;
			const endian = 'big';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt8(value, 0);

			expect(intToBuffer(value, size, endian)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 1 byte buffer when size=1, endian=little', () => {
			const value = 127;
			const size = 1;
			const endian = 'little';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt8(value, 0);

			expect(intToBuffer(value, size, endian)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 2 bytes big endian buffer when size=2, endian=big', () => {
			const value = 32767;
			const size = 2;
			const endian = 'big';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt16BE(value, 0);

			expect(intToBuffer(value, size, endian)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 2 bytes little endian buffer when size=2, endian=little', () => {
			const value = 3276;
			const size = 2;
			const endian = 'little';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt16LE(value, 0);

			expect(intToBuffer(value, size, endian)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 4 bytes big endian buffer when size=4, endian=big', () => {
			const value = 2147483647;
			const size = 4;
			const endian = 'big';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt32BE(value, 0);

			expect(intToBuffer(value, size, endian)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 4 bytes little endian buffer when size=4, endian=little', () => {
			const value = 2147483647;
			const size = 4;
			const endian = 'little';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt32LE(value, 0);

			expect(intToBuffer(value, size, endian)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 4 bytes big endian buffer when no size or endian is given', () => {
			const value = 2147483647;
			const size = 4;

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt32BE(value, 0);

			expect(intToBuffer(value, size)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 8 bytes big endian buffer when size=8, endian=big', () => {
			const value = '58191285901858109';
			const size = 8;
			const endian = 'big';

			const expectedBuffer = Buffer.from('00cebcaa8d34153d', 'hex');

			expect(intToBuffer(value, size, endian)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 8 bytes little endian buffer when size=8, endian=little', () => {
			const value = '58191285901858109';
			const size = 8;
			const endian = 'little';

			const expectedBuffer = Buffer.from('3d15348daabcce00', 'hex');

			expect(intToBuffer(value, size, endian)).toEqual(expectedBuffer);
		});

		it('should convert a integer to a 8 bytes big endian buffer when size=8 and endian is not given', () => {
			const value = '58191285901858109';
			const size = 8;

			const expectedBuffer = Buffer.from('00cebcaa8d34153d', 'hex');

			expect(intToBuffer(value, size)).toEqual(expectedBuffer);
		});
	});

	describe('hash onion', () => {
		describe('#generateHashOnionSeed', () => {
			it('should generate a random buffer', () => {
				const seed1 = generateHashOnionSeed().toString('hex');
				const seed2 = generateHashOnionSeed().toString('hex');

				expect(seed1).not.toEqual(seed2);
			});

			it('should generate a random buffer with 16 bytes', () => {
				const seed = generateHashOnionSeed();
				expect(seed).toHaveLength(16);
			});
		});

		describe('#hashOnion', () => {
			let seed: Buffer;
			let hashOnionBuffers: ReadonlyArray<Buffer>;

			beforeEach(() => {
				seed = generateHashOnionSeed();
				hashOnionBuffers = hashOnion(seed);
			});

			it('should return 1001 hash onion hashes checkpoints by default', () => {
				expect(hashOnionBuffers).toHaveLength(1001);
			});

			it('should return hash onion hashes which includes seed as the last element', () => {
				expect(hashOnionBuffers[1000]).toEqual(seed);
			});

			it('should be able to calculate the checkpoint from another checkpoint', () => {
				const firstDistanceHashes = hashOnion(hashOnionBuffers[1].subarray(), 1000, 1);
				expect(firstDistanceHashes[0]).toEqual(hashOnionBuffers[0]);
				expect(firstDistanceHashes[1000]).toEqual(hashOnionBuffers[1]);
			});
		});
	});

	describe('hash', () => {
		describe('#hash', () => {
			const defaultText = 'text123*';
			let arrayToHash: ReadonlyArray<number>;
			let defaultHash: Buffer;

			beforeEach(() => {
				defaultHash = Buffer.from(
					'7607d6792843d6003c12495b54e34517a508d2a8622526aff1884422c5478971',
					'hex',
				);
				arrayToHash = [1, 2, 3];
			});

			it('should generate a sha256 hash from a Buffer', () => {
				const testBuffer = Buffer.from(defaultText);
				const hash = hashFunction(testBuffer);
				expect(hash).toEqual(defaultHash);
			});

			it('should generate a sha256 hash from a utf8 string', () => {
				const hash = hashFunction(defaultText, 'utf8');
				expect(hash).toEqual(defaultHash);
			});

			it('should generate a sha256 hash from a hex string', () => {
				const testHex = Buffer.from(defaultText).toString('hex');
				const hash = hashFunction(testHex, 'hex');
				expect(hash).toEqual(defaultHash);
			});

			it('should throw on unknown format when trying a string with format "utf32"', () => {
				expect(hashFunction.bind(null, defaultText, 'utf32')).toThrow(
					'Unsupported string format. Currently only `hex` and `utf8` are supported.',
				);
			});

			it('should throw on unknown format when using an array', () => {
				expect(hashFunction.bind(null, arrayToHash as any)).toThrow(
					'Unsupported data:1,2,3 and format:undefined. Currently only Buffers or hex and utf8 strings are supported.',
				);
			});
		});
	});
});
