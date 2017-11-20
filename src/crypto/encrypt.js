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
import crypto from 'crypto';
import {
	hexToBuffer,
	bufferToHex,
	convertPrivateKeyEd2Curve,
	convertPublicKeyEd2Curve,
} from './convert';
import hash from './hash';
import { getPrivateAndPublicKeyBytesFromPassphrase } from './keys';

export const encryptMessageWithPassphrase = (
	message,
	passphrase,
	recipientPublicKey,
) => {
	const {
		privateKey: senderPrivateKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const convertedPrivateKey = convertPrivateKeyEd2Curve(senderPrivateKeyBytes);
	const recipientPublicKeyBytes = hexToBuffer(recipientPublicKey);
	const convertedPublicKey = convertPublicKeyEd2Curve(recipientPublicKeyBytes);
	const messageInBytes = naclInstance.encode_utf8(message);

	const nonce = naclInstance.crypto_box_random_nonce();
	const cipherBytes = naclInstance.crypto_box(
		messageInBytes,
		nonce,
		convertedPublicKey,
		convertedPrivateKey,
	);

	const nonceHex = bufferToHex(nonce);
	const encryptedMessage = bufferToHex(cipherBytes);

	return {
		nonce: nonceHex,
		encryptedMessage,
	};
};

/**
 * @method decryptMessageWithPassphrase
 * @param cipherHex
 * @param nonce
 * @param passphrase
 * @param senderPublicKey
 *
 * @return {string}
 */

export const decryptMessageWithPassphrase = (
	cipherHex,
	nonce,
	passphrase,
	senderPublicKey,
) => {
	const {
		privateKey: recipientPrivateKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const convertedPrivateKey = convertPrivateKeyEd2Curve(
		recipientPrivateKeyBytes,
	);
	const senderPublicKeyBytes = hexToBuffer(senderPublicKey);
	const convertedPublicKey = convertPublicKeyEd2Curve(senderPublicKeyBytes);
	const cipherBytes = hexToBuffer(cipherHex);
	const nonceBytes = hexToBuffer(nonce);

	const decoded = naclInstance.crypto_box_open(
		cipherBytes,
		nonceBytes,
		convertedPublicKey,
		convertedPrivateKey,
	);

	return naclInstance.decode_utf8(decoded);
};

/**
 * @method encryptAES256CBCWithPassword
 * @param {String} plainText utf8 - any utf8 string
 * @param {String} password utf8 - the password used to encrypt the passphrase
 *
 * @return {Object} - { cipher: '...', iv: '...' }
 */

const encryptAES256CBCWithPassword = (plainText, password) => {
	const iv = crypto.randomBytes(16);
	const passwordHash = hash(password, 'utf8');
	const cipher = crypto.createCipheriv('aes-256-cbc', passwordHash, iv);
	const firstBlock = cipher.update(plainText, 'utf8');
	const encrypted = Buffer.concat([firstBlock, cipher.final()]);

	return {
		cipher: encrypted.toString('hex'),
		iv: iv.toString('hex'),
	};
};

/**
 * @method decryptAES256CBCWithPassword
 * @param {Object} Object - Object with cipher and iv as hex strings
 * @param {String} Object.cipher - hex string AES-256-CBC cipher
 * @param {String} Object.iv - hex string for the initialisation vector
 * @param {String} password utf8 - the password used to encrypt the passphrase
 *
 * @return {String} utf8
 */

const decryptAES256CBCWithPassword = ({ cipher, iv }, password) => {
	const passwordHash = hash(password, 'utf8');
	const decipherInit = crypto.createDecipheriv(
		'aes-256-cbc',
		passwordHash,
		hexToBuffer(iv),
	);
	const firstBlock = decipherInit.update(hexToBuffer(cipher));
	const decrypted = Buffer.concat([firstBlock, decipherInit.final()]);

	return decrypted.toString();
};

/**
 * @method encryptPassphraseWithPassword
 * @param {String} passphrase utf8 - twelve word secret passphrase
 * @param {String} password utf8 - the password used to encrypt the passphrase
 *
 * @return {Object} - { cipher: '...', iv: '...' }
 */

export const encryptPassphraseWithPassword = encryptAES256CBCWithPassword;

/**
 * @method decryptPassphraseWithPassword
 * @param {Object} cipherAndIv - Object containing the encryption cipher and the iv
 * @param {String} password utf8 - the password used to encrypt the passphrase
 *
 * @return {String}
 */

export const decryptPassphraseWithPassword = decryptAES256CBCWithPassword;
