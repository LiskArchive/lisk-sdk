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
import * as crypto from 'crypto';
import { bufferToHex, hexToBuffer } from './buffer';

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
			throw new Error(
				'Unsupported string format. Currently only `hex` and `utf8` are supported.',
			);
		}
		const encoded =
			format === 'utf8' ? Buffer.from(data, 'utf8') : hexToBuffer(data);

		return cryptoHashSha256(encoded);
	}

	throw new Error(
		'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
	);
};

export const verifyChecksum = (
	data: Buffer | string,
	checksum: string,
): boolean => {
	const dataHash = hash(data);
	const hex = bufferToHex(dataHash);

	return hex === checksum;
};
