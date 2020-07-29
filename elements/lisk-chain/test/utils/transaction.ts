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

import { getRandomBytes, signData } from '@liskhq/lisk-cryptography';
import { genesisAccount } from './account';
import { defaultNetworkIdentifier } from './block';
import { Transaction } from '../../src/transaction';

export const getTransaction = (input?: { nonce?: bigint }): Transaction => {
	const tx = new Transaction({
		moduleType: 2,
		assetType: 0,
		fee: BigInt('10000000'),
		nonce: input?.nonce ?? BigInt(0),
		senderPublicKey: genesisAccount.publicKey,
		asset: getRandomBytes(128),
		signatures: [],
	});
	const signature = signData(
		Buffer.concat([defaultNetworkIdentifier, tx.getSigningBytes()]),
		genesisAccount.passphrase,
	);
	tx.signatures.push(signature);

	return tx;
};
