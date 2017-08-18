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
import crypto from '../crypto';

const secondSignTransaction = (transactionObject, secondSecret) => {
	const secondKeys = crypto.getKeys(secondSecret);
	return Object.assign({}, transactionObject, {
		signSignature: crypto.secondSign(transactionObject, secondKeys),
	});
};

const prepareTransaction = (transaction, keys, secondSecret) => {
	const singleSignedTransaction = Object.assign({}, transaction, {
		signature: crypto.sign(transaction, keys),
	});

	const signedTransaction = (typeof secondSecret === 'string' && transaction.type !== 1)
		? secondSignTransaction(singleSignedTransaction, secondSecret)
		: singleSignedTransaction;

	const transactionWithId = Object.assign({}, signedTransaction, {
		id: crypto.getId(signedTransaction),
	});

	return transactionWithId;
};

module.exports = {
	prepareTransaction,
};
