/*
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
/**
 * Transfer module provides functions for creating "in" transfer transactions (balance transfers to an individual dapp account).
 * @class transfer
 */

const crypto = require('./crypto.js');
const constants = require('../constants.js');
const slots = require('../time/slots.js');

/**
 * @method createInTransfer
 * @param dappId
 * @param amount
 * @param secret
 * @param secondSecret
 * @param timeOffset
 *
 * @return {Object}
 */

function createInTransfer(dappId, amount, secret, secondSecret, timeOffset) {
	const keys = crypto.getKeys(secret);

	const transaction = {
		type: 6,
		amount,
		fee: constants.fees.send,
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTimeWithOffset(timeOffset),
		asset: {
			inTransfer: {
				dappId,
			},
		},
	};

	crypto.sign(transaction, keys);

	if (secondSecret) {
		const secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = crypto.getId(transaction);
	return transaction;
}

/**
 * @method createOutTransfer
 * @param dappId
 * @param transactionId
 * @param recipientId
 * @param amount
 * @param secret
 * @param secondSecret
 * @param timeOffset
 *
 * @return {Object}
 */

function createOutTransfer(dappId, transactionId, recipientId, amount, secret, secondSecret, timeOffset) {
	const keys = crypto.getKeys(secret);

	const transaction = {
		type: 7,
		amount,
		fee: constants.fees.send,
		recipientId,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTimeWithOffset(timeOffset),
		asset: {
			outTransfer: {
				dappId,
				transactionId,
			},
		},
	};

	crypto.sign(transaction, keys);

	if (secondSecret) {
		const secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	return transaction;
}

module.exports = {
	createInTransfer,
	createOutTransfer,
};
