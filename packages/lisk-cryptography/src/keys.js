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
import { bufferToHex } from './buffer';
import { getAddressFromPublicKey } from './convert';
import hash from './hash';

export const getPrivateAndPublicKeyBytesFromPassphrase = passphrase => {
	const hashed = hash(passphrase, 'utf8');
	const { publicKey, secretKey } = nacl.sign.keyPair.fromSeed(hashed);

	return {
		privateKey: secretKey,
		publicKey,
	};
};

export const getPrivateAndPublicKeyFromPassphrase = passphrase => {
	const { privateKey, publicKey } = getPrivateAndPublicKeyBytesFromPassphrase(
		passphrase,
	);

	return {
		privateKey: bufferToHex(privateKey),
		publicKey: bufferToHex(publicKey),
	};
};

export const getKeys = getPrivateAndPublicKeyFromPassphrase;

export const getAddressAndPublicKeyFromPassphrase = passphrase => {
	const { publicKey } = getKeys(passphrase);
	const address = getAddressFromPublicKey(publicKey);

	return {
		address,
		publicKey,
	};
};

export const getAddressFromPassphrase = passphrase => {
	const { publicKey } = getKeys(passphrase);
	return getAddressFromPublicKey(publicKey);
};
