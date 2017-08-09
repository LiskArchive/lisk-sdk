import crypto from './crypto';

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

	const signedTransaction = secondSecret && transaction.type !== 1
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
