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
import { hash } from './hash';

// eslint-disable-next-line @typescript-eslint/no-require-imports
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
	for (var p = 0; p < uintArray.length; ++p) {
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

export const getFirstNBytes = (
	input: string | Buffer,
	size: number,
): Buffer => {
	// Union type arguments on overloaded functions do not work in typescript.
	// Relevant discussion: https://github.com/Microsoft/TypeScript/issues/23155
	if (typeof input === 'string') {
		return Buffer.from(input, 'hex').slice(0, size);
	}

	return Buffer.from(input).slice(0, size);
};

export const getFirstEightBytesReversed = (input: string | Buffer): Buffer => {
	const BUFFER_SIZE = 8;
	// Union type arguments on overloaded functions do not work in typescript.
	// Relevant discussion: https://github.com/Microsoft/TypeScript/issues/23155
	if (typeof input === 'string') {
		return reverse(Buffer.from(input).slice(0, BUFFER_SIZE));
	}

	return reverse(Buffer.from(input).slice(0, BUFFER_SIZE));
};

export const toAddress = (buffer: Buffer): string => {
	const BUFFER_SIZE = 20;
	const truncatedBuffer = getFirstNBytes(buffer, BUFFER_SIZE);

	if (truncatedBuffer.length !== BUFFER_SIZE) {
		throw new Error('The Lisk addresses must contains exactly 20 bytes');
	}

	return truncatedBuffer.toString('hex');
};

export const getAddressFromPublicKey = (publicKey: string): string =>
	toAddress(hash(publicKey, 'hex'));

export const convertPublicKeyEd2Curve = ed2curve.convertPublicKey;

export const convertPrivateKeyEd2Curve = ed2curve.convertSecretKey;

export const stringifyEncryptedPassphrase = (
	encryptedPassphrase: EncryptedPassphraseObject,
): string => {
	if (typeof encryptedPassphrase !== 'object' || encryptedPassphrase === null) {
		throw new Error('Encrypted passphrase to stringify must be an object.');
	}
	const objectToStringify = encryptedPassphrase.iterations
		? encryptedPassphrase
		: {
				salt: encryptedPassphrase.salt,
				cipherText: encryptedPassphrase.cipherText,
				iv: encryptedPassphrase.iv,
				tag: encryptedPassphrase.tag,
				version: encryptedPassphrase.version,
		  };

	return querystring.stringify(objectToStringify);
};

const parseIterations = (iterationsString?: string): number | undefined => {
	const iterations =
		iterationsString === undefined ? undefined : parseInt(iterationsString, 10);

	if (typeof iterations !== 'undefined' && Number.isNaN(iterations)) {
		throw new Error('Could not parse iterations.');
	}

	return iterations;
};

export const parseEncryptedPassphrase = (
	encryptedPassphrase: string,
): EncryptedPassphraseObject => {
	if (typeof encryptedPassphrase !== 'string') {
		throw new Error('Encrypted passphrase to parse must be a string.');
	}
	const keyValuePairs = querystring.parse(encryptedPassphrase);

	const { iterations, salt, cipherText, iv, tag, version } = keyValuePairs;

	// Review, and find a better solution
	if (
		(typeof iterations !== 'string' && typeof iterations !== 'undefined') ||
		typeof salt !== 'string' ||
		typeof cipherText !== 'string' ||
		typeof iv !== 'string' ||
		typeof tag !== 'string' ||
		typeof version !== 'string'
	) {
		throw new Error(
			'Encrypted passphrase to parse must have only one value per key.',
		);
	}

	return {
		iterations: parseIterations(iterations),
		salt,
		cipherText,
		iv,
		tag,
		version,
	};
};
