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
import { bufferToHex, hexToBuffer } from './buffer';
import { getAddressFromPublicKey } from './convert';
import { hash } from './hash';
import { getKeyPair, getPublicKey } from './nacl';

export interface KeypairBytes {
	readonly privateKeyBytes: Buffer;
	readonly publicKeyBytes: Buffer;
}

export interface Keypair {
	readonly privateKey: string;
	readonly publicKey: string;
}

export const getPrivateAndPublicKeyBytesFromPassphrase = (
	passphrase: string,
): KeypairBytes => {
	const hashed = hash(passphrase, 'utf8');
	const { publicKeyBytes, privateKeyBytes } = getKeyPair(hashed);

	return {
		privateKeyBytes,
		publicKeyBytes,
	};
};

export const getPrivateAndPublicKeyFromPassphrase = (
	passphrase: string,
): Keypair => {
	const {
		privateKeyBytes,
		publicKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);

	return {
		privateKey: bufferToHex(privateKeyBytes),
		publicKey: bufferToHex(publicKeyBytes),
	};
};

export const getKeys = getPrivateAndPublicKeyFromPassphrase;

export const getAddressAndPublicKeyFromPassphrase = (
	passphrase: string,
): { readonly address: string; readonly publicKey: string } => {
	const { publicKey } = getKeys(passphrase);
	const address = getAddressFromPublicKey(publicKey);

	return {
		address,
		publicKey,
	};
};

export const getAddressFromPassphrase = (passphrase: string): string => {
	const { publicKey } = getKeys(passphrase);

	return getAddressFromPublicKey(publicKey);
};

export const getAddressFromPrivateKey = (privateKey: string): string => {
	const publicKeyBytes = getPublicKey(hexToBuffer(privateKey));
	const publicKey = bufferToHex(publicKeyBytes);

	return getAddressFromPublicKey(publicKey);
};
