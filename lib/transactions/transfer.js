var crypto = require("./crypto.js"),
    constants = require("../constants.js"),
    slots = require("../time/slots.js");

function createTransfer(secret, secondSecret, dappId) {
	var keys = crypto.getKeys(secret);

	var transaction = {
		type: 6,
		amount: 0,
		fee: constants.fees.send,
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
