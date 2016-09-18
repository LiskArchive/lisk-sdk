'use strict';

var nacl_factory = require('js-nacl');

var ed = {};

nacl_factory.instantiate(function (nacl_instance) {
	ed.makeKeypair = function (hash) {
		var keypair = nacl_instance.crypto_sign_keypair_from_seed(hash);

		return {
			publicKey: new Buffer(keypair.signPk),
			privateKey: new Buffer(keypair.signSk)
		};
	};

	ed.sign = function (hash, keypair) {
		var signature = nacl_instance.crypto_sign_detached(hash, new Buffer(keypair.privateKey, 'hex'));

		return new Buffer(signature);
	};

	ed.verify = function (hash, signatureBuffer, publicKeyBuffer) {
		return nacl_instance.crypto_sign_verify_detached(signatureBuffer, hash, publicKeyBuffer);
	};
});

module.exports = ed;
