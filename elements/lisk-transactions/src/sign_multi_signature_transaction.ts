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
import * as cryptography from '@liskhq/lisk-cryptography';

import { DelegateTransaction } from './10_delegate_transaction';
import { VoteTransaction } from './11_vote_transaction';
import { MultisignatureTransaction } from './12_multisignature_transaction';
import { TransferTransaction } from './8_transfer_transaction';
import { BaseTransaction } from './base_transaction';
import { TransactionJSON } from './transaction_types';

// tslint:disable-next-line no-any
const transactionMap: { readonly [key: number]: any } = {
	8: TransferTransaction,
	10: DelegateTransaction,
	11: VoteTransaction,
	12: MultisignatureTransaction,
};

export const signMultiSignatureTransaction = (options: {
	readonly transaction: TransactionJSON;
	readonly passphrase: string;
	readonly networkIdentifier: string;
	readonly keys: {
		readonly mandatoryKeys: string[];
		readonly optionalKeys: string[];
		readonly numberOfSignatures: number;
	};
}): BaseTransaction => {
	const { transaction, passphrase, networkIdentifier, keys } = options;
	if (transaction.type === undefined || transaction.type === null) {
		throw new Error('Transaction type is required.');
	}

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

	const { publicKey } = cryptography.getPrivateAndPublicKeyFromPassphrase(
		passphrase,
	);

	const networkIdentifierBytes = Buffer.from(networkIdentifier, 'hex');
	const transactionWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifierBytes,
		tx.getBytes(),
	]);

	// Locate where this public key should go in the signatures array
	const isMandatoryKeyIndex = keys.mandatoryKeys.findIndex(
		aPublicKey => aPublicKey === publicKey,
	);
	const isOptionalKeyIndex = keys.optionalKeys.findIndex(
		aPublicKey => aPublicKey === publicKey,
	);

	const signature = cryptography.signData(
		cryptography.hash(transactionWithNetworkIdentifierBytes),
		passphrase,
	);

	// If it's a mandatory Public Key find where to add the signature
	if (isMandatoryKeyIndex !== -1) {
		// tslint:disable-next-line: no-let
		let signatureOffset = 0;

		if (tx.type === MultisignatureTransaction.TYPE) {
			// Account for sender signature
			signatureOffset = 1;
		}
		tx.signatures[isMandatoryKeyIndex + signatureOffset] = signature;
	}

	if (isOptionalKeyIndex !== -1) {
		// tslint:disable-next-line: no-let
		let signatureOffset = 0;

		if (tx.type === MultisignatureTransaction.TYPE) {
			// Account for sender signature
			signatureOffset = 1;
		}
		tx.signatures[
			keys.mandatoryKeys.length + isOptionalKeyIndex + signatureOffset
		] = signature;
	}

	return tx;
};
