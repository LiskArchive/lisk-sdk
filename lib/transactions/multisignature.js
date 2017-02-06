/**
 * Multisignatures module provides functions for creating multisignature transactions for use with the Lisk Blockchain
 * @class multisignature
 */

var crypto      = require('./crypto.js');
var constants   = require('../constants.js');
var slots       = require('../time/slots.js');


/**
 * @method createDapp
 * @param transaction
 * @param secret
 *
 * @return {string}
 */

function signTransaction(trs, secret) {
	var keys = crypto.getKeys(secret);
	var signature = crypto.multiSign(trs, keys);

	return signature;
}

/**
 * @method createMultisignature
 * @param secret
 * @param secondSecret
 * @param keysgroup
 * @param lifetime
 * @param min
 *
 * @return {Object}
 */

function createMultisignature(secret, secondSecret, keysgroup, lifetime, min) {
	var keys = crypto.getKeys(secret);

	var transaction = {
		type: 4,
		amount: 0,
		fee: constants.fees.multisignature,
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
		asset: {
			multisignature: {
				min: min,
				lifetime: lifetime,
				keysgroup: keysgroup
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

/**
 * @method createTransaction
 * @param recipientId
 * @param amount
 * @param secret
 * @param secondSecret
 * @param requesterPublicKey
 *
 * @return {Object}
 */

function createTransaction(recipientId, amount, secret, secondSecret, requesterPublicKey) {
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

	if (requesterPublicKey) {
		transaction.requesterPublicKey = requesterPublicKey;
	} else {
		transaction.requesterPublicKey = transaction.senderPublicKey;
	}

	crypto.sign(transaction, keys);

	if (secondSecret) {
		var secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = crypto.getId(transaction);
	transaction.signatures = [];
	return transaction;
}

module.exports = {
	signTransaction: signTransaction,
	createMultisignature: createMultisignature,
	createTransaction: createTransaction
}
