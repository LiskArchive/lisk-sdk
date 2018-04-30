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
import { signTransaction } from './sign_and_verify';
import getTransactionId from './get_transaction_id';

const secondSignTransaction = (transactionObject, secondPassphrase) =>
	Object.assign({}, transactionObject, {
		signSignature: signTransaction(transactionObject, secondPassphrase),
	});

const prepareTransaction = (transaction, passphrase, secondPassphrase) => {
	const singleSignedTransaction = Object.assign({}, transaction, {
		signature: signTransaction(transaction, passphrase),
	});

	const signedTransaction =
		typeof secondPassphrase === 'string' && transaction.type !== 1
			? secondSignTransaction(singleSignedTransaction, secondPassphrase)
			: singleSignedTransaction;

	const transactionWithId = Object.assign({}, signedTransaction, {
		id: getTransactionId(signedTransaction),
	});

	return transactionWithId;
};

export default prepareTransaction;
