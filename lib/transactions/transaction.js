/**
 * Crypto module helping with creating transactions in Lisk Blockchain
 * @class transaction
 */

var crypto      = require('./crypto.js');
var constants   = require('../constants.js');
var slots       = require('../time/slots.js');

/**
 * @method createTransaction
 * @param recipientId
 * @param amount
 * @param secret
 * @param secondSecret
 *
 * @return {Object}
 */

function createTransaction(recipientId, amount, secret, secondSecret) {
	var transaction = {
		type: 0,
		amount: amount,
		fee: constants.fees.send,
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
