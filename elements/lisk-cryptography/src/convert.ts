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
// Required because first level function export
import * as ed2curve from 'ed2curve';
import * as querystring from 'querystring';

// eslint-disable-next-line import/no-cycle
import { EncryptedPassphraseObject } from './encrypt';

// eslint-disable-next-line import/order
import reverse = require('buffer-reverse');

const CHARSET = 'zxvcpmbn3465o978uyrtkqew2adsjhfg';

export const convertUIntArray = (
	uintArray: number[],
	fromBits: number,
	toBits: number,
): number[] => {
	// eslint-disable-next-line no-bitwise
	const maxValue = (1 << toBits) - 1;
	let accumulator = 0;
	let bits = 0;
	const result = [];
	// eslint-disable-next-line
	for (let p = 0; p < uintArray.length; p += 1) {
		const byte = uintArray[p];
		// check that the entry is a value between 0 and 2^frombits-1
		// eslint-disable-next-line no-bitwise
		if (byte < 0 || byte >> fromBits !== 0) {
			return [];
		}

		// eslint-disable-next-line no-bitwise
		accumulator = (accumulator << fromBits) | byte;
		bits += fromBits;
		while (bits >= toBits) {
			bits -= toBits;
			// eslint-disable-next-line no-bitwise
			result.push((accumulator >> bits) & maxValue);
		}
	}

	return result;
};

export const convertUInt5ToBase32 = (uint5Array: number[]): string =>
	uint5Array.map((val: number) => CHARSET[val]).join('');

export const getFirstEightBytesReversed = (input: string | Buffer): Buffer => {
	const BUFFER_SIZE = 8;
	// Union type arguments on overloaded functions do not work in typescript.
	// Relevant discussion: https://github.com/Microsoft/TypeScript/issues/23155
	if (typeof input === 'string') {
		return reverse(Buffer.from(input).slice(0, BUFFER_SIZE));
	}

	return reverse(Buffer.from(input).slice(0, BUFFER_SIZE));
};

export const convertPublicKeyEd2Curve = ed2curve.convertPublicKey;

export const convertPrivateKeyEd2Curve = ed2curve.convertSecretKey;

export const stringifyEncryptedPassphrase = (
	encryptedPassphrase: EncryptedPassphraseObject,
): string => {
	if (typeof encryptedPassphrase !== 'object' || encryptedPassphrase === null) {
		throw new Error('Encrypted passphrase to stringify must be an object.');
	}
	const objectToStringify = {
		version: encryptedPassphrase.version,
		ciphertext: encryptedPassphrase.ciphertext,
		mac: encryptedPassphrase.mac,
		salt: encryptedPassphrase.kdfparams.salt,
		iv: encryptedPassphrase.cipherparams.iv,
		tag: encryptedPassphrase.cipherparams.tag,
		iterations: encryptedPassphrase.kdfparams.iterations,
		parallelism: encryptedPassphrase.kdfparams.parallelism,
		memorySize: encryptedPassphrase.kdfparams.memorySize,
	};

	return querystring.stringify(objectToStringify);
};

const parseOption = (optionsString?: string): number | undefined => {
	const option = optionsString === undefined ? undefined : parseInt(optionsString, 10);

	if (typeof option !== 'undefined' && Number.isNaN(option)) {
		throw new Error('Could not parse option.');
	}

	return option;
};

interface ParsedEncryptedPassphrase {
	readonly version: string;
	readonly ciphertext: string;
	readonly mac: string;
	readonly salt: string;
	readonly iv: string;
	readonly tag: string;
	readonly iterations?: number;
	readonly parallelism?: number;
	readonly memorySize?: number;
}

export const parseEncryptedPassphrase = (
	encryptedPassphrase: string,
): ParsedEncryptedPassphrase => {
	if (typeof encryptedPassphrase !== 'string') {
		throw new Error('Encrypted passphrase to parse must be a string.');
	}
	const keyValuePairs = querystring.parse(encryptedPassphrase);

	const {
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
		(typeof iterations !== 'string' && typeof iterations !== 'undefined') ||
		typeof salt !== 'string' ||
		typeof ciphertext !== 'string' ||
		typeof iv !== 'string' ||
		typeof tag !== 'string' ||
		typeof version !== 'string' ||
		(typeof mac !== 'string' && typeof mac !== 'undefined') ||
		(typeof parallelism !== 'string' && typeof parallelism !== 'undefined') ||
		(typeof memorySize !== 'string' && typeof memorySize !== 'undefined')
	) {
		throw new Error('Encrypted passphrase to parse must have only one value per key.');
	}

	return {
		version,
		ciphertext,
		mac,
		salt,
		iv,
		tag,
		iterations: parseOption(iterations),
		parallelism: parseOption(parallelism),
		memorySize: parseOption(memorySize),
	};
};
