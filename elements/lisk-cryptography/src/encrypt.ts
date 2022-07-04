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
import { argon2id } from 'hash-wasm';
import * as crypto from 'crypto';
import { Mnemonic } from '@liskhq/lisk-passphrase';

import { bufferToHex, hexToBuffer } from './buffer';
// eslint-disable-next-line import/no-cycle
import { convertPrivateKeyEd2Curve, convertPublicKeyEd2Curve } from './convert';
// eslint-disable-next-line import/no-cycle
import { getPrivateAndPublicKeyFromPassphrase } from './keys';
// eslint-disable-next-line import/no-cycle
import { box, getRandomBytes, openBox, getKeyPair } from './nacl';
import { getMasterKeyFromSeed, getChildKey, parseKeyDerivationPath, deriveChildSK } from './utils';
import { blsKeyGen } from './bls_lib';

const PBKDF2_ITERATIONS = 1e6;
const PBKDF2_KEYLEN = 32;
const PBKDF2_HASH_FUNCTION = 'sha256';
const ENCRYPTION_VERSION = '1';
const HASH_LENGTH = 32;
const ARGON2_ITERATIONS = 1;
const ARGON2_PARALLELISM = 4;
const ARGON2_MEMORY = 2024;

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

const getKeyFromPasswordWithArgon2 = async (options: {
	password: string;
	salt: Buffer;
	iterations: number;
	parallelism: number;
	memorySize: number;
}): Promise<Buffer> =>
	Buffer.from(
		await argon2id({
			password: options.password,
			salt: options.salt,
			parallelism: options.parallelism,
			iterations: options.iterations,
			memorySize: options.memorySize,
			hashLength: HASH_LENGTH, // we use output size = 32 bytes
			outputType: 'binary', // we use output binary
		}),
	);

export enum Cipher {
	AES256GCM = 'aes-256-gcm',
}

export enum KDF {
	ARGON2 = 'argon2id',
	PBKDF2 = 'PBKDF2',
}

export interface EncryptedPassphraseObject {
	readonly version: string;
	readonly ciphertext: string;
	readonly mac: string;
	readonly kdf: KDF;
	readonly kdfparams: {
		parallelism: number;
		iterations: number;
		memorySize: number;
		salt: string;
	};
	readonly cipher: Cipher;
	readonly cipherparams: {
		iv: string;
		tag: string;
	};
}

const encryptAES256GCMWithPassword = async (
	plainText: string,
	password: string,
	options?: {
		kdf?: KDF;
		kdfparams?: {
			parallelism?: number;
			iterations?: number;
			memorySize?: number;
		};
	},
): Promise<EncryptedPassphraseObject> => {
	const kdf = options?.kdf ?? KDF.ARGON2;
	const IV_BUFFER_SIZE = 12;
	const SALT_BUFFER_SIZE = 16;
	const salt = crypto.randomBytes(SALT_BUFFER_SIZE);
	const iv = crypto.randomBytes(IV_BUFFER_SIZE);
	const iterations =
		kdf === KDF.ARGON2 ? ARGON2_ITERATIONS : options?.kdfparams?.iterations ?? PBKDF2_ITERATIONS;
	const parallelism = options?.kdfparams?.parallelism ?? ARGON2_PARALLELISM;
	const memorySize = options?.kdfparams?.parallelism ?? ARGON2_MEMORY;
	const key =
		kdf === KDF.ARGON2
			? await getKeyFromPasswordWithArgon2({
					password,
					salt,
					iterations,
					parallelism,
					memorySize,
			  })
			: getKeyFromPassword(password, salt, iterations);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const firstBlock = cipher.update(plainText, 'utf8');
	const encrypted = Buffer.concat([firstBlock, cipher.final()]);
	const tag = cipher.getAuthTag();

	return {
		ciphertext: encrypted.toString('hex'),
		mac: crypto.createHash('sha256').update(key.slice(16, 32)).update(encrypted).digest('hex'),
		kdf,
		kdfparams: {
			parallelism,
			iterations,
			memorySize,
			salt: salt.toString('hex'),
		},
		cipher: Cipher.AES256GCM,
		cipherparams: {
			iv: iv.toString('hex'),
			tag: tag.toString('hex'),
		},
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

const decryptAES256GCMWithPassword = async (
	encryptedPassphrase: EncryptedPassphraseObject,
	password: string,
): Promise<string> => {
	const {
		kdf,
		ciphertext,
		cipherparams: { iv, tag },
		kdfparams: { parallelism, salt, iterations, memorySize },
	} = encryptedPassphrase;

	const tagBuffer = getTagBuffer(tag);
	const key =
		kdf === KDF.ARGON2
			? await getKeyFromPasswordWithArgon2({
					password,
					salt: hexToBuffer(salt, 'Salt'),
					iterations,
					parallelism,
					memorySize,
			  })
			: getKeyFromPassword(password, hexToBuffer(salt, 'Salt'), iterations);

	const decipher = crypto.createDecipheriv('aes-256-gcm', key, hexToBuffer(iv, 'IV'));
	decipher.setAuthTag(tagBuffer);
	const firstBlock = decipher.update(hexToBuffer(ciphertext, 'Cipher text'));
	const decrypted = Buffer.concat([firstBlock, decipher.final()]);

	return decrypted.toString();
};

export const encryptPassphraseWithPassword = encryptAES256GCMWithPassword;

export const decryptPassphraseWithPassword = decryptAES256GCMWithPassword;

export const getKeyPairFromPhraseAndPath = async (phrase: string, path: string) => {
	const masterSeed = await Mnemonic.mnemonicToSeed(phrase);
	let node = getMasterKeyFromSeed(masterSeed);

	for (const segment of parseKeyDerivationPath(path)) {
		node = getChildKey(node, segment);
	}

	return getKeyPair(node.key);
};

export const getBLSPrivateKeyFromPhraseAndPath = async (phrase: string, path: string) => {
	const masterSeed = await Mnemonic.mnemonicToSeed(phrase);
	let key = blsKeyGen(masterSeed);

	for (const segment of parseKeyDerivationPath(path)) {
		key = deriveChildSK(key, segment);
	}

	return key;
};
