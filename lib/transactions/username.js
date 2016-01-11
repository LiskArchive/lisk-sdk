var crypto = require('./crypto.js'),
	slots = require('../time/slots.js');

function createUsername(secret, username, secondSecret) {
	var keys = crypto.getKeys(secret);

	var transaction = {
		type: 4,
		amount: 0,
		fee: 1 * Math.pow(10, 8),
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
		asset: {
			username: {
				alias: username,
				publicKey: keys.publicKey
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
	createUsername : createUsername
}