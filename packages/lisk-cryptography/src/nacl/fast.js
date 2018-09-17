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
// eslint-disable-next-line
import sodium from 'sodium-native';

export const box = (
	messageInBytes,
	nonceInBytes,
	convertedPublicKey,
	convertedPrivateKey,
) => {
	const cipherBytes = Buffer.alloc(
		messageInBytes.length + sodium.crypto_box_MACBYTES,
	);
	sodium.crypto_box_easy(
		cipherBytes,
		messageInBytes,
		nonceInBytes,
		convertedPublicKey,
		convertedPrivateKey,
	);
	return cipherBytes;
};

export const boxOpen = (
	cipherBytes,
	nonceBytes,
	convertedPublicKey,
	convertedPrivateKey,
) => {
	const plainText = Buffer.alloc(
		cipherBytes.length - sodium.crypto_box_MACBYTES,
	);
	sodium.crypto_box_open_easy(
		plainText,
		cipherBytes,
		nonceBytes,
		convertedPublicKey,
		convertedPrivateKey,
	);
	return plainText;
};

export const detachedSign = (messageBytes, privateKeyBytes) => {
	const signatureBytes = Buffer.alloc(sodium.crypto_sign_BYTES);
	sodium.crypto_sign_detached(signatureBytes, messageBytes, privateKeyBytes);
	return signatureBytes;
};

export const detachedVerify = (messageBytes, signatureBytes, publicKeyBytes) =>
	sodium.crypto_sign_verify_detached(
		signatureBytes,
		messageBytes,
		publicKeyBytes,
	);

export const getRandomBytes = length => {
	const nonce = Buffer.alloc(length);
	sodium.randombytes_buf(nonce);
	return nonce;
};

export const signKeyPair = hashedSeed => {
	const publicKeyBytes = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
	const privateKeyBytes = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);

	sodium.crypto_sign_seed_keypair(publicKeyBytes, privateKeyBytes, hashedSeed);
	return {
		publicKeyBytes,
		privateKeyBytes,
	};
};
