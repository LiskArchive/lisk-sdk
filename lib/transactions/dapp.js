var crypto = require("./crypto.js"),
    constants = require("../constants.js"),
    slots = require("../time/slots.js");

function createDapp(secret, secondSecret, options) {
	var keys = crypto.getKeys(secret);

	var transaction = {
		type: 5,
		amount: 0,
		fee: constants.fees.dapp,
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
		asset: {
			dapp: {
				category: options.category,
				name: options.name,
				description: options.description,
				tags: options.tags,
				type: options.type,
				link: options.link,
				icon: options.icon
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
	createDapp: createDapp
}
