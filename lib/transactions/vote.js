/**
 * Vote module provides functions for creating vote transactions for use with the Lisk Blockchain.
 * @class vote
 */

var crypto      = require('./crypto.js');
var constants   = require('../constants.js');
var slots       = require('../time/slots.js');

/**
 * @method createVote
 * @param secret
 * @param delegates
 * @param secondSecret
 *
 * @return {Object}
 */

function createVote(secret, delegates, secondSecret) {
	var keys = crypto.getKeys(secret);

	var transaction = {
		type: 3,
		amount: 0,
		fee: constants.fees.vote,
		recipientId: crypto.getAddress(keys.publicKey),
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
		asset: {
			votes: delegates
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
	createVote: createVote
}
