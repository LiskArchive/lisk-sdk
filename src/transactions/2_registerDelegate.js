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
 * Delegate module provides functions to create delegate registration transactions.
 * @class delegate
 */
import cryptoModule from '../crypto';
import { DELEGATE_FEE } from '../constants';
import { prepareTransaction, getTimeWithOffset } from './utils';

/**
 * @method registerDelegate
 * @param {Object} Object - Object
 * @param {String} Object.secret
 * @param {String} Object.username
 * @param {String} Object.secondSecret
 * @param {Number} Object.timeOffset
 *
 * @return {Object}
 */

export default function registerDelegate({
	secret,
	username,
	secondSecret,
	timeOffset,
}) {
	const keys = cryptoModule.getKeys(secret);

	const transaction = {
		type: 2,
		amount: '0',
		fee: DELEGATE_FEE.toString(),
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: getTimeWithOffset(timeOffset),
		asset: {
			delegate: {
				username,
			},
		},
	};

	return prepareTransaction(transaction, secret, secondSecret);
}
