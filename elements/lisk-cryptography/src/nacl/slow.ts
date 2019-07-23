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
import * as tweetnacl from 'tweetnacl';
import { NaclInterface } from './nacl_types';

export const box: NaclInterface['box'] = (
	messageInBytes,
	nonceInBytes,
	convertedPublicKey,
	convertedPrivateKey,
) =>
	Buffer.from(
		tweetnacl.box(
			messageInBytes,
			nonceInBytes,
			convertedPublicKey,
			convertedPrivateKey,
		),
	);

export const openBox: NaclInterface['openBox'] = (
	cipherBytes,
	nonceBytes,
	convertedPublicKey,
	convertedPrivateKey,
) => {
	const originalMessage = tweetnacl.box.open(
		cipherBytes,
		nonceBytes,
		convertedPublicKey,
		convertedPrivateKey,
	);
	// Returns null if decryption fails
	if (originalMessage === null) {
		throw new Error('Failed to decrypt message');
	}

	return Buffer.from(originalMessage);
};

export const signDetached: NaclInterface['signDetached'] = (
	messageBytes,
	privateKeyBytes,
) => Buffer.from(tweetnacl.sign.detached(messageBytes, privateKeyBytes));

export const verifyDetached: NaclInterface['verifyDetached'] =
	// tslint:disable-next-line no-unbound-method
	tweetnacl.sign.detached.verify;

export const getRandomBytes: NaclInterface['getRandomBytes'] = length =>
	Buffer.from(tweetnacl.randomBytes(length));

export const getKeyPair: NaclInterface['getKeyPair'] = hashedSeed => {
	const { publicKey, secretKey } = tweetnacl.sign.keyPair.fromSeed(hashedSeed);

	return {
		privateKeyBytes: Buffer.from(secretKey),
		publicKeyBytes: Buffer.from(publicKey),
	};
};

const PRIVATE_KEY_LENGTH = 32;

export const getPublicKey: NaclInterface['getPublicKey'] = privateKey => {
	const { publicKey } = tweetnacl.sign.keyPair.fromSeed(
		privateKey.slice(0, PRIVATE_KEY_LENGTH),
	);

	return Buffer.from(publicKey);
};
