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
import * as cryptography from '@liskhq/lisk-cryptography';
import { TransactionJSON } from './transaction_types';
import { multiSignTransaction, verifyTransaction } from './utils';

export interface SignatureObject {
	readonly publicKey: string;
	readonly signature: string;
	readonly transactionId: string;
}

export const createSignatureObject = (
	transaction: TransactionJSON,
	passphrase: string,
): SignatureObject => {
	if (!verifyTransaction(transaction)) {
		throw new Error('Invalid transaction.');
	}

	if (!transaction.id) {
		throw new Error('Transaction ID is required to create a signature object.');
	}

	const { publicKey } = cryptography.getPrivateAndPublicKeyFromPassphrase(
		passphrase,
	);

	return {
		transactionId: transaction.id,
		publicKey,
		signature: multiSignTransaction(transaction, passphrase),
	};
};
