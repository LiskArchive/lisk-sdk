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
import ed2curve from 'ed2curve';
import crypto from 'crypto-browserify';
import { getBytes } from '../transactions/transactionBytes';
import convert from './convert';
import keys from './keys';
import hash from './hash';

/**
 * @method signMessageWithSecret
 * @param message
 * @param secret
 *
 * @return {string}
 */

function signMessageWithSecret(message, secret) {
	const msgBytes = naclInstance.encode_utf8(message);
	const { privateKey } = keys.getRawPrivateAndPublicKeyFromSecret(secret);

	const signedMessage = naclInstance.crypto_sign(msgBytes, privateKey);
	const hexSignedMessage = convert.bufferToHex(signedMessage);

	return hexSignedMessage;
}

/**
 * @method signMessageWithTwoSecrets
 * @param message
 * @param secret
 * @param secondSecret
 *
 * @return {string}
 */

function signMessageWithTwoSecrets(message, secret, secondSecret) {
	const msgBytes = naclInstance.encode_utf8(message);
	const keypairBytes = keys.getRawPrivateAndPublicKeyFromSecret(secret);
	const secondKeypairBytes = keys.getRawPrivateAndPublicKeyFromSecret(secondSecret);

	const signedMessage = naclInstance.crypto_sign(msgBytes, keypairBytes.privateKey);
	const doubleSignedMessage = naclInstance.crypto_sign(
		signedMessage, secondKeypairBytes.privateKey,
	);

	const hexSignedMessage = convert.bufferToHex(doubleSignedMessage);

	return hexSignedMessage;
}

/**
 * @method verifyMessageWithTwoPublicKeys
 * @param signedMessage
 * @param publicKey
 * @param secondPublicKey
 *
 * @return {string}
 */

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

/**
 * @method signAndPrintMessage
 * @param message
 * @param secret
 *
 * @return {string}
 */

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
		signedMessageHeader,
		messageHeader,
		plainMessage,
		pubklicKeyHeader,
		publicKey,
		signatureHeader,
		signedMessage,
		signatureFooter,
	];

	return outputArray.join('\n');
}

/**
 * @method printSignedMessage
 * @param message
 * @param signedMessage
 * @param publicKey
 *
 * @return {string}
 */

function printSignedMessage(message, signedMessage, publicKey) {
	const signedMessageHeader = '-----BEGIN LISK SIGNED MESSAGE-----';
	const messageHeader = '-----MESSAGE-----';
	const publicKeyHeader = '-----PUBLIC KEY-----';
	const signatureHeader = '-----SIGNATURE-----';
	const signatureFooter = '-----END LISK SIGNED MESSAGE-----';

	const outputArray = [
		signedMessageHeader,
		messageHeader,
		message,
		publicKeyHeader,
		publicKey,
		signatureHeader,
		signedMessage,
		signatureFooter,
	];

	return outputArray.join('\n');
}

/**
 * @method verifyMessageWithPublicKey
 * @param signedMessage
 * @param publicKey
 *
 * @return {string}
 */

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

/**
 * @method convertPublicKeyEd2Curve
 * @param publicKey
 *
 * @return {object}
 */

function convertPublicKeyEd2Curve(publicKey) {
	return ed2curve.convertPublicKey(publicKey);
}

/**
 * @method convertPrivateKeyEd2Curve
 * @param privateKey
 *
 * @return {object}
 */

function convertPrivateKeyEd2Curve(privateKey) {
	return ed2curve.convertSecretKey(privateKey);
}

/**
 * @method encryptMessageWithSecret
 * @param message
 * @param secret
 * @param recipientPublicKey
 *
 * @return {object}
 */

