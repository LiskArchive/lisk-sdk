/*
 * LiskHQ/lisky
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
import getInputsFromSources from '../utils/input';
import { getData } from '../utils/input/utils';
import {
	createCommand,
	validatePublicKeys,
	prependPlusToPublicKeys,
	prependMinusToPublicKeys,
} from '../utils/helpers';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `Creates a transaction which will cast votes for delegate candidates using their public keys if broadcast to the network.

	Examples:
	- create transaction cast vote
	- create transaction cast votes
	- create transaction 3
`;

const processInputs = votes => ({ passphrase, secondPassphrase }) =>
	transactions.createVote(passphrase, votes, secondPassphrase);

const processVotesInput = async votes => (votes.includes(':')
	? getData(votes)
	: votes);

const processVotes = votes => votes.replace(/\n/g, ',').split(',').filter(Boolean);

export const actionCreator = vorpal => async ({ options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
		vote,
		unvote,
	} = options;

	if (!vote && !unvote) {
		throw new Error('create transaction `cast vote` needs vote and/or unvote options');
	}

	if (vote === unvote) {
		throw new Error('vote and unvote sources must not be the same.');
	}

	const votes = vote ? await processVotesInput(vote) : null;
	const unvotes = unvote ? await processVotesInput(unvote) : null;

	const validatedVotes = votes ? validatePublicKeys(processVotes(votes)) : null;
	const validatedUnvotes = unvotes ? validatePublicKeys(processVotes(unvotes)) : null;

	const upvotes = votes ? prependPlusToPublicKeys(validatedVotes) : [];
	const downvotes = unvotes ? prependMinusToPublicKeys(validatedUnvotes) : [];

	const allVotes = [].concat(upvotes, downvotes).filter(Boolean);

	return getInputsFromSources(vorpal, {
		passphrase: {
			source: passphraseSource,
			repeatPrompt: true,
		},
		secondPassphrase: !secondPassphraseSource ? null : {
			source: secondPassphraseSource,
			repeatPrompt: true,
		},
	})
		.then(processInputs(allVotes));
};

const createTransactionCastVote = createCommand({
	command: 'create transaction cast vote',
	alias: ['create transaction 3', 'create transaction cast votes'],
	description,
	actionCreator,
	options: [
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
		commonOptions.vote,
		commonOptions.unvote,
	],
	errorPrefix: 'Could not create "cast vote" transaction',
});

export default createTransactionCastVote;
