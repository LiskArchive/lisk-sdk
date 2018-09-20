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
// eslint-disable-next-line prefer-const
let lib;

try {
	if (process.env.NACL_FAST === 'disable') {
		throw new Error('Use tweetnacl');
	}
	// Require used for conditional importing
	// eslint-disable-next-line global-require
	lib = require('./fast');
} catch (err) {
	process.env.NACL_FAST = 'disable';
	// eslint-disable-next-line global-require
	lib = require('./slow');
}

export const NACL_SIGN_PUBLICKEY_LENGTH = 32;

export const NACL_SIGN_SIGNATURE_LENGTH = 64;

export const {
	box,
	openBox,
	signDetached,
	verifyDetached,
	getRandomBytes,
	getKeyPair,
} = lib;
