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
import { blsKeyGen } from './bls_lib';
import {
	HARDENED_OFFSET,
	ED25519_CURVE,
	MAX_UINT32,
	HASH_LENGTH,
	L,
	EMPTY_SALT,
} from './constants';

export const readBit = (buf: Buffer, bit: number): boolean => {
	const byteIndex = Math.floor(bit / 8);
	const bitIndex = bit % 8;

	// eslint-disable-next-line no-bitwise
	return (buf[byteIndex] >> bitIndex) % 2 === 1;
};

export const writeBit = (buf: Buffer, bit: number, val: boolean): void => {
	const byteIndex = Math.floor(bit / 8);
	const bitIndex = bit % 8;

	if (val) {
		// eslint-disable-next-line no-bitwise, no-param-reassign
		buf[byteIndex] |= 1 << bitIndex;
	} else {
		// eslint-disable-next-line no-bitwise, no-param-reassign
		buf[byteIndex] &= ~(1 << bitIndex);
	}
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

export const getMasterKeyFromSeed = (seed: Buffer) => {
	const hmac = crypto.createHmac('sha512', ED25519_CURVE);
	const digest = hmac.update(seed).digest();
	const leftBytes = digest.slice(0, 32);
	const rightBytes = digest.slice(32);
	return {
		key: leftBytes,
		chainCode: rightBytes,
	};
};

export const getChildKey = (node: { key: Buffer; chainCode: Buffer }, index: number) => {
	const indexBuffer = Buffer.allocUnsafe(4);
	indexBuffer.writeUInt32BE(index, 0);
	const data = Buffer.concat([Buffer.alloc(1, 0), node.key, indexBuffer]);
	const digest = crypto.createHmac('sha512', node.chainCode).update(data).digest();
	const leftBytes = digest.slice(0, 32);
	const rightBytes = digest.slice(32);

	return {
		key: leftBytes,
		chainCode: rightBytes,
	};
};

// eslint-disable-next-line no-bitwise
const flipBits = (buf: Buffer) => Buffer.from(buf.map(x => x ^ 0xff));

const sha256 = (x: Buffer) => crypto.createHash('sha256').update(x).digest();

const hmacSHA256 = (key: Buffer, message: Buffer, hash: string) =>
	crypto.createHmac(hash, key).update(message).digest();

const hkdfSHA256 = (ikm: Buffer, length: number, salt: Buffer, info: Buffer) => {
	if (salt.length === 0) {
		// eslint-disable-next-line no-param-reassign
		salt = EMPTY_SALT;
	}
	const PRK = hmacSHA256(salt, ikm, 'sha256');
	let t = Buffer.from([]);
	let OKM = Buffer.from([]);

	for (let i = 0; i < Math.ceil(length / HASH_LENGTH); i += 1) {
		t = hmacSHA256(PRK, Buffer.concat([t, info, Buffer.from([1 + i])]), 'sha256');
		OKM = Buffer.concat([OKM, t]);
	}
	return OKM.slice(0, length);
};

const toLamportSK = (IKM: Buffer, salt: Buffer) => {
	const info = Buffer.from([]);
	const OKM = hkdfSHA256(IKM, L, salt, info);

	const lamportSK = [];
	for (let i = 0; i < 255; i += 1) {
		lamportSK.push(OKM.slice(i * 32, (i + 1) * 32));
	}
	return lamportSK;
};

const parentSKToLamportPK = (parentSK: Buffer, index: number) => {
	const salt = Buffer.allocUnsafe(4);
	salt.writeUIntBE(index, 0, 4);

	const IKM = parentSK;
	const hashedLamport0 = toLamportSK(IKM, salt).map(x => sha256(x));
	const hashedLamport1 = toLamportSK(flipBits(IKM), salt).map(x => sha256(x));

	const lamportPK = Buffer.concat(hashedLamport0.concat(hashedLamport1));
	return sha256(lamportPK);
};

export const deriveChildSK = (parentSK: Buffer, index: number) => {
	const lamportPK = parentSKToLamportPK(parentSK, index);
	return blsKeyGen(lamportPK);
};
