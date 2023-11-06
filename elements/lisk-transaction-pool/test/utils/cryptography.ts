/*
 * Copyright © 2020 Lisk Foundation
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
import { legacy } from '@liskhq/lisk-cryptography';

export const generateRandomPublicKeys = (amount = 1): Array<Buffer> =>
	new Array(amount).fill(0).map(_ => {
		const { publicKey } = legacy.getPrivateAndPublicKeyFromPassphrase(Math.random().toString(16));
		return publicKey;
	});
