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
 */

import {
	getRandomBytes,
	getAddressAndPublicKeyFromPassphrase,
	hash,
} from '@liskhq/lisk-cryptography';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { genesisAccount } from './account';
import { defaultNetworkIdentifier } from './block';

export const getTransferTransaction = (input?: {
	nonce?: bigint;
	amount?: bigint;
	recipientAddress?: Buffer;
}): TransferTransaction => {
	const passphrase = Mnemonic.generateMnemonic();
	const { address } = getAddressAndPublicKeyFromPassphrase(passphrase);

	const tx = new TransferTransaction({
		id: getRandomBytes(32),
		type: 8,
		fee: BigInt('10000000'),
		nonce: input?.nonce ?? BigInt(0),
		senderPublicKey: genesisAccount.publicKey,
		asset: {
			recipientAddress: input?.recipientAddress ?? address,
			amount: input?.amount ?? BigInt('1'),
			data: '',
		},
		signatures: [],
	});
	tx.sign(defaultNetworkIdentifier, genesisAccount.passphrase);
	(tx as any).id = hash(tx.getBytes());
	(tx as any)._id = tx.id.toString('hex');
	return tx;
};
