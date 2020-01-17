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

import { DelegateTransaction } from './10_delegate_transaction';
import { VoteTransaction } from './11_vote_transaction';
import { MultisignatureTransaction } from './12_multisignature_transaction';
import { TransferTransaction } from './8_transfer_transaction';
import { SecondSignatureTransaction } from './9_second_signature_transaction';
import { BaseTransaction } from './base_transaction';
import { TransactionJSON } from './transaction_types';

export interface SignatureObject {
	readonly publicKey: string;
	readonly signature: string;
	readonly transactionId: string;
}

// tslint:disable-next-line no-any
const transactionMap: { readonly [key: number]: any } = {
	8: TransferTransaction,
	9: SecondSignatureTransaction,
	10: DelegateTransaction,
	11: VoteTransaction,
	12: MultisignatureTransaction,
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
	if (!Object.keys(transactionMap).includes(String(transaction.type))) {
		throw new Error('Invalid transaction type.');
	}

	if (!transaction.id) {
		throw new Error('Transaction ID is required to create a signature object.');
	}

	// tslint:disable-next-line variable-name
	const TransactionClass = transactionMap[transaction.type];
	const tx = new TransactionClass({
		...transaction,
		networkIdentifier,
	}) as BaseTransaction;

	const validStatus = tx.validate();
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

	const networkIdentifierBytes = Buffer.from(networkIdentifier, 'hex');
	const transactionWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifierBytes,
		tx.getBytes(),
	]);

	const multiSignature = cryptography.signData(
		cryptography.hash(transactionWithNetworkIdentifierBytes),
		passphrase,
	);

	return {
		transactionId: tx.id,
		publicKey,
		signature: multiSignature,
	};
};
