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
import cryptography from '@liskhq/lisk-cryptography';
import { BaseTransaction, PartialTransaction } from '../transaction_types';
import { getTransactionId } from './get_transaction_id';
import { signTransaction } from './sign_and_verify';
import { getTimeWithOffset } from './time';
import { validateTransaction } from './validation/validate_transaction';

const secondSignTransaction = (
	transactionObject: BaseTransaction,
	secondPassphrase?: string,
) => ({
	...transactionObject,
	signSignature: signTransaction(transactionObject, secondPassphrase),
});

const validTransaction = (partial: PartialTransaction): partial is BaseTransaction => {
	const { valid } = validateTransaction(partial);

	return !!valid;
};

export const prepareTransaction = (
	partialTransaction: PartialTransaction,
	passphrase?: string,
	secondPassphrase?: string,
	timeOffset?: number,
): BaseTransaction => {
	const senderPublicKey = passphrase
		? cryptography.getKeys(passphrase).publicKey
		: undefined;
	const timestamp = getTimeWithOffset(timeOffset);

	const transaction = {
		amount: '0',
		recipientId: '',
		senderPublicKey,
		timestamp,
		...partialTransaction,
	};

	if (!validTransaction(transaction)) {
		throw new Error('invalid transaction to process');
	}

	const singleSignedTransaction = {
		...transaction,
		signature: signTransaction(transaction, passphrase),
	};

	const signedTransaction =
		typeof secondPassphrase === 'string' && transaction.type !== 1
			? secondSignTransaction(singleSignedTransaction, secondPassphrase)
			: singleSignedTransaction;

	const transactionWithId = {
		...signedTransaction,
		id: getTransactionId(signedTransaction),
	};

	return transactionWithId;
};
