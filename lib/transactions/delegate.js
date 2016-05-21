var crypto = require("./crypto.js"),
    constants = require("../constants.js"),
    slots = require("../time/slots.js");

function createDelegate(secret, username, secondSecret) {
	var keys = crypto.getKeys(secret);

	var transaction = {
		type: 2,
		amount: 0,
		fee: constants.fees.delegate,
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
		asset: {
			delegate: {
				username: username,
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
	createDelegate : createDelegate
}
