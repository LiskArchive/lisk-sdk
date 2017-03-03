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

// var crypto = require('crypto-browserify');
// var convert = require('./convert');

// TODO: Discuss behaviour with format and hashing
function getSha256Hash (stringToSign, format) {
	if(!format) {
		stringToSign = naclInstance.encode_utf8(stringToSign);
	} else if(format === 'utf8') {
		stringToSign = naclInstance.encode_utf8(stringToSign);
	} else if(format === 'hex') {
		stringToSign = naclInstance.from_hex(stringToSign);
	}

	return naclInstance.crypto_hash_sha256(stringToSign);
	// return crypto.createHash('sha256').update(stringToSign, format).digest();
}

module.exports = {
	getSha256Hash: getSha256Hash
};
