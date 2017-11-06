/*
 * Copyright © 2017 Lisk Foundation
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
import cryptoModule from '../../crypto';
import getTransactionId from './getTransactionId';

const secondSignTransaction = (transactionObject, secondSecret) =>
	Object.assign({}, transactionObject, {
		signSignature: cryptoModule.signTransaction(
			transactionObject,
			secondSecret,
		),
	});

const prepareTransaction = (transaction, secret, secondSecret) => {
	const singleSignedTransaction = Object.assign({}, transaction, {
		signature: cryptoModule.signTransaction(transaction, secret),
	});

	const signedTransaction =
		typeof secondSecret === 'string' && transaction.type !== 1
			? secondSignTransaction(singleSignedTransaction, secondSecret)
			: singleSignedTransaction;

	const transactionWithId = Object.assign({}, signedTransaction, {
		id: getTransactionId(signedTransaction),
	});

	return transactionWithId;
};

export default prepareTransaction;
