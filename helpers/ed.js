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
 * @param {Buffer} privateKey
 * @return {Buffer} signature
 */
ed.sign = function (hash, privateKey) {
	return sodium.crypto_sign_detached(hash, privateKey);
};

/**
 * Verifies a signature based on a hash and a publicKey.
 * @implements {sodium}
 * @param {hash} hash
 * @param {Buffer} signature
 * @param {Buffer} publicKey
 * @return {Boolean} true id verified
 */
ed.verify = function (hash, signature, publicKey) {
	return sodium.crypto_sign_verify_detached(signature, hash, publicKey);
};

/**
 * Creates a signature based on a hash and a keypair.
 * @implements {sodium}
 * @param {string} message\
 * @param {string} privateKey
 * @return {string} signature
 */
ed.signString = function (message, privateKey) {

	var messageBuffer = Buffer.from(message, 'hex');
	var privateKeyBuffer = Buffer.from(privateKey, 'hex');

	return sodium.crypto_sign_detached(messageBuffer, privateKeyBuffer);
};

/**
 * Verifies a signature based on a hash and a publicKey. All arguments are strings.
 * @implements {sodium}
 * @param {string} signature
 * @param {string} message
 * @param {string} publicKey
 * @return {Boolean} true id verified
 */
ed.verifyString = function (signature, message, publicKey) {

	var signatureBuffer = Buffer.from(signature, 'hex');
	var messageBuffer = Buffer.from(message, 'hex');
	var publicKeyBuffer = Buffer.from(publicKey, 'hex');

	return sodium.crypto_sign_verify_detached(signatureBuffer, messageBuffer, publicKeyBuffer);
};

module.exports = ed;
