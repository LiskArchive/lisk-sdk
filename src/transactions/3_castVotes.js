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
import {
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validatePublicKeys,
	wrapTransactionCreator,
} from './utils';

/**
 * @method castVotes
 * @param {Object} Object - Object
 * @param {String} Object.passphrase
 * @param {Array<String>} Object.votes
 * @param {Array<String>} Object.unvotes
 * @param {Boolean} Object.unsigned
 *
 * @return {Object}
 */
const castVotes = ({ passphrase, votes = [], unvotes = [], unsigned }) => {
	validatePublicKeys([...votes, ...unvotes]);

	const recipientId = unsigned
		? null
		: cryptoModule.getAddressAndPublicKeyFromPassphrase(passphrase).address;

	const plusPrependedVotes = prependPlusToPublicKeys(votes);
	const minusPrependedUnvotes = prependMinusToPublicKeys(unvotes);
	const allVotes = [...plusPrependedVotes, ...minusPrependedUnvotes];

	return {
		type: 3,
		fee: VOTE_FEE.toString(),
		recipientId,
		asset: {
			votes: allVotes,
		},
	};
};

export default wrapTransactionCreator(castVotes);
