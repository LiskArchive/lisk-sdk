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

/**
 * @method bigNumberToBuffer
 * @param {Number} bignumber
 * @param {Number} size
 *
 * @return {Buffer}
 */

export const bigNumberToBuffer = (bignumber, size) =>
	bignum(bignumber).toBuffer({ size });

/**
 * @method bufferToBigNumberString
 * @param {Buffer} bigNumberBuffer
 *
 * @return {String}
 */

export const bufferToBigNumberString = bigNumberBuffer =>
	bignum.fromBuffer(bigNumberBuffer).toString();

/**
 * @method bufferToHex
 * @param {Buffer}
 *
 * @return {String}
 */

export const bufferToHex = buffer => naclInstance.to_hex(buffer);

/**
 * @method hexToBuffer
 * @param {String}
 *
 * @return {Buffer}
 */

export const hexToBuffer = hex => Buffer.from(hex, 'hex');

/**
 * @method getFirstEightBytesReversed
 * @param {Buffer} publicKeyBytes
 *
 * @return {Buffer}
 */

export const getFirstEightBytesReversed = publicKeyBytes =>
	Buffer.from(publicKeyBytes)
		.slice(0, 8)
		.reverse();

/**
 * @method toAddress
 * @param {Buffer} buffer
 *
 * @return {String}
 */

export const toAddress = buffer => `${bufferToBigNumberString(buffer)}L`;

/**
 * @method getAddressFromPublicKey
 * @param {String} publicKey
 *
 * @return {String}
 */

export const getAddressFromPublicKey = publicKey => {
	const publicKeyHash = hash(publicKey, 'hex');

	const publicKeyTransform = getFirstEightBytesReversed(publicKeyHash);
	const address = toAddress(publicKeyTransform);

	return address;
};

/**
 * @method getAddress
 * @param {String} publicKey
 *
 * @return {String}
 */

export const getAddress = getAddressFromPublicKey;

/**
 * @method convertPublicKeyEd2Curve
 * @param {String} publicKey
 *
 * @return {Object}
 */

export const convertPublicKeyEd2Curve = ed2curve.convertPublicKey;

/**
 * @method convertPrivateKeyEd2Curve
 * @param {String} privateKey
 *
 * @return {Object}
 */

export const convertPrivateKeyEd2Curve = ed2curve.convertSecretKey;
