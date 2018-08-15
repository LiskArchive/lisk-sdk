/*
 * Copyright © 2018 Lisk Foundation
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
import cryptography from 'lisk-cryptography';
import { VOTE_FEE } from './constants';
import {
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validatePublicKeys,
	wrapTransactionCreator,
} from './utils';

const validateInputs = ({ votes = [], unvotes = [] }) => {
	if (!Array.isArray(votes)) {
		throw new Error(
			'Please provide a valid votes value. Expected an array if present.',
		);
	}
	if (!Array.isArray(unvotes)) {
		throw new Error(
			'Please provide a valid unvotes value. Expected an array if present.',
		);
	}

	validatePublicKeys([...votes, ...unvotes]);
};

const castVotes = inputs => {
	validateInputs(inputs);
	const { passphrase, votes = [], unvotes = [] } = inputs;
	const recipientId = passphrase
		? cryptography.getAddressAndPublicKeyFromPassphrase(passphrase).address
		: null;

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
