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
import crypto from '../crypto';
import constants from '../constants';
import slots from '../time/slots';
import { prepareTransaction } from './utils';

/**
 * @method createVote
 * @param secret
 * @param delegates
 * @param secondSecret
 * @param timeOffset
 *
 * @return {Object}
 */

function createVote(secret, delegates, secondSecret, timeOffset) {
	const keys = crypto.getKeys(secret);

	const transaction = {
		type: 3,
		amount: 0,
		fee: constants.fees.vote,
		recipientId: crypto.getAddress(keys.publicKey),
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTimeWithOffset(timeOffset),
		asset: {
			votes: delegates,
		},
	};

	return prepareTransaction(transaction, secret, secondSecret);
}

module.exports = {
	createVote,
};
