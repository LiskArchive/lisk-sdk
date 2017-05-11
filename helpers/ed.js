'use strict';

var sodium = require('sodium').api;
/**
 * Crypto functions that implements sodium.
 * @memberof module:helpers
 * @requires sodium
 * @namespace
 */
var ed = {};

/**
 * Creates a keypar based on a hash.
 * @implements {sodium}
 * @param {hash} hash
 * @return {Object} publicKey, privateKey
 */
ed.makeKeypair = function (hash) {
	var keypair = sodium.crypto_sign_seed_keypair(hash);

	return {
		publicKey: keypair.publicKey,
		privateKey: keypair.secretKey
	};
};

/**
 * Creates a signature based on a hash and a keypair.
 * @implements {sodium}
 * @param {hash} hash
 * @param {keypair} keypair
 * @return {signature} signature
 */
ed.sign = function (hash, keypair) {
	return sodium.crypto_sign_detached(hash, Buffer.from(keypair.privateKey, 'hex'));
};

/**
 * Verifies a signature based on a hash and a publicKey.
 * @implements {sodium}
 * @param {hash} hash
 * @param {keypair} keypair
 * @return {Boolean} true id verified
 */
ed.verify = function (hash, signatureBuffer, publicKeyBuffer) {
	return sodium.crypto_sign_verify_detached(signatureBuffer, hash, publicKeyBuffer);
};

module.exports = ed;
