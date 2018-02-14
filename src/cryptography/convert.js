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

const hexRegex = /([0-9]|[a-f])/gim;
export const hexToBuffer = hex => {
	if (typeof hex !== 'string') {
		return Buffer.alloc(0);
	}
	const matchedHex = hex.match(hexRegex) || [];
	if (matchedHex.length === 0) {
		return Buffer.alloc(0);
	}
	const evenLength = Math.floor(matchedHex.length / 2) * 2;
	return Buffer.from(matchedHex.slice(0, evenLength).join(''), 'hex');
};

export const getFirstEightBytesReversed = publicKeyBytes =>
	Buffer.from(publicKeyBytes)
		.slice(0, 8)
		.reverse();

export const toAddress = buffer => `${bufferToBigNumberString(buffer)}L`;

export const getAddressFromPublicKey = publicKey => {
	const publicKeyHash = hash(publicKey, 'hex');

	const publicKeyTransform = getFirstEightBytesReversed(publicKeyHash);
	const address = toAddress(publicKeyTransform);

	return address;
};

export const getAddress = getAddressFromPublicKey;

export const convertPublicKeyEd2Curve = ed2curve.convertPublicKey;

export const convertPrivateKeyEd2Curve = ed2curve.convertSecretKey;
