/*
 * LiskHQ/lisk-commander
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
import { ValidationError } from '../utils/error';
import getInputsFromSources from '../utils/input';
import { getData } from '../utils/input/utils';
import { createCommand, validatePublicKeys } from '../utils/helpers';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `Creates a transaction which will cast votes (or unvotes) for delegate candidates using their public keys if broadcast to the network.

	Examples:
	- create transaction cast votes --votes 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa --unvotes e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba
	- create transaction 3 --votes 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa --unvotes e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba
`;

const processInputs = (votes, unvotes) => ({ passphrase, secondPassphrase }) =>
	transactions.castVotes({ passphrase, votes, unvotes, secondPassphrase });

const processVotesInput = async votes =>
	votes.includes(':') ? getData(votes) : votes;

const processVotes = votes =>
	votes
		.replace(/\n/g, ',')
		.split(',')
		.filter(Boolean)
		.map(vote => vote.trim());

export const actionCreator = vorpal => async ({ options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
		votes,
		unvotes,
		signature,
	} = options;

	if (!votes && !unvotes) {
		throw new ValidationError(
			'At least one of votes and/or unvotes options must be provided.',
		);
	}

	if (votes === unvotes) {
		throw new ValidationError(
			'Votes and unvotes sources must not be the same.',
		);
	}

	const processedVotesInput = votes
		? await processVotesInput(votes.toString())
		: null;
	const processedUnvotesInput = unvotes
		? await processVotesInput(unvotes.toString())
		: null;

	const validatedVotes = processedVotesInput
		? validatePublicKeys(processVotes(processedVotesInput))
		: [];
	const validatedUnvotes = processedUnvotesInput
		? validatePublicKeys(processVotes(processedUnvotesInput))
		: [];

	const processFunction = processInputs(validatedVotes, validatedUnvotes);

	return signature === false
		? processFunction({ passphrase: null, secondPassphrase: null })
		: getInputsFromSources(vorpal, {
				passphrase: {
					source: passphraseSource,
					repeatPrompt: true,
				},
				secondPassphrase: !secondPassphraseSource
					? null
					: {
							source: secondPassphraseSource,
							repeatPrompt: true,
						},
			}).then(processFunction);
};

const createTransactionCastVotes = createCommand({
	command: 'create transaction cast votes',
	alias: ['create transaction 3', 'create transaction cast vote'],
	description,
	actionCreator,
	options: [
		commonOptions.noSignature,
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
		commonOptions.votes,
		commonOptions.unvotes,
	],
	errorPrefix: 'Could not create "cast votes" transaction',
});

export default createTransactionCastVotes;
