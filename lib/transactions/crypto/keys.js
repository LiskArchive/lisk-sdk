var Buffer = require('buffer/').Buffer;
var bignum = require('browserify-bignum');

var hash = require('./hash');
var convert = require('./convert');

function getPrivateAndPublicKeyFromSecret (secret) {

	var sha256Hash = hash.getSha256Hash(secret, 'utf8');
	var keypair = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return {
		privateKey: convert.bufferToHex(Buffer.from(keypair.signSk)),
		publicKey: convert.bufferToHex(Buffer.from(keypair.signPk))
	};
}

function getRawPrivateAndPublicKeyFromSecret (secret) {

	var sha256Hash = hash.getSha256Hash(secret, 'utf8');
	var keypair = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return {
		privateKey: keypair.signSk,
		publicKey: keypair.signPk
	};

}

function getAddressFromPublicKey (publicKey) {

	var publicKeyHash = hash.getSha256Hash(publicKey, 'hex');

	var publicKeyTransform = convert.useFirstEightBufferEntriesReversed(publicKeyHash);
	var address = bignum.fromBuffer(publicKeyTransform).toString() + 'L';

	return address;

}

module.exports = {
	getKeypair: getPrivateAndPublicKeyFromSecret,
	getPrivateAndPublicKeyFromSecret: getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret: getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey: getAddressFromPublicKey
}