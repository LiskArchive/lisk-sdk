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
import * as BigNum from '@liskhq/bignum';

export const BIG_ENDIAN = 'big';
export const LITTLE_ENDIAN = 'little';

export const intToBuffer = (
	value: number,
	size: number = 4,
	endian: string = BIG_ENDIAN,
) => {
	const buf = Buffer.alloc(size);
	switch (endian) {
		case BIG_ENDIAN:
			buf.writeIntBE(value, 0, size);
			break;

		case LITTLE_ENDIAN:
			buf.writeIntLE(value, 0, size);
			break;

		default:
			throw new Error('Endianness must be either big or little');
	}

	return buf;
};

export const bufferToInt = (
	buffer: Buffer,
	size: number = 4,
	endian: string = BIG_ENDIAN,
): number => {
	switch (endian) {
		case BIG_ENDIAN:
			return buffer.readIntBE(0, size);

		case LITTLE_ENDIAN:
			return buffer.readIntLE(0, size);

		default:
			throw new Error('Endianness must be either big or little');
	}
};

export const bigNumberToBuffer = (
	bignumber: string,
	size: number,
	endian: string = BIG_ENDIAN,
) => new BigNum(bignumber).toBuffer({ size, endian });

export const bufferToBigNumberString = (bigNumberBuffer: Buffer): string =>
	BigNum.fromBuffer(bigNumberBuffer).toString();

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
