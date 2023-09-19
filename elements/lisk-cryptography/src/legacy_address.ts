/*
 * Copyright © 2020 Lisk Foundation
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

import { getKeys } from './legacy';
import { getPublicKey } from './nacl';
import { hash } from './utils';

// eslint-disable-next-line import/order
import reverse = require('buffer-reverse');

export const getFirstEightBytesReversed = (input: string | Buffer): Buffer => {
	const BUFFER_SIZE = 8;
	// Union type arguments on overloaded functions do not work in typescript.
	// Relevant discussion: https://github.com/Microsoft/TypeScript/issues/23155
	if (typeof input === 'string') {
		return reverse(Buffer.from(input).subarray(0, BUFFER_SIZE));
	}

	return reverse(Buffer.from(input).subarray(0, BUFFER_SIZE));
};

export const getLegacyAddressFromPublicKey = (publicKey: Buffer): string => {
	const publicKeyHash = hash(publicKey);
	const publicKeyTransform = getFirstEightBytesReversed(publicKeyHash);

	return `${publicKeyTransform.readBigUInt64BE().toString()}L`;
};

export const getLegacyAddressAndPublicKeyFromPassphrase = (
	passphrase: string,
): { readonly address: string; readonly publicKey: Buffer } => {
	const { publicKey } = getKeys(passphrase);
	const address = getLegacyAddressFromPublicKey(publicKey);

	return {
		address,
		publicKey,
	};
};

export const getLegacyAddressFromPassphrase = (passphrase: string): string => {
	const { publicKey } = getKeys(passphrase);

	return getLegacyAddressFromPublicKey(publicKey);
};

export const getLegacyAddressFromPrivateKey = (privateKey: Buffer): string => {
	const publicKey = getPublicKey(privateKey);

	return getLegacyAddressFromPublicKey(publicKey);
};
