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
import { HARDENED_OFFSET, ED25519_CURVE, MAX_UINT32 } from './constants';

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
