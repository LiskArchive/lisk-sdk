/*
 * Copyright © 2021 Lisk Foundation
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
import { HARDENED_OFFSET, MAX_UINT32 } from './constants';

import { getRandomBytes } from './nacl';

const cryptoHashSha256 = (data: Buffer): Buffer => {
	const dataHash = crypto.createHash('sha256');
	dataHash.update(data);

	return dataHash.digest();
};

export const hash = (data: Buffer | string, format?: string): Buffer => {
	if (Buffer.isBuffer(data)) {
		return cryptoHashSha256(data);
	}

	if (typeof data === 'string' && typeof format === 'string') {
		if (!['utf8', 'hex'].includes(format)) {
			throw new Error('Unsupported string format. Currently only `hex` and `utf8` are supported.');
		}
		const encoded = format === 'utf8' ? Buffer.from(data, 'utf8') : Buffer.from(data, 'hex');

		return cryptoHashSha256(encoded);
	}

	throw new Error(
		`Unsupported data:${data} and format:${
			format ?? 'undefined'
		}. Currently only Buffers or hex and utf8 strings are supported.`,
	);
};

export const parseKeyDerivationPath = (path: string) => {
	if (!path.startsWith('m') || !path.includes('/')) {
		throw new Error('Invalid path format');
	}

	return (
		path
			.split('/')
			// slice first element which is `m`
			.slice(1)
			.map(segment => {
				if (!/^[0-9']+$/g.test(segment)) {
					throw new Error('Invalid path format');
				}

				// if segment includes apostrophe add HARDENED_OFFSET
				if (segment.includes(`'`)) {
					if (parseInt(segment.slice(0, -1), 10) > MAX_UINT32 / 2) {
						throw new Error('Invalid path format');
					}
					return parseInt(segment, 10) + HARDENED_OFFSET;
				}

				if (parseInt(segment, 10) > MAX_UINT32) {
					throw new Error('Invalid path format');
				}

				return parseInt(segment, 10);
			})
	);
};

const TAG_REGEX = /^([A-Za-z0-9])+$/;

export const createMessageTag = (domain: string, version?: number | string): string => {
	if (!TAG_REGEX.test(domain)) {
		throw new Error(
			`Message tag domain must be alpha numeric without special characters. Got "${domain}".`,
		);
	}

	if (version && !TAG_REGEX.test(version.toString())) {
		throw new Error(
			`Message tag version must be alpha numeric without special characters. Got "${version}"`,
		);
	}

	return `LSK_${version ? `${domain}:${version}` : domain}_`;
};

export const tagMessage = (tag: string, chainID: Buffer, message: string | Buffer): Buffer =>
	Buffer.concat([
		Buffer.from(tag, 'utf8'),
		chainID,
		typeof message === 'string' ? Buffer.from(message, 'utf8') : message,
	]);

export const BIG_ENDIAN = 'big';
export const LITTLE_ENDIAN = 'little';
const MAX_NUMBER_BYTE_LENGTH = 6;

export const intToBuffer = (
	value: number | string,
	byteLength: number,
	endianness = BIG_ENDIAN,
	signed = false,
): Buffer => {
	if (![BIG_ENDIAN, LITTLE_ENDIAN].includes(endianness)) {
		throw new Error(`Endianness must be either ${BIG_ENDIAN} or ${LITTLE_ENDIAN}`);
	}
	const buffer = Buffer.alloc(byteLength);
	if (endianness === 'big') {
		if (byteLength <= MAX_NUMBER_BYTE_LENGTH) {
			if (signed) {
				buffer.writeIntBE(Number(value), 0, byteLength);
			} else {
				buffer.writeUIntBE(Number(value), 0, byteLength);
			}
		} else {
			// eslint-disable-next-line no-lonely-if
			if (signed) {
				buffer.writeBigInt64BE(BigInt(value));
			} else {
				buffer.writeBigUInt64BE(BigInt(value));
			}
		}
	} else {
		// eslint-disable-next-line no-lonely-if
		if (byteLength <= MAX_NUMBER_BYTE_LENGTH) {
			if (signed) {
				buffer.writeIntLE(Number(value), 0, byteLength);
			} else {
				buffer.writeUIntLE(Number(value), 0, byteLength);
			}
		} else {
			// eslint-disable-next-line no-lonely-if
			if (signed) {
				buffer.writeBigInt64LE(BigInt(value));
			} else {
				buffer.writeBigUInt64LE(BigInt(value));
			}
		}
	}

	return buffer;
};

const hexRegex = /^[0-9a-f]+/i;
export const hexToBuffer = (hex: string, argumentName = 'Argument'): Buffer => {
	if (typeof hex !== 'string') {
		throw new TypeError(`${argumentName} must be a string.`);
	}
	// eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
	const matchedHex = (hex.match(hexRegex) ?? [])[0];
	if (!matchedHex || matchedHex.length !== hex.length) {
		throw new TypeError(`${argumentName} must be a valid hex string.`);
	}
	if (matchedHex.length % 2 !== 0) {
		throw new TypeError(`${argumentName} must have a valid length of hex string.`);
	}

	return Buffer.from(matchedHex, 'hex');
};

const HASH_SIZE = 16;
const INPUT_SIZE = 64;
const defaultCount = 1000000;
const defaultDistance = 1000;

export const generateHashOnionSeed = (): Buffer =>
	hash(getRandomBytes(INPUT_SIZE)).subarray(0, HASH_SIZE);

export const hashOnion = (
	seed: Buffer,
	count: number = defaultCount,
	distance: number = defaultDistance,
): ReadonlyArray<Buffer> => {
	if (count < distance) {
		throw new Error('Invalid count or distance. Count must be greater than distance');
	}

	if (count % distance !== 0) {
		throw new Error('Invalid count. Count must be multiple of distance');
	}

	let previousHash = seed;
	const hashes = [seed];

	for (let i = 1; i <= count; i += 1) {
		const nextHash = hash(previousHash).subarray(0, HASH_SIZE);
		if (i % distance === 0) {
			hashes.push(nextHash);
		}
		previousHash = nextHash;
	}

	return hashes.reverse();
};

export { getRandomBytes };
