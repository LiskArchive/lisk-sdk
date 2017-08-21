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

// TODO: Discuss behaviour with format and hashing
function getSha256Hash(stringToSign, format) {
	const encodedString = (!format || format === 'utf8')
		? naclInstance.encode_utf8(stringToSign)
		: naclInstance.from_hex(stringToSign);

	return naclInstance.crypto_hash_sha256(encodedString);
}

/**
 * @method getHash
 * @param transaction Object
 *
 * @return {string}
 */

function getHash(transaction) {
	const bytes = getBytes(transaction);
	return crypto.createHash('sha256').update(bytes).digest();
}

export {
	getSha256Hash,
	getHash,
};
