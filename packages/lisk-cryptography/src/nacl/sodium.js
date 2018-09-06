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
import sodium from 'sodium-native';

export const naclSignPublicKeyLength = 32;

export const naclSignSignatureLength = 64;

export const randombytes = data => {
	const nonce = Buffer.alloc(data);
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

export const signDetached = (messageBytes, privateKeyBytes) => {
	const signatureBytes = Buffer.alloc(sodium.crypto_sign_BYTES);
	sodium.crypto_sign_detached(signatureBytes, messageBytes, privateKeyBytes);
	return signatureBytes;
};

export const detachedVerify = (
	messageBytes,
	signatureBytes,
	publicKeyBytes,
) => sodium.crypto_sign_verify_detached(
		signatureBytes,
		messageBytes,
		publicKeyBytes,
	);


export const box = (
	messageInBytes,
	nonceInBytes,
	convertedPublicKey,
	convertedPrivateKey,
) => {
	const cipherText = Buffer.alloc(
		messageInBytes.length + sodium.crypto_box_MACBYTES,
	);
	sodium.crypto_box_easy(
		cipherText,
		messageInBytes,
		nonceInBytes,
		convertedPublicKey,
		convertedPrivateKey,
	);
	return cipherText;
};

export const boxOpen = (
	cipherBytes,
	nonceBytes,
	convertedPublicKey,
	convertedPrivateKey,
) => {
	const plainText = Buffer.alloc(
		cipherBytes.length + sodium.crypto_box_MACBYTES,
	);
	sodium.crypto_box_open_easy(
		plainText,
		cipherBytes,
		nonceBytes,
		convertedPublicKey,
		convertedPrivateKey,
	);
	const decoded = plainText.slice(
		0,
		cipherBytes.length - sodium.crypto_box_MACBYTES,
	);
	return decoded;
};
