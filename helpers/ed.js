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
 */

'use strict';

var sodium = require('sodium-native');

/**
 * Crypto functions that implements sodium.
 *
 * @module
 * @requires sodium
 * @see Parent: {@link helpers}
 */
var ed = {};

/**
 * Creates a keypar based on a hash.
 *
 * @func makeKeypair
 * @param {Buffer} hash
 * @returns {Buffer}
 * @todo Add description for the params and the return value
 */
ed.makeKeypair = function(hash) {
	var publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
	var privateKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);
	sodium.crypto_sign_seed_keypair(publicKey, privateKey, hash);

	return {
		publicKey,
		privateKey,
	};
};

/**
 * Creates a signature based on a hash and a keypair.
 *
 * @func sign
 * @param {Buffer} hash
 * @param {Buffer} privateKey
 * @returns {Buffer}
 * @todo Add description for the params and the return value
 */
ed.sign = function(hash, privateKey) {
	if (!(hash instanceof Buffer))
		throw new Error('argument message must be a buffer');

	var signature = Buffer.alloc(sodium.crypto_sign_BYTES);
	sodium.crypto_sign_detached(signature, hash, privateKey);

	return signature;
};

/**
 * Verifies a signature based on a hash and a publicKey.
 *
 * @func verify
 * @param {Buffer} hash
 * @param {Buffer} signature
 * @param {Buffer} publicKey
 * @returns {boolean} True if verified
 * @todo Add description for the params
 */
ed.verify = function(hash, signature, publicKey) {
	if (!(hash instanceof Buffer) || !(signature instanceof Buffer))
		throw new Error('argument message must be a buffer');
	return sodium.crypto_sign_verify_detached(signature, hash, publicKey);
};

/**
 * Converts hex string to buffer
 * throws error for invalid hex strings.
 *
 * @func hexToBuffer
 * @param {String} hex
 * @returns {Buffer}
 * @todo Add description for the params
 */
ed.hexToBuffer = hex => {
	if (typeof hex !== 'string') {
		throw new TypeError('Argument must be a string.');
	}
	// Regex to match valid hex string with even length
	const hexRegex = /^([0-9a-f]{2})+$/i;
	const matchedHex = (hex.match(hexRegex) || [])[0];
	if (!matchedHex) {
		throw new TypeError('Argument must be a valid hex string.');
	}
	return Buffer.from(matchedHex, 'hex');
};

module.exports = ed;
