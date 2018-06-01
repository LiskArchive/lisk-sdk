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
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import sha256 from 'js-sha256';
import { hexToBuffer } from './convert';

nacl.util = naclUtil;

const cryptoHashSha256 = data => {
	const hash = sha256.create();
	hash.update(data);
	return new Uint8Array(hash.array());
};

const hash = (data, format) => {
	if (Buffer.isBuffer(data)) {
		return Buffer.from(cryptoHashSha256(data)); // :: should I remove Buffer.from?
	}

	if (typeof data === 'string') {
		if (!['utf8', 'hex'].includes(format)) {
			throw new Error(
				'Unsupported string format. Currently only `hex` and `utf8` are supported.',
			);
		}
		const encoded =
			format === 'utf8' ? nacl.util.decodeUTF8(data) : hexToBuffer(data);
		return cryptoHashSha256(encoded);
	}

	throw new Error(
		'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
	);
};

export default hash;
