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
import { bufferToHex, hexToBuffer } from '../../crypto/convert';

export const validatePublicKey = publicKey => {
	const publicKeyBuffer = hexToBuffer(publicKey);
	if (bufferToHex(publicKeyBuffer) !== publicKey) {
		throw new Error('Public key must be a valid hex string.');
	}
	if (publicKey.length !== 64 || publicKeyBuffer.length !== 32) {
		throw new Error(
			`Public key ${publicKey} length differs from the expected 64 hex characters (32 bytes) for a public key.`,
		);
	}

	return publicKey;
};

export const validatePublicKeys = publicKeys =>
	publicKeys.map(publicKey => validatePublicKey(publicKey));
