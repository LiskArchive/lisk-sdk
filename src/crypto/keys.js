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
import { bufferToHex, getAddress } from './convert';
import hash from './hash';

/**
 * @method getPrivateAndPublicKeyBytesFromSecret
 * @param secret
 *
 * @return {object}
 */

export const getPrivateAndPublicKeyBytesFromSecret = secret => {
	const hashed = hash(secret, 'utf8');

	const { signSk, signPk } = naclInstance.crypto_sign_seed_keypair(hashed);

	return {
		privateKey: signSk,
		publicKey: signPk,
	};
};

/**
 * @method getPrivateAndPublicKeyFromSecret
 * @param secret
 *
 * @return {object}
 */

export const getPrivateAndPublicKeyFromSecret = secret => {
	const { privateKey, publicKey } = getPrivateAndPublicKeyBytesFromSecret(
		secret,
	);

	return {
		privateKey: bufferToHex(privateKey),
		publicKey: bufferToHex(publicKey),
	};
};

/**
 * @method getKeys
 * @param secret string
 *
 * @return {object}
 */

export const getKeys = getPrivateAndPublicKeyFromSecret;

/**
 * @method getAddressAndPublicKeyFromSecret
 * @param secret
 *
 * @return {object}
 */

export const getAddressAndPublicKeyFromSecret = secret => {
	const accountKeys = getKeys(secret);
	const accountAddress = getAddress(accountKeys.publicKey);

	return {
		address: accountAddress,
		publicKey: accountKeys.publicKey,
	};
};
