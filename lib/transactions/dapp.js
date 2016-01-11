var crypto = require('./crypto.js'),
	slots = require('../time/slots.js');

function createDapp(secret, secondSecret, options) {
	var keys = crypto.getKeys(secret);
	var transaction = {
		type: 9,
		amount: 0,
		fee: 100 * Math.pow(10, 8),
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
				siaAscii: options.siaAscii,
				git: options.git,
				icon: options.icon,
				siaIcon: options.siaIcon
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