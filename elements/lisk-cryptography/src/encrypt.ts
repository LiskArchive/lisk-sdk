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
import * as querystring from 'querystring';
import * as crypto from 'crypto';
import { hexToBuffer } from './utils';

const PBKDF2_ITERATIONS = 1e6;
const PBKDF2_KEYLEN = 32;
const PBKDF2_HASH_FUNCTION = 'sha256';
const ENCRYPTION_VERSION = '1';
const HASH_LENGTH = 32;
const ARGON2_ITERATIONS = 1;
const ARGON2_PARALLELISM = 4;
export const ARGON2_MEMORY = 2097023;

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
	AES128GCM = 'aes-128-gcm',
}

export enum KDF {
	ARGON2 = 'argon2id',
	PBKDF2 = 'PBKDF2',
}

export interface EncryptedMessageObject {
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

export const encryptAES128GCMWithPassword = async (
	plainText: string | Buffer,
	password: string,
	options?: {
		kdf?: KDF;
		kdfparams?: {
			parallelism?: number;
			iterations?: number;
			memorySize?: number;
		};
		getKey?: (options: {
			password: string;
			salt: Buffer;
			iterations: number;
			parallelism: number;
			memorySize: number;
			hashLength: number;
		}) => Promise<Buffer>;
	},
): Promise<EncryptedMessageObject> => {
	const kdf = options?.kdf ?? KDF.ARGON2;
	const IV_BUFFER_SIZE = 16;
	const SALT_BUFFER_SIZE = 8;
	const salt = crypto.randomBytes(SALT_BUFFER_SIZE);
	const iv = crypto.randomBytes(IV_BUFFER_SIZE);
	const iterations =
		kdf === KDF.ARGON2 ? ARGON2_ITERATIONS : options?.kdfparams?.iterations ?? PBKDF2_ITERATIONS;
	const parallelism = options?.kdfparams?.parallelism ?? ARGON2_PARALLELISM;
	const memorySize = options?.kdfparams?.memorySize ?? ARGON2_MEMORY;
	let key: Buffer;

	if (options?.getKey !== undefined) {
		key = await options.getKey({
			password,
			salt,
			iterations,
			parallelism,
			memorySize,
			hashLength: HASH_LENGTH,
		});
	} else if (kdf === KDF.ARGON2) {
		key = await getKeyFromPasswordWithArgon2({
			password,
			salt,
			iterations,
			parallelism,
			memorySize,
		});
	} else {
		key = getKeyFromPassword(password, salt, iterations);
	}

	const cipher = crypto.createCipheriv('aes-128-gcm', key.subarray(0, 16), iv);
	const firstBlock = Buffer.isBuffer(plainText)
		? cipher.update(plainText)
		: cipher.update(plainText, 'utf8');
	const encrypted = Buffer.concat([firstBlock, cipher.final()]);
	const tag = cipher.getAuthTag();

	return {
		ciphertext: encrypted.toString('hex'),
		mac: crypto.createHash('sha256').update(key.subarray(16, 32)).update(encrypted).digest('hex'),
		kdf,
		kdfparams: {
			parallelism,
			iterations,
			memorySize,
			salt: salt.toString('hex'),
		},
		cipher: Cipher.AES128GCM,
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

// Using `function` for overloading typescript
export async function decryptAES128GCMWithPassword(
	encryptedMessage: EncryptedMessageObject,
	password: string,
): Promise<Buffer>;
export async function decryptAES128GCMWithPassword(
	encryptedMessage: EncryptedMessageObject,
	password: string,
	encoding: 'utf8' | 'utf-8',
	options?: {
		getKey?: (options: {
			password: string;
			salt: Buffer;
			iterations: number;
			parallelism: number;
			memorySize: number;
		}) => Promise<Buffer>;
	},
): Promise<string>;
export async function decryptAES128GCMWithPassword(
	encryptedMessage: EncryptedMessageObject,
	password: string,
	encoding?: 'utf8' | 'utf-8',
	options?: {
		getKey?: (options: {
			password: string;
			salt: Buffer;
			iterations: number;
			parallelism: number;
			memorySize: number;
			hashLength: number;
		}) => Promise<Buffer>;
	},
): Promise<string | Buffer> {
	const {
		kdf,
		ciphertext,
		cipherparams: { iv, tag },
		kdfparams: { parallelism, salt, iterations, memorySize },
	} = encryptedMessage;

	const tagBuffer = getTagBuffer(tag);
	let key: Buffer;

	if (options?.getKey !== undefined) {
		key = await options.getKey({
			password,
			salt: hexToBuffer(salt, 'Salt'),
			iterations,
			parallelism,
			memorySize,
			hashLength: HASH_LENGTH,
		});
	} else if (kdf === KDF.ARGON2) {
		key = await getKeyFromPasswordWithArgon2({
			password,
			salt: hexToBuffer(salt, 'Salt'),
			iterations,
			parallelism,
			memorySize,
		});
	} else {
		key = getKeyFromPassword(password, hexToBuffer(salt, 'Salt'), iterations);
	}
	const decipher = crypto.createDecipheriv(
		'aes-128-gcm',
		key.subarray(0, 16),
		hexToBuffer(iv, 'IV'),
	);
	decipher.setAuthTag(tagBuffer);
	const firstBlock = decipher.update(hexToBuffer(ciphertext, 'Cipher text'));
	const decrypted = Buffer.concat([firstBlock, decipher.final()]);

	if (encoding === 'utf-8' || encoding === 'utf8') {
		return decrypted.toString();
	}

	return decrypted;
}

export const encryptMessageWithPassword = encryptAES128GCMWithPassword;

export const decryptMessageWithPassword = decryptAES128GCMWithPassword;

const parseOption = (optionString?: string): number | undefined => {
	const option = !optionString ? undefined : parseInt(optionString, 10);

	if (typeof option !== 'undefined' && Number.isNaN(option)) {
		throw new Error('Could not parse option.');
	}

	return option;
};

export const parseEncryptedMessage = (encryptedMessage: string): EncryptedMessageObject => {
	if (typeof encryptedMessage !== 'string') {
		throw new Error('Encrypted message to parse must be a string.');
	}
	const keyValuePairs = querystring.parse(encryptedMessage);

	const {
		kdf,
		cipher,
		iterations,
		salt,
		ciphertext,
		iv,
		tag,
		version,
		mac,
		parallelism,
		memorySize,
	} = keyValuePairs;

	// Review, and find a better solution
	if (
		typeof kdf !== 'string' ||
		typeof cipher !== 'string' ||
		typeof ciphertext !== 'string' ||
		typeof iv !== 'string' ||
		typeof tag !== 'string' ||
		typeof salt !== 'string' ||
		typeof version !== 'string' ||
		typeof mac !== 'string' ||
		(typeof iterations !== 'string' && typeof iterations !== 'undefined') ||
		(typeof parallelism !== 'string' && typeof parallelism !== 'undefined') ||
		(typeof memorySize !== 'string' && typeof memorySize !== 'undefined')
	) {
		throw new Error('Encrypted message to parse must have only one value per key.');
	}

	const kdfTypes: string[] = [KDF.ARGON2, KDF.PBKDF2];
	if (!kdfTypes.includes(kdf)) {
		throw new Error(`KDF must be one of ${kdfTypes.toString()}`);
	}

	const cipherTypes: string[] = [Cipher.AES128GCM];
	if (!cipherTypes.includes(cipher)) {
		throw new Error(`Cipher must be one of ${cipherTypes.toString()}`);
	}

	return {
		version,
		ciphertext,
		mac,
		kdf: kdf as KDF,
		kdfparams: {
			parallelism: parseOption(parallelism) ?? ARGON2_PARALLELISM,
			iterations: parseOption(iterations) ?? ARGON2_ITERATIONS,
			memorySize: parseOption(memorySize) ?? ARGON2_MEMORY,
			salt,
		},
		cipher: cipher as Cipher,
		cipherparams: {
			iv,
			tag,
		},
	};
};

export const stringifyEncryptedMessage = (encryptedMessage: EncryptedMessageObject): string => {
	if (typeof encryptedMessage !== 'object' || encryptedMessage === null) {
		throw new Error('Encrypted message to stringify must be an object.');
	}
	const objectToStringify = {
		kdf: encryptedMessage.kdf,
		cipher: encryptedMessage.cipher,
		version: encryptedMessage.version,
		ciphertext: encryptedMessage.ciphertext,
		mac: encryptedMessage.mac,
		salt: encryptedMessage.kdfparams.salt,
		iv: encryptedMessage.cipherparams.iv,
		tag: encryptedMessage.cipherparams.tag,
		iterations: encryptedMessage.kdfparams.iterations,
		parallelism: encryptedMessage.kdfparams.parallelism,
		memorySize: encryptedMessage.kdfparams.memorySize,
	};

	return querystring.stringify(objectToStringify);
};
