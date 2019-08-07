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
import * as BigNum from '@liskhq/bignum';

export const BIG_ENDIAN = 'big';
export const LITTLE_ENDIAN = 'little';

export const intToBuffer = (
	value: number | string,
	byteLength: number,
	endianness: string = BIG_ENDIAN,
) => new BigNum(value).toBuffer({ size: byteLength, endian: endianness });

export const bufferToIntAsString = (buffer: Buffer): string =>
	BigNum.fromBuffer(buffer).toString();

/**
 * @deprecated Use intToBuffer instead
 */
// tslint:disable-next-line no-unnecessary-callback-wrapper
export const bigNumberToBuffer = (
	bignumber: string,
	size: number,
	endian: string = BIG_ENDIAN,
) => intToBuffer(bignumber, size, endian);

/**
 * @deprecated Use bufferToIntAsString instead
 */
// tslint:disable-next-line no-unnecessary-callback-wrapper
export const bufferToBigNumberString = (bigNumberBuffer: Buffer): string =>
	bufferToIntAsString(bigNumberBuffer);

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
