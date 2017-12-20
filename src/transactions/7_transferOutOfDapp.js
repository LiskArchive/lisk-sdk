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
 * @param {String} Object.passphrase
 * @param {String} Object.secondPassphrase
 * @param {Number} Object.timeOffset
 *
 * @return {Object}
 */

const transferOutOfDapp = ({
	dappId,
	transactionId,
	recipientId,
	amount,
	passphrase,
	secondPassphrase,
	timeOffset,
	unsigned,
}) => {
	const senderPublicKey = unsigned
		? null
		: cryptoModule.getKeys(passphrase).publicKey;

	const transaction = {
		type: 7,
		amount: amount.toString(),
		fee: OUT_TRANSFER_FEE.toString(),
		recipientId,
		senderPublicKey,
		timestamp: getTimeWithOffset(timeOffset),
		asset: {
			outTransfer: {
				dappId,
				transactionId,
			},
		},
	};

	return unsigned
		? transaction
		: prepareTransaction(transaction, passphrase, secondPassphrase);
};

export default transferOutOfDapp;
