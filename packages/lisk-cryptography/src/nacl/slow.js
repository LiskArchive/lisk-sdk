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

export const { box } = tweetnacl;

export const boxOpen = tweetnacl.box.open;

export const detachedSign = tweetnacl.sign.detached;

export const detachedVerify = tweetnacl.sign.detached.verify;

export const getRandomBytes = tweetnacl.randomBytes;

export const signKeyPair = hashedSeed => {
	const { publicKey, secretKey } = tweetnacl.sign.keyPair.fromSeed(hashedSeed);
	return {
		privateKeyBytes: secretKey,
		publicKeyBytes: publicKey,
	};
};
