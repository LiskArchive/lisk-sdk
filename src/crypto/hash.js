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
import crypto from 'crypto-browserify';
import { getBytes } from './../transactions/transactionBytes';

/**
 * @method getSha256Hash
 * @param stringToSign
 * @param format
 *
 * @return {string}
 */
export function getSha256Hash(stringToSign, format) {

	if(typeof stringToSign === 'object') {
		return naclInstance.crypto_hash_sha256(stringToSign)
	}

	if(typeof stringToSign === 'string' && format === 'utf8') {
		const encoded = naclInstance.encode_utf8(stringToSign);
		return naclInstance.crypto_hash_sha256(encoded);
	}

	if(typeof stringToSign === 'string' && format === 'hex') {
		const encoded = naclInstance.from_hex(stringToSign);
		return naclInstance.crypto_hash_sha256(encoded);
	}

	throw Error(`Unknown input format, use buffer as default, 'hex' or 'utf8' as format`);
}

/**
 * @method getTransactionHash
 * @param transaction Object
 *
 * @return {string}
 */

export function getTransactionHash(transaction) {
	const bytes = getBytes(transaction);
	return getSha256Hash(bytes);
}
