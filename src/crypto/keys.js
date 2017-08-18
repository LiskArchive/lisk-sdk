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
import hash from './hash';
import convert from './convert';

function getPrivateAndPublicKeyFromSecret(secret) {
	const sha256Hash = hash.getSha256Hash(secret, 'utf8');
	const keypair = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return {
		privateKey: convert.bufferToHex(Buffer.from(keypair.signSk)),
		publicKey: convert.bufferToHex(Buffer.from(keypair.signPk)),
	};
}

function getRawPrivateAndPublicKeyFromSecret(secret) {
	const sha256Hash = hash.getSha256Hash(secret, 'utf8');
	const keypair = naclInstance.crypto_sign_seed_keypair(sha256Hash);

	return {
		privateKey: keypair.signSk,
		publicKey: keypair.signPk,
	};
}

function getAddressFromPublicKey(publicKey) {
	const publicKeyHash = hash.getSha256Hash(publicKey, 'hex');

	const publicKeyTransform = convert.useFirstEightBufferEntriesReversed(publicKeyHash);
	const address = `${bignum.fromBuffer(publicKeyTransform).toString()}L`;

	return address;
}

module.exports = {
	getKeypair: getPrivateAndPublicKeyFromSecret,
	getPrivateAndPublicKeyFromSecret,
	getRawPrivateAndPublicKeyFromSecret,
	getAddressFromPublicKey,
};
