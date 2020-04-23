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
// eslint-disable-next-line import/no-cycle
import { NaclInterface } from './nacl_types';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
let lib: NaclInterface = require('./slow');

// Use try/catch for browser fallback support
try {
	if (process.env.NACL_FAST !== 'disable') {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports,global-require
		lib = require('./fast');
	}
	// eslint-disable-next-line no-empty
} catch (err) {}

export const NACL_SIGN_PUBLICKEY_LENGTH = 32;

export const NACL_SIGN_SIGNATURE_LENGTH = 64;

export const {
	box,
	openBox,
	signDetached,
	verifyDetached,
	getRandomBytes,
	getKeyPair,
	getPublicKey,
} = lib;
