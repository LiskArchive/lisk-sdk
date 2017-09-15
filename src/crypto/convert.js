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
import { getSha256Hash } from './hash';
import { getTransactionBytes } from '../transactions/transactionBytes';

/**
 * @method bufferToHex
 * @param buffer
 *
 * @return {string}
 */

export function bufferToHex(buffer) {
	return naclInstance.to_hex(buffer);
}

/**
 * @method hexToBuffer
 * @param hex
 *
 * @return {buffer}
 */

export function hexToBuffer(hex) {
	return Buffer.from(naclInstance.from_hex(hex));
}

/**
 * @method getFirstEightBytesReversed
 * @param publicKeyBytes
 *
 * @return {buffer}
 */

export function getFirstEightBytesReversed(publicKeyBytes) {
	return Buffer.from(publicKeyBytes)
		.slice(0, 8)
		.reverse();
}

/**
 * @method toAddress
 * @param buffer
 *
 * @return {string}
 */

export function toAddress(buffer) {
	return `${bignum.fromBuffer(buffer).toString()}L`;
}

/**
 * @method getAddressFromPublicKey
 * @param publicKey
 *
 * @return {string}
 */

export function getAddressFromPublicKey(publicKey) {
	const publicKeyHash = getSha256Hash(publicKey, 'hex');

	const publicKeyTransform = getFirstEightBytesReversed(publicKeyHash);
	const address = toAddress(publicKeyTransform);

	return address;
}

/**
 * @method getAddress
 * @param publicKey string
 *
 * @return {string}
 */

export function getAddress(publicKey) {
	return getAddressFromPublicKey(publicKey);
}

/**
 * @method getId
 * @param transaction Object
 *
 * @return {string}
 */

export function getId(transaction) {
	const transactionBytes = getTransactionBytes(transaction);
	const transactionHash = getSha256Hash(transactionBytes);
	const bufferFromFirstEntriesReversed = getFirstEightBytesReversed(transactionHash);
	const firstEntriesToNumber = bignum.fromBuffer(bufferFromFirstEntriesReversed);

	return firstEntriesToNumber.toString();
}

/**
 * @method convertPublicKeyEd2Curve
 * @param publicKey
 *
 * @return {object}
 */

export function convertPublicKeyEd2Curve(publicKey) {
	return ed2curve.convertPublicKey(publicKey);
}

/**
 * @method convertPrivateKeyEd2Curve
 * @param privateKey
 *
 * @return {object}
 */

export function convertPrivateKeyEd2Curve(privateKey) {
	return ed2curve.convertSecretKey(privateKey);
}
