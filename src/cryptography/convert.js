/*
 * Copyright © 2017 Lisk Foundation
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
import bignum from 'browserify-bignum';
import ed2curve from 'ed2curve';
import hash from './hash';

export const bigNumberToBuffer = (bignumber, size) =>
	bignum(bignumber).toBuffer({ size });

export const bufferToBigNumberString = bigNumberBuffer =>
	bignum.fromBuffer(bigNumberBuffer).toString();

export const bufferToHex = buffer => naclInstance.to_hex(buffer);

const hexRegex = /^[0-9a-f]+/i;
export const hexToBuffer = hex => {
	if (typeof hex !== 'string') {
		throw new TypeError('Argument must be a string.');
	}
	const matchedHex = (hex.match(hexRegex) || [])[0];
	if (!matchedHex || matchedHex.length !== hex.length) {
		throw new TypeError('Argument must be a valid hex string.');
	}
	if (matchedHex.length % 2 !== 0) {
		throw new TypeError('Argument must have a valid length of hex string.');
	}
	return Buffer.from(matchedHex, 'hex');
};

export const getFirstEightBytesReversed = publicKeyBytes =>
	Buffer.from(publicKeyBytes)
		.slice(0, 8)
		.reverse();

export const toAddress = buffer => {
	if (
		!Buffer.from(buffer)
			.slice(0, 8)
			.equals(buffer)
	)
		throw new Error(
			'The buffer for Lisk addresses must not have more than 8 bytes',
		);
	return `${bufferToBigNumberString(buffer)}L`;
};

export const getAddressFromPublicKey = publicKey => {
	const publicKeyHash = hash(publicKey, 'hex');

	const publicKeyTransform = getFirstEightBytesReversed(publicKeyHash);
	const address = toAddress(publicKeyTransform);

	return address;
};

export const convertPublicKeyEd2Curve = ed2curve.convertPublicKey;

export const convertPrivateKeyEd2Curve = ed2curve.convertSecretKey;
