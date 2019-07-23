/*
 * Copyright © 2019 Lisk Foundation
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
import * as crypto from 'crypto';
import { bufferToHex, hexToBuffer } from './buffer';
import { convertPrivateKeyEd2Curve, convertPublicKeyEd2Curve } from './convert';
import { getPrivateAndPublicKeyBytesFromPassphrase } from './keys';
import { box, getRandomBytes, openBox } from './nacl';

const PBKDF2_ITERATIONS = 1e6;
const PBKDF2_KEYLEN = 32;
const PBKDF2_HASH_FUNCTION = 'sha256';
const ENCRYPTION_VERSION = '1';

export interface EncryptedMessageWithNonce {
	readonly encryptedMessage: string;
	readonly nonce: string;
}

export const encryptMessageWithPassphrase = (
	message: string,
	passphrase: string,
	recipientPublicKey: string,
): EncryptedMessageWithNonce => {
	const {
		privateKeyBytes: senderPrivateKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const convertedPrivateKey = Buffer.from(
		convertPrivateKeyEd2Curve(senderPrivateKeyBytes),
	);
	const recipientPublicKeyBytes = hexToBuffer(recipientPublicKey);
	const messageInBytes = Buffer.from(message, 'utf8');
	const nonceSize = 24;
	const nonce = getRandomBytes(nonceSize);
	const publicKeyUint8Array = convertPublicKeyEd2Curve(recipientPublicKeyBytes);

	// This cannot be reproduced, but external library have type union with null
	if (publicKeyUint8Array === null) {
		throw new Error('given public key is not a valid Ed25519 public key');
	}

	const convertedPublicKey = Buffer.from(publicKeyUint8Array);

	const cipherBytes = box(
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

export const decryptMessageWithPassphrase = (
	cipherHex: string,
	nonce: string,
	passphrase: string,
	senderPublicKey: string,
): string => {
	const {
		privateKeyBytes: recipientPrivateKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const convertedPrivateKey = Buffer.from(
		convertPrivateKeyEd2Curve(recipientPrivateKeyBytes),
	);
	const senderPublicKeyBytes = hexToBuffer(senderPublicKey);
	const cipherBytes = hexToBuffer(cipherHex);
	const nonceBytes = hexToBuffer(nonce);

	const publicKeyUint8Array = convertPublicKeyEd2Curve(senderPublicKeyBytes);

	// This cannot be reproduced, but external library have type union with null
	if (publicKeyUint8Array === null) {
		throw new Error('given public key is not a valid Ed25519 public key');
	}

	const convertedPublicKey = Buffer.from(publicKeyUint8Array);

	try {
		const decoded = openBox(
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
			throw new Error('Expected nonce to be 24 bytes.');
		}
		throw new Error(
			'Something went wrong during decryption. Is this the full encrypted message?',
		);
	}
};

const getKeyFromPassword = (
	password: string,
	salt: Buffer,
	iterations: number,
): Buffer =>
	crypto.pbkdf2Sync(
		password,
		salt,
		iterations,
		PBKDF2_KEYLEN,
		PBKDF2_HASH_FUNCTION,
	);

export interface EncryptedPassphraseObject {
	readonly cipherText: string;
	readonly iterations?: number;
	readonly iv: string;
	readonly salt: string;
	readonly tag: string;
	readonly version: string;
}

const encryptAES256GCMWithPassword = (
	plainText: string,
	password: string,
	iterations: number = PBKDF2_ITERATIONS,
): EncryptedPassphraseObject => {
	const IV_BUFFER_SIZE = 12;
	const SALT_BUFFER_SIZE = 16;
	const iv = crypto.randomBytes(IV_BUFFER_SIZE);
	const salt = crypto.randomBytes(SALT_BUFFER_SIZE);
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

const getTagBuffer = (tag: string): Buffer => {
	const TAG_BUFFER_SIZE = 16;
	const tagBuffer = hexToBuffer(tag, 'Tag');
	if (tagBuffer.length !== TAG_BUFFER_SIZE) {
		throw new Error('Tag must be 16 bytes.');
	}

	return tagBuffer;
};

const decryptAES256GCMWithPassword = (
	encryptedPassphrase: EncryptedPassphraseObject,
	password: string,
): string => {
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
