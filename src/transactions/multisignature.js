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
 * Multisignature module provides functions for creating multisignature group registration
 * transactions, and signing transactions requiring multisignatures.
 * @class multisignature
 */
import cryptoModule from '../crypto';
import constants from '../constants';
import slots from '../time/slots';
import { prepareTransaction } from './utils';

/**
 * @method createTransaction
 * @param recipientId string
 * @param amount number
 * @param secret secret
 * @param secondSecret secret
 * @param requesterPublicKey string
 * @param timeOffset number
 *
 * @return {string}
 */

function createTransaction(
	recipientId, amount, secret, secondSecret, requesterPublicKey, timeOffset,
) {
	const keys = cryptoModule.getKeys(secret);

	const transaction = {
		type: 0,
		amount,
		fee: constants.fees.send,
		recipientId,
		senderPublicKey: keys.publicKey,
		requesterPublicKey: requesterPublicKey || keys.publicKey,
		timestamp: slots.getTimeWithOffset(timeOffset),
		asset: {},
		signatures: [],
	};

	return prepareTransaction(transaction, secret, secondSecret);
}

/**
 * @method signTransaction
 * @param trs transaction object
 * @param secret
 *
 * @return {string}
 */

function signTransaction(trs, secret) {
	return cryptoModule.multiSignTransaction(trs, secret);
}

/**
 * @method createMultisignature
 * @param secret string
 * @param secondSecret string
 * @param keysgroup array
 * @param lifetime number
 * @param min number
 * @param timeOffset number
 *
 * @return {Object}
 */

function createMultisignature(secret, secondSecret, keysgroup, lifetime, min, timeOffset) {
	const keys = cryptoModule.getKeys(secret);
	const keygroupFees = keysgroup.length + 1;

	const transaction = {
		type: 4,
		amount: 0,
		fee: (constants.fees.multisignature * keygroupFees),
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTimeWithOffset(timeOffset),
		asset: {
			multisignature: {
				min,
				lifetime,
				keysgroup,
			},
		},
	};

	return prepareTransaction(transaction, secret, secondSecret);
}

module.exports = {
	signTransaction,
	createMultisignature,
	createTransaction,
};
