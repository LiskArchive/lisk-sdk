/**
 * Signatures module provides functions for creating signatures for use with the Lisk Blockchain.
 * @class signature
 */

var crypto      = require('./crypto.js');
var constants   = require('../constants.js');
var slots       = require('../time/slots.js');

/**
 * @method newSignature
 * @param secondSecret
 *
 * @return {Object}
 */

function newSignature(secondSecret) {
	var keys = crypto.getKeys(secondSecret);

	var signature = {
		publicKey: keys.publicKey
	};

	return signature;
}

/**
 * @method createSignature
 * @param secret
 * @param secondSecret
 *
 * @return {Object}
 */


function createSignature(secret, secondSecret) {
	var keys = crypto.getKeys(secret);

	var signature = newSignature(secondSecret);
	var transaction = {
		type: 1,
		amount: 0,
		fee: constants.fees.signature,
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
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
