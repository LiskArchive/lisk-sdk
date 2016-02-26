var crypto = require('./crypto.js'),
	slots = require('../time/slots.js');

function createTransaction(recipientId, amount, secret, secondSecret) {
	var transaction = {
		type: 0,
		amount: amount,
		fee: 0.1 * Math.pow(10, 8),
		recipientId: recipientId,
		timestamp: slots.getTime(),
		asset: {}
	};

	var keys = crypto.getKeys(secret);
	transaction.senderPublicKey = keys.publicKey;

	crypto.sign(transaction, keys);

	if (secondSecret) {
		var secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = crypto.getId(transaction);
	return transaction;
}

module.exports = {
	createTransaction: createTransaction
}
