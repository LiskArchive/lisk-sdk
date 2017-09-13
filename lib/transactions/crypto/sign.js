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
var crypto = require('crypto');
var ed2curve = require('ed2curve');
var convert = require('./convert');
var keys = require('./keys');
var hash = require('./hash');

function signMessageWithSecret (message, secret) {
	var msg = naclInstance.encode_utf8(message);
	var keypair = keys.getRawPrivateAndPublicKeyFromSecret(secret);

	var signedMessage = naclInstance.crypto_sign(msg, keypair.privateKey);
	var hexSignedMessage = convert.bufferToHex(signedMessage);

	return hexSignedMessage;
}

function signAndPrintMessage (message, secret) {
	var signedMessageHeader = '-----BEGIN LISK SIGNED MESSAGE-----';
	var messageHeader = '-----MESSAGE-----';
	var plainMessage = message;
	var pubklicKeyHeader = '-----PUBLIC KEY-----';
	var publicKey = keys.getPrivateAndPublicKeyFromSecret(secret).publicKey;
	var signatureHeader = '-----SIGNATURE-----';
	var signedMessage = signMessageWithSecret(message, secret);
	var signatureFooter = '-----END LISK SIGNED MESSAGE-----';

	var outputArray = [
		signedMessageHeader, messageHeader, plainMessage, pubklicKeyHeader, publicKey, signatureHeader, signedMessage, signatureFooter
	];

	return outputArray.join('\n');
}

function printSignedMessage (message, signedMessage, publicKey) {
	var signedMessageHeader = '-----BEGIN LISK SIGNED MESSAGE-----';
	var messageHeader = '-----MESSAGE-----';
	var plainMessage = message;
	var publicKeyHeader = '-----PUBLIC KEY-----';
	var printPublicKey = publicKey;
	var signatureHeader = '-----SIGNATURE-----';
	var printSignedMessage = signedMessage;
	var signatureFooter = '-----END LISK SIGNED MESSAGE-----';

	var outputArray = [
		signedMessageHeader, messageHeader, plainMessage, publicKeyHeader, printPublicKey, signatureHeader, printSignedMessage, signatureFooter
	];

	return outputArray.join('\n');
}

function verifyMessageWithPublicKey (signedMessage, publicKey) {
	var signedMessageBytes = convert.hexToBuffer(signedMessage);
	var publicKeyBytes = convert.hexToBuffer(publicKey);

	if (publicKeyBytes.length !== 32) {
		throw new Error('Invalid publicKey, expected 32-byte publicKey');
	}

	// Give appropriate error messages from crypto_sign_open
	var openSignature = naclInstance.crypto_sign_open(signedMessageBytes, publicKeyBytes);

	if (openSignature) {
		// Returns original message
		return naclInstance.decode_utf8(openSignature);
	} else {
		throw new Error('Invalid signature publicKey combination, cannot verify message');
	}
}

function convertPublicKeyEd2Curve (publicKey) {
	return ed2curve.convertPublicKey(publicKey);
}

function convertPrivateKeyEd2Curve (privateKey) {
	return ed2curve.convertSecretKey(privateKey);
}

function encryptMessageWithSecret (message, secret, recipientPublicKey) {
	var senderPrivateKey = keys.getRawPrivateAndPublicKeyFromSecret(secret).privateKey;
	var recipientPublicKeyBytes = convert.hexToBuffer(recipientPublicKey);
	var message = naclInstance.encode_utf8(message);

	var nonce = naclInstance.crypto_box_random_nonce();
	var packet = naclInstance.crypto_box(message, nonce, convertPublicKeyEd2Curve(recipientPublicKeyBytes), convertPrivateKeyEd2Curve(senderPrivateKey));

	var nonceHex = convert.bufferToHex(nonce);
	var encryptedMessage = convert.bufferToHex(packet);

	return {
		nonce: nonceHex,
		encryptedMessage: encryptedMessage
	};
}

