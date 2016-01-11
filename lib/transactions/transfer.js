var crypto = require('./crypto.js'),
	slots = require('../time/slots.js');

function createTransfer(secret, secondSecret, dappId) {
	var keys = crypto.getKeys(secret);
	var transaction = {
		type: 10,
		amount: 0,
		fee: 100 * Math.pow(10, 8),
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
		asset: {
			dapptransfer: {
				dappid: dappId
			}
		}
	};

	crypto.sign(transaction, keys);

	if (secondSecret) {
		var secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = crypto.getId(transaction);
	return transaction;
}

module.exports = {
	createTransfer: createTransfer
}