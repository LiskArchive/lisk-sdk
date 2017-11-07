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
 * Transfer module provides functions for creating "in" transfer transactions (balance transfers to
 * an individual dapp account).
 * @class transfer
 */
import cryptoModule from '../crypto';
import { OUT_TRANSFER_FEE } from '../constants';
import { prepareTransaction, getTimeWithOffset } from './utils';

/**
 * @method transferOutOfDapp
 * @param {Object} Object - Object
 * @param {String} Object.dappId
 * @param {String} Object.transactionId
 * @param {String} Object.recipientId
 * @param {String} Object.amount
 * @param {String} Object.secret
 * @param {String} Object.secondSecret
 * @param {Number} Object.timeOffset
 *
 * @return {Object}
 */

export default function transferOutOfDapp({
	dappId,
	transactionId,
	recipientId,
	amount,
	secret,
	secondSecret,
	timeOffset,
}) {
	const keys = cryptoModule.getKeys(secret);

	const transaction = {
		type: 7,
		amount: amount.toString(),
		fee: OUT_TRANSFER_FEE.toString(),
		recipientId,
		senderPublicKey: keys.publicKey,
		timestamp: getTimeWithOffset(timeOffset),
		asset: {
			outTransfer: {
				dappId,
				transactionId,
			},
		},
	};

	return prepareTransaction(transaction, secret, secondSecret);
}
