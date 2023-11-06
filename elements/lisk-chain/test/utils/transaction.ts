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
 */

import { utils, ed, legacy } from '@liskhq/lisk-cryptography';
import { defaultChainID } from './block';
import { Transaction } from '../../src/transaction';
import { TAG_TRANSACTION } from '../../src';

export const genesisAddress = {
	address: Buffer.from('d04699e57c4a3846c988f3c15306796f8eae5c1c', 'hex'),
	publicKey: Buffer.from('0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a', 'hex'),
	passphrase: 'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready',
	balance: '10000000000000000',
	encryptedPassphrase:
		'iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1',
	password: 'elephant tree paris dragon chair galaxy',
};

export const getTransaction = (input?: { nonce?: bigint }): Transaction => {
	const tx = new Transaction({
		module: 'token',
		command: 'transfer',
		fee: BigInt('10000000'),
		nonce: input?.nonce ?? BigInt(0),
		senderPublicKey: genesisAddress.publicKey,
		params: utils.getRandomBytes(128),
		signatures: [],
	});
	const signature = ed.signData(
		TAG_TRANSACTION,
		defaultChainID,
		tx.getSigningBytes(),
		legacy.getPrivateAndPublicKeyFromPassphrase(genesisAddress.passphrase).privateKey,
	);
	tx.signatures.push(signature);

	return tx;
};
