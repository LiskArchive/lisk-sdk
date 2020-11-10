/*
 * Copyright © 2019 Lisk Foundation
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

export const BIG_ENDIAN = 'big';
export const LITTLE_ENDIAN = 'little';
const MAX_NUMBER_BYTE_LENGTH = 6;

export const intToBuffer = (
	value: number | string,
	byteLength: number,
	endianness: string = BIG_ENDIAN,
	signed: boolean = false,
) => {
	if (![BIG_ENDIAN, LITTLE_ENDIAN].includes(endianness)) {
		throw new Error(
			`Endianness must be either ${BIG_ENDIAN} or ${LITTLE_ENDIAN}`,
		);
	}
	const buffer = Buffer.alloc(byteLength);
	if (endianness === 'big') {
		if (byteLength <= MAX_NUMBER_BYTE_LENGTH) {
			if (signed) {
				buffer.writeIntBE(Number(value), 0, byteLength);
			} else {
				buffer.writeUIntBE(Number(value), 0, byteLength);
			}
		} else {
			if (signed) {
				buffer.writeBigInt64BE(BigInt(value));
			} else {
				buffer.writeBigUInt64BE(BigInt(value));
			}
		}
	} else {
		if (byteLength <= MAX_NUMBER_BYTE_LENGTH) {
			if (signed) {
				buffer.writeIntLE(Number(value), 0, byteLength);
			} else {
				buffer.writeUIntLE(Number(value), 0, byteLength);
			}
		} else {
			if (signed) {
				buffer.writeBigInt64LE(BigInt(value));
			} else {
				buffer.writeBigUInt64LE(BigInt(value));
			}
		}
	}

	return buffer;
};

export const bufferToIntAsString = (buffer: Buffer): string =>
	buffer.length <= MAX_NUMBER_BYTE_LENGTH
		? buffer.readIntBE(0, buffer.length).toString()
		: buffer.readBigUInt64BE().toString();

export const bufferToHex = (buffer: Buffer): string =>
	Buffer.from(buffer).toString('hex');

const hexRegex = /^[0-9a-f]+/i;
export const hexToBuffer = (hex: string, argumentName = 'Argument'): Buffer => {
	if (typeof hex !== 'string') {
		throw new TypeError(`${argumentName} must be a string.`);
	}
	const matchedHex = (hex.match(hexRegex) || [])[0];
	if (!matchedHex || matchedHex.length !== hex.length) {
		throw new TypeError(`${argumentName} must be a valid hex string.`);
	}
	// tslint:disable-next-line no-magic-numbers
	if (matchedHex.length % 2 !== 0) {
		throw new TypeError(
			`${argumentName} must have a valid length of hex string.`,
		);
	}

	return Buffer.from(matchedHex, 'hex');
};

export const stringToBuffer = (str: string): Buffer => Buffer.from(str, 'utf8');
