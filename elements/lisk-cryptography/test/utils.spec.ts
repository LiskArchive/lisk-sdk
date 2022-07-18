/*
 * Copyright © 2021 Lisk Foundation
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

import {
	bufferToHex,
	generateHashOnionSeed,
	hashOnion,
	hexToBuffer,
	intToBuffer,
	hash as hashFunction,
	getNetworkIdentifier,
	tagMessage,
	createMessageTag,
} from '../src/utils';

describe('utils', () => {
	describe('buffer', () => {
		const defaultBuffer = Buffer.from('\xe5\xe4\xf6');
		const defaultHex = 'c3a5c3a4c3b6';

		describe('#bufferToHex', () => {
			it('should create a hex string from a Buffer', () => {
				const hex = bufferToHex(defaultBuffer);
				expect(hex).toBe(defaultHex);
			});
		});

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
			beforeAll(() => {
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
				const firstDistanceHashes = hashOnion(hashOnionBuffers[1].slice(), 1000, 1);
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

			beforeEach(async () => {
				defaultHash = Buffer.from(
					'7607d6792843d6003c12495b54e34517a508d2a8622526aff1884422c5478971',
					'hex',
				);
				arrayToHash = [1, 2, 3];
				return Promise.resolve();
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

		describe('#getNetworkIdentifier', () => {
			const genesisBlockID = Buffer.from(
				'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
				'hex',
			);
			const communityIdentifier = 'LISK';
			const expectedHash = Buffer.from(
				'6f201e72e20571b93ed42470caa94af1ace79dc9930ab5bb144ddd5df5753e73',
				'hex',
			);

			it('should generate a sha256 hash from genesis block transaction root and community identifier', () => {
				const networkIdentifier = getNetworkIdentifier(genesisBlockID, communityIdentifier);

				expect(networkIdentifier).toEqual(expectedHash);
			});
		});
	});

	describe('Message Tag', () => {
		describe('createMessageTag', () => {
			it('should throw error if domain contains a space', () => {
				expect(() => createMessageTag('MY TX')).toThrow(
					'Message tag domain must be alpha numeric without special characters. Got "MY TX".',
				);
			});

			it('should throw error if domain contains a underscore', () => {
				expect(() => createMessageTag('MY_')).toThrow(
					'Message tag domain must be alpha numeric without special characters. Got "MY_".',
				);
			});

			it('should throw error if domain contains a special character', () => {
				expect(() => createMessageTag('MY*')).toThrow(
					'Message tag domain must be alpha numeric without special characters. Got "MY*".',
				);
			});

			it('should return a valid tag', () => {
				expect(createMessageTag('TX')).toEqual('LSK_TX_');
			});

			it('should return a valid tag with version of number type', () => {
				expect(createMessageTag('TX', 1)).toEqual('LSK_TX:1_');
			});

			it('should return a valid tag with version of string type', () => {
				expect(createMessageTag('TX', 'v2')).toEqual('LSK_TX:v2_');
			});
		});

		describe('tagMessage', () => {
			it('should concatenate the tag, network identifier and message when message is buffer', () => {
				const tag = createMessageTag('TX');
				const tagBuffer = Buffer.from(tag, 'utf8');
				const networkId = Buffer.from('abc', 'utf8');
				const message = Buffer.from('message', 'utf8');
				const result = Buffer.concat([tagBuffer, networkId, message]);

				expect(tagMessage(tag, networkId, message)).toEqual(result);
			});

			it('should concatenate the tag, network identifier and message when message is string', () => {
				const tag = createMessageTag('TX');
				const tagBuffer = Buffer.from(tag, 'utf8');
				const networkId = Buffer.from('abc', 'utf8');
				const message = Buffer.from('message', 'utf8');
				const result = Buffer.concat([tagBuffer, networkId, message]);

				expect(tagMessage(tag, networkId, 'message')).toEqual(result);
			});
		});
	});

	// describe('readBit', () => {
	// 	it('should read bits of one byte buffer', () => {
	// 		const binary = '10000101';
	// 		const buffer = Buffer.alloc(1);
	// 		buffer.writeUIntLE(parseInt(binary, 2), 0, 1);

	// 		for (const [index, bit] of binary.split('').entries()) {
	// 			expect(readBit(buffer, 7 - index)).toEqual(bit === '1');
	// 		}
	// 	});

	// 	it('should read bits of two byte buffer', () => {
	// 		const binary = '1010001010000101';
	// 		const buffer = Buffer.alloc(2);
	// 		buffer.writeUIntLE(parseInt(binary, 2), 0, 2);

	// 		for (const [index, bit] of binary.split('').entries()) {
	// 			expect(readBit(buffer, 15 - index)).toEqual(bit === '1');
	// 		}
	// 	});
	// });

	// describe('writeBit', () => {
	// 	it('should write bit of one byte buffer', () => {
	// 		const binary = '10000101';
	// 		const buffer = Buffer.alloc(1);
	// 		for (const [index, bit] of binary.split('').entries()) {
	// 			writeBit(buffer, 7 - index, bit === '1');
	// 		}
	// 		const result = buffer.readUIntLE(0, 1).toString(2).padStart(8, '0');

	// 		expect(result).toEqual(binary);
	// 	});

	// 	it('should write bits of two byte buffer', () => {
	// 		const binary = '1010001010000101';
	// 		const buffer = Buffer.alloc(2);
	// 		for (const [index, bit] of binary.split('').entries()) {
	// 			writeBit(buffer, 15 - index, bit === '1');
	// 		}
	// 		const result = buffer.readUIntLE(0, 2).toString(2).padStart(16, '0');

	// 		expect(result).toEqual(binary);
	// 	});
	// });
});