function encryptMessageWithSecret(message, secret, recipientPublicKey) {
	const senderPrivateKey = keys.getRawPrivateAndPublicKeyFromSecret(secret).privateKey;
	const convertedPrivateKey = convertPrivateKeyEd2Curve(senderPrivateKey);
	const recipientPublicKeyBytes = convert.hexToBuffer(recipientPublicKey);
	const convertedPublicKey = convertPublicKeyEd2Curve(recipientPublicKeyBytes);
	const utf8Message = naclInstance.encode_utf8(message);

	const nonce = naclInstance.crypto_box_random_nonce();
	const packet = naclInstance.crypto_box(
		utf8Message, nonce, convertedPublicKey, convertedPrivateKey);


	const nonceHex = convert.bufferToHex(nonce);
	const encryptedMessage = convert.bufferToHex(packet);

	return {
		nonce: nonceHex,
		encryptedMessage,
	};
}

/**
 * @method decryptMessageWithSecret
 * @param packet
 * @param nonce
 * @param secret
 * @param senderPublicKey
 *
 * @return {string}
 */

function decryptMessageWithSecret(packet, nonce, secret, senderPublicKey) {
	const recipientPrivateKey = keys.getRawPrivateAndPublicKeyFromSecret(secret).privateKey;
	const convertedPrivateKey = convertPrivateKeyEd2Curve(recipientPrivateKey);
	const senderPublicKeyBytes = convert.hexToBuffer(senderPublicKey);
	const convertedPublicKey = convertPublicKeyEd2Curve(senderPublicKeyBytes);
	const packetBytes = convert.hexToBuffer(packet);
	const nonceBytes = convert.hexToBuffer(nonce);

	const decoded = naclInstance.crypto_box_open(
		packetBytes, nonceBytes, convertedPublicKey, convertedPrivateKey,
	);

	return naclInstance.decode_utf8(decoded);
}

/**
 * @method sign
 * @param transaction Object
 * @param givenKeys Object
 *
 * @return {string}
 */

function sign(transaction, givenKeys) {
	const transactionHash = hash.getHash(transaction);
	const signature = naclInstance.crypto_sign_detached(transactionHash, Buffer.from(givenKeys.privateKey, 'hex'));
	return Buffer.from(signature).toString('hex');
}

/**
 * @method multiSign
 * @param transaction Object
 * @param givenKeys Object
 *
 * @return {string}
 */

function multiSign(transaction, givenKeys) {
	const signTransaction = transaction;
	delete signTransaction.signature;
	delete signTransaction.signSignature;
	const { privateKey } = givenKeys;
	const bytes = getBytes(signTransaction);
	const transactionHash = crypto.createHash('sha256').update(bytes).digest();
	const signature = naclInstance.crypto_sign_detached(
		transactionHash, convert.hexToBuffer(privateKey),
	);

	return Buffer.from(signature).toString('hex');
}

/**
 * @method verify
 * @param transaction Object
 *
 * @return {boolean}
 */

function verify(transaction) {
	const remove = transaction.signSignature ? 128 : 64;
	const bytes = getBytes(transaction);
	const data2 = Buffer.alloc(bytes.length - remove).fill(bytes);
	const transactionHash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	const signatureBuffer = Buffer.from(transaction.signature, 'hex');
	const senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, 'hex');
	const res = naclInstance.crypto_sign_verify_detached(
		signatureBuffer, transactionHash, senderPublicKeyBuffer,
	);

	return res;
}

/**
 * @method verifySecondSignature
 * @param transaction Object
 * @param publicKey Object
 *
 * @return {boolean}
 */

function verifySecondSignature(transaction, publicKey) {
	const bytes = getBytes(transaction);
	const data2 = Buffer.alloc(bytes.length - 64).fill(bytes);
	const transactionHash = crypto.createHash('sha256').update(data2.toString('hex'), 'hex').digest();

	const signSignatureBuffer = Buffer.from(transaction.signSignature, 'hex');
	const publicKeyBuffer = Buffer.from(publicKey, 'hex');
	const res = naclInstance.crypto_sign_verify_detached(
		signSignatureBuffer, transactionHash, publicKeyBuffer,
	);

	return res;
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
	sign,
	multiSign,
	verify,
	verifySecondSignature,
};
