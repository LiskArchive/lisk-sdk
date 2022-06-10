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
import { Mnemonic } from '@liskhq/lisk-passphrase';

import { bufferToHex, hexToBuffer } from './buffer';
// eslint-disable-next-line import/no-cycle
import { convertPrivateKeyEd2Curve, convertPublicKeyEd2Curve } from './convert';
// eslint-disable-next-line import/no-cycle
import { getPrivateAndPublicKeyFromPassphrase } from './keys';
// eslint-disable-next-line import/no-cycle
import { box, getRandomBytes, openBox, getKeyPair } from './nacl';
import { getMasterKeyFromSeed, getChildKey, isValidPath } from './utils';

const PBKDF2_ITERATIONS = 1e6;
const PBKDF2_KEYLEN = 32;
const PBKDF2_HASH_FUNCTION = 'sha256';
const ENCRYPTION_VERSION = '1';
const HARDENED_OFFSET = 0x80000000;

export interface EncryptedMessageWithNonce {
	readonly encryptedMessage: string;
	readonly nonce: string;
}

export const encryptMessageWithPassphrase = (
	message: string,
	passphrase: string,
	recipientPublicKey: Buffer,
): EncryptedMessageWithNonce => {
	const { privateKey: senderPrivateKeyBytes } = getPrivateAndPublicKeyFromPassphrase(passphrase);
	const convertedPrivateKey = Buffer.from(convertPrivateKeyEd2Curve(senderPrivateKeyBytes));
	const messageInBytes = Buffer.from(message, 'utf8');
	const nonceSize = 24;
	const nonce = getRandomBytes(nonceSize);
	const publicKeyUint8Array = convertPublicKeyEd2Curve(recipientPublicKey);

	// This cannot be reproduced, but external library have type union with null
	if (publicKeyUint8Array === null) {
		throw new Error('given public key is not a valid Ed25519 public key');
	}

	const convertedPublicKey = Buffer.from(publicKeyUint8Array);

	const cipherBytes = box(messageInBytes, nonce, convertedPublicKey, convertedPrivateKey);

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
	senderPublicKey: Buffer,
): string => {
	const { privateKey: recipientPrivateKeyBytes } = getPrivateAndPublicKeyFromPassphrase(passphrase);
	const convertedPrivateKey = Buffer.from(convertPrivateKeyEd2Curve(recipientPrivateKeyBytes));
	const cipherBytes = hexToBuffer(cipherHex);
	const nonceBytes = hexToBuffer(nonce);

	const publicKeyUint8Array = convertPublicKeyEd2Curve(senderPublicKey);

	// This cannot be reproduced, but external library have type union with null
	if (publicKeyUint8Array === null) {
		throw new Error('given public key is not a valid Ed25519 public key');
	}

	const convertedPublicKey = Buffer.from(publicKeyUint8Array);

	try {
		const decoded = openBox(cipherBytes, nonceBytes, convertedPublicKey, convertedPrivateKey);

		return Buffer.from(decoded).toString();
	} catch (error) {
		if (
			// eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
			(error as Error).message.match(/bad nonce size|"n" must be crypto_box_NONCEBYTES bytes long/)
		) {
			throw new Error('Expected nonce to be 24 bytes.');
		}
		throw new Error('Something went wrong during decryption. Is this the full encrypted message?');
	}
};

const getKeyFromPassword = (password: string, salt: Buffer, iterations: number): Buffer =>
	crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_HASH_FUNCTION);

export interface EncryptedPassphraseObject {
	readonly [key: string]: string | number | undefined;
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
	const { iterations = PBKDF2_ITERATIONS, cipherText, iv, salt, tag } = encryptedPassphrase;

	const tagBuffer = getTagBuffer(tag);
	const key = getKeyFromPassword(password, hexToBuffer(salt, 'Salt'), iterations);

	const decipher = crypto.createDecipheriv('aes-256-gcm', key, hexToBuffer(iv, 'IV'));
	decipher.setAuthTag(tagBuffer);
	const firstBlock = decipher.update(hexToBuffer(cipherText, 'Cipher text'));
	const decrypted = Buffer.concat([firstBlock, decipher.final()]);

	return decrypted.toString();
};

export const encryptPassphraseWithPassword = encryptAES256GCMWithPassword;

export const decryptPassphraseWithPassword = decryptAES256GCMWithPassword;

export const getKeyPairFromPhraseAndPath = async (phrase: string, path: string) => {
	if (!isValidPath(path)) {
		throw new Error('Invalid path format');
	}

	const masterSeed = await Mnemonic.mnemonicToSeed(phrase);
	let node = getMasterKeyFromSeed(masterSeed);

	// slice first element which is `m`
	for (const segment of path.split('/').slice(1)) {
		// if segment includes apostrophe, we must add HARDENED_OFFSET
		const segmentWithOffset = segment.includes("'")
			? parseInt(segment, 10) + HARDENED_OFFSET
			: parseInt(segment, 10);
		node = getChildKey(node, segmentWithOffset);
	}

	return getKeyPair(node.key);
};
