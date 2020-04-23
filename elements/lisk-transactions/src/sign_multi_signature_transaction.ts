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
import { MultisignatureTransaction } from './12_multisignature_transaction';
import { VoteTransaction } from './13_vote_transaction';
import { UnlockTransaction } from './14_unlock_transaction';
import { TransferTransaction } from './8_transfer_transaction';
import { BaseTransaction } from './base_transaction';
import { TransactionJSON } from './transaction_types';
import { sortKeysAscending } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transactionMap: { readonly [key: number]: any } = {
	8: TransferTransaction,
	10: DelegateTransaction,
	12: MultisignatureTransaction,
	13: VoteTransaction,
	14: UnlockTransaction,
};

const sanitizeSignaturesArray = (
	tx: BaseTransaction,
	keys: MultisigKeys,
): void => {
	let numberOfSignatures = keys.mandatoryKeys.length + keys.optionalKeys.length;
	// Add one extra for multisig account registration
	if (tx.type === MultisignatureTransaction.TYPE) {
		numberOfSignatures += 1;
	}

	for (let i = 0; i < numberOfSignatures; i += 1) {
		if (tx.signatures[i] === undefined) {
			// eslint-disable-next-line no-param-reassign
			tx.signatures[i] = '';
		}
	}
};

interface MultisigKeys {
	readonly mandatoryKeys: string[];
	readonly optionalKeys: string[];
}

export const signMultiSignatureTransaction = (options: {
	readonly transaction: TransactionJSON;
	readonly passphrase: string;
	readonly networkIdentifier: string;
	readonly keys: MultisigKeys;
}): BaseTransaction => {
	const { transaction, passphrase, networkIdentifier, keys } = options;
	if (transaction.type === undefined || transaction.type === null) {
		throw new Error('Transaction type is required.');
	}

	if (!Object.keys(transactionMap).includes(String(transaction.type))) {
		throw new Error('Invalid transaction type.');
	}

	// Sort keys
	sortKeysAscending(keys.mandatoryKeys);
	sortKeysAscending(keys.optionalKeys);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const TransactionClass = transactionMap[transaction.type];
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
		tx.getBasicBytes(),
	]);

	const signature = cryptography.signData(
		cryptography.hash(transactionWithNetworkIdentifierBytes),
		passphrase,
	);

	if (tx.signatures.includes(signature)) {
		sanitizeSignaturesArray(tx, keys);

		return tx;
	}

	// Locate where this public key should go in the signatures array
	const mandatoryKeyIndex = keys.mandatoryKeys.findIndex(
		aPublicKey => aPublicKey === publicKey,
	);
	const optionalKeyIndex = keys.optionalKeys.findIndex(
		aPublicKey => aPublicKey === publicKey,
	);

	// If it's a mandatory Public Key find where to add the signature
	if (mandatoryKeyIndex !== -1) {
		let signatureOffset = 0;

		if (tx.type === MultisignatureTransaction.TYPE) {
			// Account for sender signature
			signatureOffset = 1;
		}
		tx.signatures[mandatoryKeyIndex + signatureOffset] = signature;
	}

	if (optionalKeyIndex !== -1) {
		let signatureOffset = 0;

		if (tx.type === MultisignatureTransaction.TYPE) {
			// Account for sender signature
			signatureOffset = 1;
		}
		tx.signatures[
			keys.mandatoryKeys.length + optionalKeyIndex + signatureOffset
		] = signature;
	}

	sanitizeSignaturesArray(tx, keys);

	return tx;
};
