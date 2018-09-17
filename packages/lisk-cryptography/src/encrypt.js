/*
 * Copyright © 2018 Lisk Foundation
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
import { hexToBuffer, bufferToHex } from './buffer';
import { convertPrivateKeyEd2Curve, convertPublicKeyEd2Curve } from './convert';
import { getPrivateAndPublicKeyBytesFromPassphrase } from './keys';
import { getRandomBytes, box, boxOpen } from './nacl';

const PBKDF2_ITERATIONS = 1e6;
const PBKDF2_KEYLEN = 32;
const PBKDF2_HASH_FUNCTION = 'sha256';
const ENCRYPTION_VERSION = '1';

export const encryptMessageWithPassphrase = (
	message,
	passphrase,
	recipientPublicKey,
) => {
	const {
		privateKeyBytes: senderPrivateKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const convertedPrivateKey = convertPrivateKeyEd2Curve(senderPrivateKeyBytes);
	const recipientPublicKeyBytes = hexToBuffer(recipientPublicKey);
	const convertedPublicKey = convertPublicKeyEd2Curve(recipientPublicKeyBytes);
	const messageInBytes = Buffer.from(message, 'utf8');

	const nonce = getRandomBytes(24);

	const cipherText = box(
		messageInBytes,
		nonce,
		convertedPublicKey,
		convertedPrivateKey,
	);

	const nonceHex = bufferToHex(nonce);
	const encryptedMessage = bufferToHex(cipherText);

	return {
		nonce: nonceHex,
		encryptedMessage,
	};
};

export const decryptMessageWithPassphrase = (
	cipherHex,
	nonce,
	passphrase,
	senderPublicKey,
) => {
	const {
		privateKeyBytes: recipientPrivateKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const convertedPrivateKey = convertPrivateKeyEd2Curve(
		recipientPrivateKeyBytes,
	);
	const senderPublicKeyBytes = hexToBuffer(senderPublicKey);
	const convertedPublicKey = convertPublicKeyEd2Curve(senderPublicKeyBytes);
	const cipherBytes = hexToBuffer(cipherHex);
	const nonceBytes = hexToBuffer(nonce);

	try {
		const decoded = boxOpen(
			cipherBytes,
			nonceBytes,
			convertedPublicKey,
			convertedPrivateKey,
		);
		return Buffer.from(decoded).toString();
	} catch (error) {
		if (
			error.message.match(
				/bad nonce size|nonce must be a buffer of size crypto_box_NONCEBYTES/,
			)
		) {
			throw new Error('Expected 24-byte nonce but got length 1.');
		}
		throw new Error(
			'Something went wrong during decryption. Is this the full encrypted message?',
		);
	}
};

const getKeyFromPassword = (password, salt, iterations) =>
	crypto.pbkdf2Sync(
		password,
		salt,
		iterations,
		PBKDF2_KEYLEN,
		PBKDF2_HASH_FUNCTION,
	);

const encryptAES256GCMWithPassword = (
	plainText,
	password,
	iterations = PBKDF2_ITERATIONS,
) => {
	const iv = crypto.randomBytes(12);
	const salt = crypto.randomBytes(16);
	const key = getKeyFromPassword(password, salt, iterations);

	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const firstBlock = cipher.update(plainText, 'utf8');
	const encrypted = Buffer.concat([firstBlock, cipher.final()]);
	const tag = cipher.getAuthTag();

	return {
		iterations,
		cipherText: encrypted.toString('hex'),
		iv: iv.toString('hex'),
		salt: salt.toString('hex'),
		tag: tag.toString('hex'),
		version: ENCRYPTION_VERSION,
	};
};

const getTagBuffer = tag => {
	const tagBuffer = hexToBuffer(tag, 'Tag');
	if (tagBuffer.length !== 16) {
		throw new Error('Tag must be 16 bytes.');
	}
	return tagBuffer;
};

const decryptAES256GCMWithPassword = (encryptedPassphrase, password) => {
	const {
		iterations = PBKDF2_ITERATIONS,
		cipherText,
		iv,
		salt,
		tag,
	} = encryptedPassphrase;

	const tagBuffer = getTagBuffer(tag);
	const key = getKeyFromPassword(
		password,
		hexToBuffer(salt, 'Salt'),
		iterations,
	);

	const decipher = crypto.createDecipheriv(
		'aes-256-gcm',
		key,
		hexToBuffer(iv, 'IV'),
	);
	decipher.setAuthTag(tagBuffer);
	const firstBlock = decipher.update(hexToBuffer(cipherText, 'Cipher text'));
	const decrypted = Buffer.concat([firstBlock, decipher.final()]);

	return decrypted.toString();
};

export const encryptPassphraseWithPassword = encryptAES256GCMWithPassword;

export const decryptPassphraseWithPassword = decryptAES256GCMWithPassword;
