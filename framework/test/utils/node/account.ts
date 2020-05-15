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

import { Mnemonic } from '@liskhq/lisk-passphrase';
import { getKeys, getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createAccount = () => {
	const passphrase = Mnemonic.generateMnemonic();
	const { privateKey, publicKey } = getKeys(passphrase);
	const address = getAddressFromPublicKey(publicKey);

	return {
		passphrase,
		privateKey,
		publicKey,
		address,
	};
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createAccounts = (numberOfAccounts = 1) => {
	const accounts = new Array(numberOfAccounts).fill(0).map(createAccount);
	return accounts;
};