function decryptMessageWithSecret (packet, nonce, secret, senderPublicKey) {
	var recipientPrivateKey = keys.getRawPrivateAndPublicKeyFromSecret(secret).privateKey;
	var senderPublicKeyBytes = convert.hexToBuffer(senderPublicKey);
	var packetBytes = convert.hexToBuffer(packet);
	var nonceBytes = convert.hexToBuffer(nonce);

	var decoded = naclInstance.crypto_box_open(packetBytes, nonceBytes, convertPublicKeyEd2Curve(senderPublicKeyBytes), convertPrivateKeyEd2Curve(recipientPrivateKey));

	return naclInstance.decode_utf8(decoded);
}


/**
 * @method encryptAES256CBCWithPassword
 * @param {String} plainText utf8 - any utf8 string
 * @param {String} password utf8 - the password used to encrypt the passphrase
 *
 * @return {Object} - { cipher: '...', iv: '...' }
 */

function encryptAES256CBCWithPassword(plainText, password) {
	var iv = crypto.randomBytes(16);
	var passwordHash = hash.getSha256Hash(password, 'utf8');
	var cipher = crypto.createCipheriv('aes-256-cbc', passwordHash, iv);
	var firstBlock = cipher.update(plainText, 'utf8');
	var encrypted = Buffer.concat([firstBlock, cipher.final()]);
	
	return {
		cipher: encrypted.toString('hex'),
		iv: iv.toString('hex'),
	};
}

/**
 * @method decryptAES256CBCWithPassword
 * @param {Object} cipherAndIv - Object with cipher and iv as hex strings
 * The cipher text resulting from the AES-256-CBC encryption,
 * including the nonce { cipher: ..., nonce: ..., }
 * @param {String} password utf8 - the password used to encrypt the passphrase
 *
 * @return {String} utf8
 */

function decryptAES256CBCWithPassword(cipherAndIv, password) {
	var cipher = cipherAndIv.cipher;
	var iv = cipherAndIv.iv;
	var passwordHash = hash.getSha256Hash(password, 'utf8');
	var decipherInit = crypto.createDecipheriv('aes-256-cbc', passwordHash, convert.hexToBuffer(iv));
	var firstBlock = decipherInit.update(convert.hexToBuffer(cipher));
	var decrypted = Buffer.concat([firstBlock, decipherInit.final()]);
	
	return decrypted.toString();
}

/**
 * @method encryptPassphraseWithPassword
 * @param {String} passphrase utf8 - twelve word secret passphrase
 * @param {String} password utf8 - the password used to encrypt the passphrase
 *
 * @return {Object} - { cipher: '...', iv: '...' }
 */

function encryptPassphraseWithPassword(passphrase, password) {
	return encryptAES256CBCWithPassword(passphrase, password);
}

/**
 * @method decryptPassphraseWithPassword
 * @param {Object} cipherAndIv - Object containing the encryption cipher and the iv
 * The cipher text resulting from the AES-256-CBC encryption,
 * including the nonce { cipher: ..., nonce: ..., }
 * @param {String} password utf8 - the password used to encrypt the passphrase
 *
 * @return {String}
 */
 
function decryptPassphraseWithPassword(cipherAndIv, password) {
	return decryptAES256CBCWithPassword(cipherAndIv, password);
}

module.exports = {
	verifyMessageWithPublicKey: verifyMessageWithPublicKey,
	signMessageWithSecret: signMessageWithSecret,
	printSignedMessage: printSignedMessage,
	signAndPrintMessage: signAndPrintMessage,
	encryptMessageWithSecret: encryptMessageWithSecret,
	decryptMessageWithSecret: decryptMessageWithSecret,
	convertPublicKeyEd2Curve: convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve: convertPrivateKeyEd2Curve,
	decryptPassphraseWithPassword: decryptPassphraseWithPassword,
	encryptPassphraseWithPassword: encryptPassphraseWithPassword,
};
