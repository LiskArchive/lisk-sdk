/*
 * Copyright © 2017 Lisk Foundation
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
const hash = (data, format) => {
	if (Buffer.isBuffer(data)) {
		return Buffer.from(naclInstance.crypto_hash_sha256(data));
	}

	if (typeof data === 'string') {
		if (!['utf8', 'hex'].includes(format)) {
			throw new Error(
				'Unsupported string format. Currently only `hex` and `utf8` are supported.',
			);
		}
		const encoded =
			format === 'utf8'
				? naclInstance.encode_utf8(data)
				: naclInstance.from_hex(data);
		return Buffer.from(naclInstance.crypto_hash_sha256(encoded));
	}

	throw new Error(
		'Unsupported data format. Currently only Buffers or `hex` and `utf8` strings are supported.',
	);
};

export default hash;
