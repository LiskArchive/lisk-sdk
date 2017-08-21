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
import { Buffer } from 'buffer';
import bignum from 'browserify-bignum';
import { getSha256Hash } from './hash';
import { bufferToHex, useFirstEightBufferEntriesReversed } from './convert';

/**
 * @method getPrivateAndPublicKeyFromSecret
 * @param secret
 *
 * @return {object}
 */

function getPrivateAndPublicKeyFromSecret(secret) {
	const sha256Hash = getSha256Hash(secret, 'utf8');
	const { signSk, signPk } = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return {
		privateKey: bufferToHex(Buffer.from(signSk)),
		publicKey: bufferToHex(Buffer.from(signPk)),
	};
}

/**
 * @method getRawPrivateAndPublicKeyFromSecret
 * @param secret
 *
 * @return {object}
 */

function getRawPrivateAndPublicKeyFromSecret(secret) {
	const sha256Hash = getSha256Hash(secret, 'utf8');
	const { signSk, signPk } = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return {
		privateKey: signSk,
		publicKey: signPk,
	};
}

/**
 * @method getAddressFromPublicKey
 * @param publicKey
 *
 * @return {string}
 */

function getAddressFromPublicKey(publicKey) {
	const publicKeyHash = getSha256Hash(publicKey, 'hex');

	const publicKeyTransform = useFirstEightBufferEntriesReversed(publicKeyHash);
	const address = `${bignum.fromBuffer(publicKeyTransform).toString()}L`;

	return address;
}

/**
 * @method getKeys
 * @param secret string
 *
 * @return {object}
 */

function getKeys(secret) {
	return getPrivateAndPublicKeyFromSecret(secret);
}

export {
	getPrivateAndPublicKeyFromSecret as getKeypair,
	getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey,
	getKeys,
};
