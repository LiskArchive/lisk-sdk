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
import {
	getAddressFromPassphrase,
	generatePrivateKey,
	getPublicKeyFromPrivateKey,
	blsPopProve,
	getKeys,
} from '@liskhq/lisk-cryptography';
import { Mnemonic } from '@liskhq/lisk-passphrase';

export const createAccount = () => {
	const passphrase = Mnemonic.generateMnemonic(256);
	const keys = getKeys(passphrase);
	const blsPrivateKey = generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
	const blsPublicKey = getPublicKeyFromPrivateKey(blsPrivateKey);
	const blsPoP = blsPopProve(blsPrivateKey);
	return {
		passphrase,
		address: getAddressFromPassphrase(passphrase),
		publicKey: keys.publicKey,
		privateKey: keys.privateKey,
		blsPrivateKey,
		blsPublicKey,
		blsPoP,
	};
};
