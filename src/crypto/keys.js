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
import { getSha256Hash } from './hash';
import { bufferToHex, getAddress } from './convert';

/**
 * @method getRawPrivateAndPublicKeyFromSecret
 * @param secret
 *
 * @return {object}
 */

export function getRawPrivateAndPublicKeyFromSecret(secret) {
	const sha256Hash = getSha256Hash(secret, 'utf8');
	const { signSk, signPk } = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return {
		privateKey: signSk,
		publicKey: signPk,
	};
}

/**
 * @method getPrivateAndPublicKeyFromSecret
 * @param secret
 *
 * @return {object}
 */

export function getPrivateAndPublicKeyFromSecret(secret) {
	const { privateKey, publicKey } = getRawPrivateAndPublicKeyFromSecret(secret);

	return {
		privateKey: bufferToHex(privateKey),
		publicKey: bufferToHex(publicKey),
	};
}

/**
 * @method getKeys
 * @param secret string
 *
 * @return {object}
 */

export function getKeys(secret) {
	return getPrivateAndPublicKeyFromSecret(secret);
}

/**
 * @method getAddressAndPublicKeyFromSecret
 * @param secret
 *
 * @return {object}
 */

export function getAddressAndPublicKeyFromSecret(secret) {
	const accountKeys = getKeys(secret);
	const accountAddress = getAddress(accountKeys.publicKey);

	return {
		address: accountAddress,
		publicKey: accountKeys.publicKey,
	};
}
