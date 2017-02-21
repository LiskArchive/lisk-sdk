var crypto = require('crypto-browserify');
var Buffer = require('buffer/').Buffer;
var ByteBuffer = require('bytebuffer');
var bignum = require('browserify-bignum');
var constants = require('../constants.js');

var naclFactory = require('js-nacl');
var naclInstance;
naclFactory.instantiate(function (nacl) { naclInstance = nacl; });

function verifyMessageWithPublicKey (signedMessage, publicKey) {

	var publicKeyBytes = getBufferFromHex(publicKey);

	var openSignature = naclInstance.crypto_sign_open(signedMessage, publicKeyBytes);

	//returns original message
	return naclInstance.decode_utf8(openSignature);

}

function signMessageWithSecret (message, secret) {

	var keypair = getRawPrivateAndPublicKeyFromSecret(secret);
	var msg = naclInstance.encode_utf8(message);
	var signedMessage = naclInstance.crypto_sign(msg, keypair.signSk);

	return signedMessage;
}

function getPrivateAndPublicKeyFromSecret (secret) {

	var sha256Hash = this.getSha256Hash(secret, 'utf8');
	var keypair = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return {
		privateKey: getHexFromBuffer(Buffer.from(keypair.signSk)),
		publicKey: getHexFromBuffer(Buffer.from(keypair.signPk))
	};
}

function getRawPrivateAndPublicKeyFromSecret (secret) {

	var sha256Hash = getSha256Hash(secret, 'utf8');
	var keypair = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return keypair;

}

function getAddressFromPublicKey (publicKey) {

	var publicKeyHash = getSha256Hash(publicKey, 'hex');

	var publicKeyTransform = reverseFirstEightBufferEntries(publicKeyHash);
	var address = bignum.fromBuffer(publicKeyTransform).toString() + 'L';

	return address;

}

function reverseFirstEightBufferEntries (publicKeyBuffer) {

	var publicKeyTransform = Buffer.alloc(8);

	for (var i = 0; i < 8; i++) {
		publicKeyTransform[i] = publicKeyBuffer[7 - i];
	}

	return publicKeyTransform;
}

function getSha256Hash (stringToSign, format) {
	return crypto.createHash('sha256').update(stringToSign, format).digest();
}

function getHexFromBuffer (buffer) {
	return naclInstance.to_hex(buffer);
}

function getBufferFromHex (hex) {
	return naclInstance.from_hex(hex);
}

/*
 Encryption module - ongoing work.

 LiskCrypto.prototype.decodeEncryptedMessageWithSecret = function(packet, nonce, senderPublicKey, recipientSecret) {

 var recipientKeypair = this.getRawPrivateAndPublicKeyFromSecret(recipientSecret);
 var senderPublicKeyBytes = this.getBufferFromHex(senderPublicKey);
 var nonceBytes = this.getBufferFromHex(nonce);
 var packetBytes = this.getBufferFromHex(packet);
 var decoded = naclInstance.crypto_secretbox_open(packetBytes, nonceBytes, senderPublicKeyBytes, recipientKeypair.signSk);

 return decoded;

 };


 LiskCrypto.prototype.signEncryptedMessageWithSecret = function(message, recipientPublicKey, senderSecret) {

 var encodedMessage = naclInstance.encode_utf8(message);
 var nonce = naclInstance.crypto_secretbox_random_nonce();
 var recipientPublicKeyBytes = this.getBufferFromHex(recipientPublicKey);
 var senderKeyPair = this.getRawPrivateAndPublicKeyFromSecret(senderSecret);

 var packet = naclInstance.crypto_secretbox(encodedMessage, nonce, recipientPublicKeyBytes, senderKeyPair.signSk);

 var hexValues = {
 packet: this.getHexFromBuffer(packet),
 nonce: this.getHexFromBuffer(nonce)
 };

 return hexValues;

 };

 LiskCrypto.prototype.testEncryption = function() {

 //var senderKeypair = naclInstance.crypto_box_keypair();
 //var recipientKeypair = naclInstance.crypto_box_keypair();

 var recipientKeypair = this.getRawPrivateAndPublicKeyFromSecret('123');
 var senderKeypair = this.getRawPrivateAndPublicKeyFromSecret('1234');

 var message = naclInstance.encode_utf8("Hello!");

 var nonce = naclInstance.crypto_secretbox_random_nonce();

 var recipientPublicKey = recipientKeypair.signPk.slice(0,32);
 var senderPublicKey = senderKeypair.signPk.slice(0,32);
 var recipientPrivateKey = recipientKeypair.signSk.slice(0,32);
 var senderPrivateKey = senderKeypair.signSk.slice(0,32);

 var packet = naclInstance.crypto_secretbox(message, nonce, recipientPublicKey, senderPrivateKey);

 console.log(packet);

 var decoded = naclInstance.crypto_secretbox_open(packet, nonce, senderPublicKey, recipientPrivateKey);

 return naclInstance.decode_utf8(decoded); // always true

 };
 */

module.exports = {
	verifyMessageWithPublicKey: verifyMessageWithPublicKey,
	signMessageWithSecret: signMessageWithSecret,
	getPrivateAndPublicKeyFromSecret: getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret: getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey: getAddressFromPublicKey,
	reverseFirstEightBufferEntries: reverseFirstEightBufferEntries,
	getSha256Hash: getSha256Hash,
	getHexFromBuffer: getHexFromBuffer,
	getBufferFromHex: getBufferFromHex
};
