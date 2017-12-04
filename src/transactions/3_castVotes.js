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
import { prepareTransaction, getTimeWithOffset } from './utils';

/**
 * @method castVotes
 * @param {Object} Object - Object
 * @param {String} Object.passphrase
 * @param {Array<String>} Object.delegates
 * @param {String} Object.secondPassphrase
 * @param {Number} Object.timeOffset
 *
 * @return {Object}
 */

const castVotes = ({ passphrase, delegates, secondPassphrase, timeOffset }) => {
	const keys = cryptoModule.getKeys(passphrase);

	const transaction = {
		type: 3,
		amount: '0',
		fee: VOTE_FEE.toString(),
		recipientId: cryptoModule.getAddress(keys.publicKey),
		senderPublicKey: keys.publicKey,
		timestamp: getTimeWithOffset(timeOffset),
		asset: {
			votes: delegates,
		},
	};

	return prepareTransaction(transaction, passphrase, secondPassphrase);
};

export default castVotes;
