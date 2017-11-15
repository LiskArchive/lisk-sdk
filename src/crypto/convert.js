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

export function bigNumberToBuffer(bignumber, size) {
	return bignum(bignumber).toBuffer({
		size,
	});
}

/**
 * @method bufferToBignumberString
 * @param {Buffer} bigNumberBuffer
 *
 * @return {String}
 */

export function bufferToBignumberString(bigNumberBuffer) {
	return bignum.fromBuffer(bigNumberBuffer).toString();
}

/**
 * @method bufferToHex
 * @param {Buffer}
 *
 * @return {String}
 */

export function bufferToHex(buffer) {
	return naclInstance.to_hex(buffer);
}

/**
 * @method hexToBuffer
 * @param {String}
 *
 * @return {Buffer}
 */

export function hexToBuffer(hex) {
	return Buffer.from(hex, 'hex');
}

/**
 * @method getFirstEightBytesReversed
 * @param {Buffer} publicKeyBytes
 *
 * @return {Buffer}
 */

export function getFirstEightBytesReversed(publicKeyBytes) {
	return Buffer.from(publicKeyBytes)
		.slice(0, 8)
		.reverse();
}

/**
 * @method toAddress
 * @param {Buffer} buffer
 *
 * @return {String}
 */

export function toAddress(buffer) {
	return `${bufferToBignumberString(buffer)}L`;
}

/**
 * @method getAddressFromPublicKey
 * @param {String} publicKey
 *
 * @return {String}
 */

export function getAddressFromPublicKey(publicKey) {
	const publicKeyHash = hash(publicKey, 'hex');

	const publicKeyTransform = getFirstEightBytesReversed(publicKeyHash);
	const address = toAddress(publicKeyTransform);

	return address;
}

/**
 * @method getAddress
 * @param {String} publicKey
 *
 * @return {String}
 */

export function getAddress(publicKey) {
	return getAddressFromPublicKey(publicKey);
}

/**
 * @method convertPublicKeyEd2Curve
 * @param {String} publicKey
 *
 * @return {Object}
 */

export function convertPublicKeyEd2Curve(publicKey) {
	return ed2curve.convertPublicKey(publicKey);
}

/**
 * @method convertPrivateKeyEd2Curve
 * @param {String} privateKey
 *
 * @return {Object}
 */

export function convertPrivateKeyEd2Curve(privateKey) {
	return ed2curve.convertSecretKey(privateKey);
}
