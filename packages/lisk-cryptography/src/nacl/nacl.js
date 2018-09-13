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
import tweetnacl from 'tweetnacl';

export const naclSignPublicKeyLength = 32;

export const naclSignSignatureLength = 64;

export const randombytes = data => tweetnacl.randomBytes(data);

export const signKeyPair = hashedSeed => {
	const { publicKey, secretKey } = tweetnacl.sign.keyPair.fromSeed(hashedSeed);
	return {
		privateKeyBytes: secretKey,
		publicKeyBytes: publicKey,
	};
};

export const signDetached = (messageBytes, privateKeyBytes) =>
	tweetnacl.sign.detached(messageBytes, privateKeyBytes);

export const detachedVerify = (messageBytes, signatureBytes, publicKeyBytes) =>
	tweetnacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

export const box = (
	messageInBytes,
	nonceInBytes,
	convertedPublicKey,
	convertedPrivateKey,
) =>
	tweetnacl.box(
		messageInBytes,
		nonceInBytes,
		convertedPublicKey,
		convertedPrivateKey,
	);

export const boxOpen = (
	cipherBytes,
	nonceBytes,
	convertedPublicKey,
	convertedPrivateKey,
) =>
	tweetnacl.box.open(
		cipherBytes,
		nonceBytes,
		convertedPublicKey,
		convertedPrivateKey,
	);
