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

// eslint-disable-next-line prefer-destructuring
export const box = tweetnacl.box;

export const openBox = tweetnacl.box.open;

export const signDetached = tweetnacl.sign.detached;

export const verifyDetached = tweetnacl.sign.detached.verify;

export const getRandomBytes = tweetnacl.randomBytes;

export const getKeyPair = hashedSeed => {
	const { publicKey, secretKey } = tweetnacl.sign.keyPair.fromSeed(hashedSeed);
	return {
		privateKeyBytes: secretKey,
		publicKeyBytes: publicKey,
	};
};
