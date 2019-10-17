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
import { TransferTransaction } from './0_transfer_transaction';
import { SecondSignatureTransaction } from './1_second_signature_transaction';
import { DelegateTransaction } from './2_delegate_transaction';
import { VoteTransaction } from './3_vote_transaction';
import { MultisignatureTransaction } from './4_multisignature_transaction';
import { BaseTransaction } from './base_transaction';
import { TransactionJSON } from './transaction_types';

export interface SignatureObject {
	readonly publicKey: string;
	readonly signature: string;
	readonly transactionId: string;
}

// tslint:disable-next-line no-any
const transactionMap: { readonly [key: number]: any } = {
	0: TransferTransaction,
	1: SecondSignatureTransaction,
	2: DelegateTransaction,
	3: VoteTransaction,
	4: MultisignatureTransaction,
};

export const createSignatureObject = (options: {
	readonly transaction: TransactionJSON;
	readonly passphrase: string;
	readonly networkIdentifier: string;
}): SignatureObject => {
	const { transaction, passphrase, networkIdentifier } = options;
	if (transaction.type === undefined || transaction.type === null) {
		throw new Error('Transaction type is required.');
	}

	// tslint:disable-next-line no-magic-numbers
	if (transaction.type < 0 || transaction.type > 4) {
		throw new Error('Invalid transaction type.');
	}

	if (!transaction.id) {
		throw new Error('Transaction ID is required to create a signature object.');
	}

	// tslint:disable-next-line variable-name
	const TransactionClass = transactionMap[transaction.type];
	const tx = new TransactionClass(transaction) as BaseTransaction;

	const validStatus = tx.validate(networkIdentifier);
	if (validStatus.errors.length > 0) {
		throw new Error('Invalid transaction.');
	}

	const { publicKey } = cryptography.getPrivateAndPublicKeyFromPassphrase(
		passphrase,
	);

	// tslint:disable-next-line no-any
	(tx as any)._signature = undefined;
	// tslint:disable-next-line no-any
	(tx as any)._signSignature = undefined;

	const multiSignature = cryptography.signData(
		cryptography.hash(tx.getBytes()),
		passphrase,
	);

	return {
		transactionId: tx.id,
		publicKey,
		signature: multiSignature,
	};
};
