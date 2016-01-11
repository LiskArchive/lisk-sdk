var crypto = require('./crypto.js'),
	slots = require('../time/slots.js');

function newSignature(secondSecret) {
	var keys = crypto.getKeys(secondSecret);

	var signature = {
		publicKey: keys.publicKey
	};

	return signature;
}

function createSignature(secret, secondSecret) {
	var keys = crypto.getKeys(secret);

	var signature = newSignature(secondSecret);
	var transaction = {
		type: 1,
		amount: 0,
		fee: 5 * Math.pow(10, 8),
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
		fee: 500000000,
		asset: {
			signature: signature
		}
	};


	crypto.sign(transaction, keys);
	transaction.id = crypto.getId(transaction);

	return transaction;
}

module.exports = {
	createSignature: createSignature
}