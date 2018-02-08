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

var sodium = require('sodium').api;

/**
 * Crypto functions that implements sodium.
 *
 * @module
 * @requires sodium.api
 * @see Parent: {@link helpers}
 */
var ed = {};

/**
 * Creates a keypar based on a hash.
 *
 * @func makeKeypair
 * @param {hash} hash - Description of the param
 * @returns {Object} publicKey, privateKey
 * @todo Add descriptions of the parameters
 */
ed.makeKeypair = function(hash) {
	var keypair = sodium.crypto_sign_seed_keypair(hash);

	return {
		publicKey: keypair.publicKey,
		privateKey: keypair.secretKey,
	};
};

/**
 * Creates a signature based on a hash and a keypair.
 *
 * @func sign
 * @param {hash} hash - Description of the param
 * @param {Buffer} privateKey - Description of the param
 * @returns {Buffer} signature
 * @todo Add descriptions of the parameters
 */
ed.sign = function(hash, privateKey) {
	return sodium.crypto_sign_detached(hash, privateKey);
};

/**
 * Verifies a signature based on a hash and a publicKey.
 *
 * @func verify
 * @param {hash} hash - Description of the param
 * @param {Buffer} signature - Description of the param
 * @param {Buffer} publicKey - Description of the param
 * @returns {boolean} true id verified
 * @todo Add descriptions of the parameters
 */
ed.verify = function(hash, signature, publicKey) {
	return sodium.crypto_sign_verify_detached(signature, hash, publicKey);
};

module.exports = ed;
