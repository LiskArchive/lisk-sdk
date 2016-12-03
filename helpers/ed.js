'use strict';

var sodium = require('sodium').api;
var ed = {};

ed.makeKeypair = function (hash) {
	var keypair = sodium.crypto_sign_seed_keypair(hash);

	return {
		publicKey: keypair.publicKey,
		privateKey: keypair.secretKey
	};
};

ed.sign = function (hash, keypair) {
	return sodium.crypto_sign_detached(hash, new Buffer(keypair.privateKey, 'hex'));
};

ed.verify = function (hash, signatureBuffer, publicKeyBuffer) {
	return sodium.crypto_sign_verify_detached(signatureBuffer, hash, publicKeyBuffer);
};

module.exports = ed;
