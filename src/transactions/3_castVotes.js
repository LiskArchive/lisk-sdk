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
 * Vote module provides functions for creating vote transactions.
 * @class vote
 */
import cryptoModule from '../crypto';
import { VOTE_FEE } from '../constants';
import { prepareTransaction } from './utils';
import { getTimeWithOffset } from './utils/time';

/**
 * @method castVotes
 * @param {Object} Object - Object
 * @param {String} Object.secret
 * @param {Array<String>} Object.delegates
 * @param {String} Object.secondSecret
 * @param {Number} Object.timeOffset
 *
 * @return {Object}
 */

export default function castVotes({
	secret,
	delegates,
	secondSecret,
	timeOffset,
}) {
	const keys = cryptoModule.getKeys(secret);

	const transaction = {
		type: 3,
		amount: 0,
		fee: VOTE_FEE,
		recipientId: cryptoModule.getAddress(keys.publicKey),
		senderPublicKey: keys.publicKey,
		timestamp: getTimeWithOffset(timeOffset),
		asset: {
			votes: delegates,
		},
	};

	return prepareTransaction(transaction, secret, secondSecret);
}
