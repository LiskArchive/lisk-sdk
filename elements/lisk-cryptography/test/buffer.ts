/*
 * Copyright © 2018 Lisk Foundation
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
import { expect } from 'chai';
import {
	bigNumberToBuffer,
	bufferToBigNumberString,
	intToBuffer,
	bufferToInt,
	bufferToHex,
	hexToBuffer,
} from '../src/buffer';

describe('buffer', () => {
	const defaultBuffer = Buffer.from('\xe5\xe4\xf6');
	const defaultHex = 'c3a5c3a4c3b6';

	describe('#bufferToHex', () => {
		it('should create a hex string from a Buffer', () => {
			const hex = bufferToHex(defaultBuffer);
			return expect(hex).to.be.equal(defaultHex);
		});
	});

	describe('#hexToBuffer', () => {
		it('should create a Buffer from a hex string', () => {
			const buffer = hexToBuffer(defaultHex);
			return expect(buffer).to.be.eql(defaultBuffer);
		});

		it('should throw TypeError with number', () => {
			return expect(hexToBuffer.bind(null, 123 as any)).to.throw(
				TypeError,
				'Argument must be a string.',
			);
		});

		it('should throw TypeError with object', () => {
			return expect(hexToBuffer.bind(null, {} as any)).to.throw(
				TypeError,
				'Argument must be a string.',
			);
		});

		it('should throw an error for a non-string input with custom argument name', () => {
			return expect(hexToBuffer.bind(null, {} as any, 'Custom')).to.throw(
				'Custom must be a string.',
			);
		});

		it('should throw TypeError with non hex string', () => {
			return expect(hexToBuffer.bind(null, 'yKJj')).to.throw(
				TypeError,
				'Argument must be a valid hex string.',
			);
		});

		it('should throw TypeError with partially correct hex string', () => {
			return expect(hexToBuffer.bind(null, 'Abxzzzz')).to.throw(
				TypeError,
				'Argument must be a valid hex string.',
			);
		});

		it('should throw TypeError with odd number of string with partially correct hex string', () => {
			return expect(hexToBuffer.bind(null, 'Abxzzab')).to.throw(
				TypeError,
				'Argument must be a valid hex string.',
			);
		});

		it('should throw TypeError with odd number hex string with invalid hex', () => {
			return expect(hexToBuffer.bind(null, '123xxxx')).to.throw(
				TypeError,
				'Argument must be a valid hex string.',
			);
		});

		it('should throw an error for a non-hex string input with custom argument name', () => {
			return expect(hexToBuffer.bind(null, 'yKJj', 'Custom')).to.throw(
				'Custom must be a valid hex string.',
			);
		});

		it('should throw TypeError with odd-length hex string', () => {
			return expect(hexToBuffer.bind(null, 'c3a5c3a4c3b6a')).to.throw(
				TypeError,
				'Argument must have a valid length of hex string.',
			);
		});

		it('should throw an error for an odd-length hex string input with custom argument name', () => {
			return expect(hexToBuffer.bind(null, 'c3a5c3a4c3b6a', 'Custom')).to.throw(
				'Custom must have a valid length of hex string.',
			);
		});
	});

	describe('#bigNumberToBuffer', () => {
		it('should convert a big number to a buffer', () => {
			const bigNumber = '58191285901858109';
			const addressSize = 8;
			const expectedBuffer = Buffer.from('00cebcaa8d34153d', 'hex');
			return expect(bigNumberToBuffer(bigNumber, addressSize)).to.be.eql(
				expectedBuffer,
			);
		});
	});

	describe('#bufferToBigNumberString', () => {
		it('should convert a buffer to a big number', () => {
			const bigNumber = '58191285901858109';
			const buffer = Buffer.from('00cebcaa8d34153d', 'hex');
			return expect(bufferToBigNumberString(buffer)).to.be.equal(bigNumber);
		});
	});

	describe('#intToBuffer', () => {
		it('should convert a integer to a 1 byte buffer when size=1, endian=big', () => {
			const value = 127;
			const size = 1;
			const endian = 'big';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt8(value, 0);

			return expect(intToBuffer(value, size, endian)).to.be.eql(expectedBuffer);
		});

		it('should convert a integer to a 1 byte buffer when size=1, endian=little', () => {
			const value = 127;
			const size = 1;
			const endian = 'little';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt8(value, 0);

			return expect(intToBuffer(value, size, endian)).to.be.eql(expectedBuffer);
		});

		it('should convert a integer to a 2 bytes big endian buffer when size=2, endian=big', () => {
			const value = 32767;
			const size = 2;
			const endian = 'big';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt16BE(value, 0);

			return expect(intToBuffer(value, size, endian)).to.be.eql(expectedBuffer);
		});

		it('should convert a integer to a 2 bytes little endian buffer when size=2, endian=little', () => {
			const value = 3276;
			const size = 2;
			const endian = 'little';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt16LE(value, 0);

			return expect(intToBuffer(value, size, endian)).to.be.eql(expectedBuffer);
		});

		it('should convert a integer to a 4 bytes big endian buffer when size=4, endian=big', () => {
			const value = 2147483647;
			const size = 4;
			const endian = 'big';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt32BE(value, 0);

			return expect(intToBuffer(value, size, endian)).to.be.eql(expectedBuffer);
		});

		it('should convert a integer to a 4 bytes little endian buffer when size=4, endian=little', () => {
			const value = 2147483647;
			const size = 4;
			const endian = 'little';

			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt32LE(value, 0);

			return expect(intToBuffer(value, size, endian)).to.be.eql(expectedBuffer);
		});

		it('should convert a integer to a 4 bytes big endian buffer when no size or endian is given', () => {
			const value = 2147483647;

			const size = 4;
			const expectedBuffer = Buffer.alloc(size);
			expectedBuffer.writeInt32BE(value, 0);

			return expect(intToBuffer(value)).to.be.eql(expectedBuffer);
		});
	});

	describe('#bufferToInt', () => {
		it('should convert a 1 byte buffer to a integer when size=1, endian=big', () => {
			const value = 127;
			const size = 1;
			const endian = 'big';

			const buffer = Buffer.alloc(size);
			buffer.writeInt8(value, 0);

			return expect(bufferToInt(buffer, size, endian)).to.be.equal(value);
		});

		it('should convert a 1 byte buffer to a integer when size=1, endian=little', () => {
			const value = 127;
			const size = 1;
			const endian = 'little';

			const buffer = Buffer.alloc(size);
			buffer.writeInt8(value, 0);

			return expect(bufferToInt(buffer, size, endian)).to.be.equal(value);
		});

		it('should convert a 2 bytes buffer to a integer when size=2, endian=big', () => {
			const value = 32767;
			const size = 2;
			const endian = 'big';

			const buffer = Buffer.alloc(size);
			buffer.writeInt16BE(value, 0);

			return expect(bufferToInt(buffer, size, endian)).to.be.equal(value);
		});

		it('should convert a 2 bytes buffer to a integer when size=2, endian=little', () => {
			const value = 32767;
			const size = 2;
			const endian = 'little';

			const buffer = Buffer.alloc(size);
			buffer.writeInt16LE(value, 0);

			return expect(bufferToInt(buffer, size, endian)).to.be.equal(value);
		});

		it('should convert a 4 bytes buffer to a integer when size=4, endian=big', () => {
			const value = 2147483647;
			const size = 4;
			const endian = 'big';

			const buffer = Buffer.alloc(size);
			buffer.writeInt32BE(value, 0);

			return expect(bufferToInt(buffer, size, endian)).to.be.equal(value);
		});

		it('should convert a 4 bytes buffer to a integer when size=4, endian=little', () => {
			const value = 2147483647;
			const size = 4;
			const endian = 'little';

			const buffer = Buffer.alloc(size);
			buffer.writeInt32LE(value, 0);

			return expect(bufferToInt(buffer, size, endian)).to.be.equal(value);
		});

		it('should convert a 4 bytes big endian buffer to a integer when no size or endian is given', () => {
			const value = 2147483647;

			const size = 4;
			const buffer = Buffer.alloc(size);
			buffer.writeInt32BE(value, 0);

			return expect(bufferToInt(buffer)).to.be.equal(value);
		});
	});
});
