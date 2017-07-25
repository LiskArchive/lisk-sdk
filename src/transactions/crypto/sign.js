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

const ed2curve = require('ed2curve');
const convert = require('./convert');
const keys = require('./keys');

function signMessageWithSecret(message, secret) {
	const msgBytes = naclInstance.encode_utf8(message);
	const keypairBytes = keys.getRawPrivateAndPublicKeyFromSecret(secret);

	const signedMessage = naclInstance.crypto_sign(msgBytes, keypairBytes.privateKey);
	const hexSignedMessage = convert.bufferToHex(signedMessage);

	return hexSignedMessage;
}

function signMessageWithTwoSecrets(message, secret, secondSecret) {
	const msgBytes = naclInstance.encode_utf8(message);
	const keypairBytes = keys.getRawPrivateAndPublicKeyFromSecret(secret);
	const secondKeypairBytes = keys.getRawPrivateAndPublicKeyFromSecret(secondSecret);

	const signedMessage = naclInstance.crypto_sign(msgBytes, keypairBytes.privateKey);
	const doubleSignedMessage = naclInstance.crypto_sign(signedMessage, secondKeypairBytes.privateKey);

	const hexSignedMessage = convert.bufferToHex(doubleSignedMessage);

	return hexSignedMessage;
}

function verifyMessageWithTwoPublicKeys(signedMessage, publicKey, secondPublicKey) {
	const signedMessageBytes = convert.hexToBuffer(signedMessage);
	const publicKeyBytes = convert.hexToBuffer(publicKey);
	const secondPublicKeyBytes = convert.hexToBuffer(secondPublicKey);

	if (publicKeyBytes.length !== 32) {
		throw new Error('Invalid first publicKey, expected 32-byte publicKey');
	}

	if (secondPublicKeyBytes.length !== 32) {
		throw new Error('Invalid second publicKey, expected 32-byte publicKey');
	}

	// Give appropriate error messages from crypto_sign_open
	const openSignature = naclInstance.crypto_sign_open(signedMessageBytes, secondPublicKeyBytes);

	if (openSignature) {
		const openSecondSignature = naclInstance.crypto_sign_open(openSignature, publicKeyBytes);

		if (openSecondSignature) {
			// Returns original message
			return naclInstance.decode_utf8(openSecondSignature);
		}
		throw new Error('Invalid signature second publicKey, cannot verify message');
	} else {
		throw new Error('Invalid signature primary publicKey, cannot verify message');
	}
}


function signAndPrintMessage(message, secret) {
	const signedMessageHeader = '-----BEGIN LISK SIGNED MESSAGE-----';
	const messageHeader = '-----MESSAGE-----';
	const plainMessage = message;
	const pubklicKeyHeader = '-----PUBLIC KEY-----';
	const publicKey = keys.getPrivateAndPublicKeyFromSecret(secret).publicKey;
	const signatureHeader = '-----SIGNATURE-----';
	const signedMessage = signMessageWithSecret(message, secret);
	const signatureFooter = '-----END LISK SIGNED MESSAGE-----';

	const outputArray = [
		signedMessageHeader, messageHeader, plainMessage, pubklicKeyHeader, publicKey, signatureHeader, signedMessage, signatureFooter,
	];

	return outputArray.join('\n');
}

function printSignedMessage(message, signedMessage, publicKey) {
	const signedMessageHeader = '-----BEGIN LISK SIGNED MESSAGE-----';
	const messageHeader = '-----MESSAGE-----';
	const plainMessage = message;
	const publicKeyHeader = '-----PUBLIC KEY-----';
	const printPublicKey = publicKey;
	const signatureHeader = '-----SIGNATURE-----';
	const printSignedMessage = signedMessage;
	const signatureFooter = '-----END LISK SIGNED MESSAGE-----';

	const outputArray = [
		signedMessageHeader, messageHeader, plainMessage, publicKeyHeader, printPublicKey, signatureHeader, printSignedMessage, signatureFooter,
	];

	return outputArray.join('\n');
}

function verifyMessageWithPublicKey(signedMessage, publicKey) {
	const signedMessageBytes = convert.hexToBuffer(signedMessage);
	const publicKeyBytes = convert.hexToBuffer(publicKey);

	if (publicKeyBytes.length !== 32) {
		throw new Error('Invalid publicKey, expected 32-byte publicKey');
	}

	// Give appropriate error messages from crypto_sign_open
	const openSignature = naclInstance.crypto_sign_open(signedMessageBytes, publicKeyBytes);

	if (openSignature) {
		// Returns original message
		return naclInstance.decode_utf8(openSignature);
	}
	throw new Error('Invalid signature publicKey combination, cannot verify message');
}

function convertPublicKeyEd2Curve(publicKey) {
	return ed2curve.convertPublicKey(publicKey);
}

function convertPrivateKeyEd2Curve(privateKey) {
	return ed2curve.convertSecretKey(privateKey);
}

function encryptMessageWithSecret(message, secret, recipientPublicKey) {
	const senderPrivateKey = keys.getRawPrivateAndPublicKeyFromSecret(secret).privateKey;
	const recipientPublicKeyBytes = convert.hexToBuffer(recipientPublicKey);
	var message = naclInstance.encode_utf8(message);

	const nonce = naclInstance.crypto_box_random_nonce();
	const packet = naclInstance.crypto_box(message, nonce, convertPublicKeyEd2Curve(recipientPublicKeyBytes), convertPrivateKeyEd2Curve(senderPrivateKey));

	const nonceHex = convert.bufferToHex(nonce);
	const encryptedMessage = convert.bufferToHex(packet);

	return {
		nonce: nonceHex,
		encryptedMessage,
	};
}

function decryptMessageWithSecret(packet, nonce, secret, senderPublicKey) {
	const recipientPrivateKey = keys.getRawPrivateAndPublicKeyFromSecret(secret).privateKey;
	const senderPublicKeyBytes = convert.hexToBuffer(senderPublicKey);
	const packetBytes = convert.hexToBuffer(packet);
	const nonceBytes = convert.hexToBuffer(nonce);

	const decoded = naclInstance.crypto_box_open(packetBytes, nonceBytes, convertPublicKeyEd2Curve(senderPublicKeyBytes), convertPrivateKeyEd2Curve(recipientPrivateKey));

	return naclInstance.decode_utf8(decoded);
}

module.exports = {
	verifyMessageWithPublicKey,
	signMessageWithSecret,
	printSignedMessage,
	signAndPrintMessage,
	encryptMessageWithSecret,
	decryptMessageWithSecret,
	convertPublicKeyEd2Curve,
	convertPrivateKeyEd2Curve,
	signMessageWithTwoSecrets,
	verifyMessageWithTwoPublicKeys,
};
