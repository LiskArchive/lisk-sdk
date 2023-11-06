/*
 * Copyright © 2022 Lisk Foundation
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

import { getKeyPair } from './nacl';
import { hash } from './utils';

export const getPrivateAndPublicKeyFromPassphrase = (passphrase: string) => {
	const hashed = hash(passphrase, 'utf8');
	return getKeyPair(hashed);
};

export const getKeys = getPrivateAndPublicKeyFromPassphrase;
