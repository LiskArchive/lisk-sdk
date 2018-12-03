/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { flags as flagParser } from '@oclif/command';
import * as transactions from '@liskhq/lisk-transactions';
import BaseCommand from '../../../base';
import { flags as commonFlags } from '../../../utils/flags';
import { getInputsFromSources } from '../../../utils/input';
import { getData } from '../../../utils/input/utils';
import { ValidationError } from '../../../utils/error';

const processInputs = (votes, unvotes) => ({ passphrase, secondPassphrase }) =>
	transactions.castVotes({
		passphrase,
		votes,
		unvotes,
		secondPassphrase,
	});

const processVotesInput = async votes =>
	votes.includes(':') ? getData(votes) : votes;

const processVotes = votes =>
	votes
		.replace(/\n/g, ',')
		.split(',')
		.filter(Boolean)
		.map(vote => vote.trim());

const validatePublicKeys = inputs => {
	transactions.utils.validatePublicKeys(inputs);
	return inputs;
};

export default class VoteCommand extends BaseCommand {
	async run() {
		const {
			flags: {
				passphrase: passphraseSource,
				'second-passphrase': secondPassphraseSource,
				'no-signature': noSignature,
				votes,
				unvotes,
			},
		} = this.parse(VoteCommand);

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

		if (noSignature) {
			const result = processFunction({
				passphrase: null,
				secondPassphrase: null,
			});
			return this.print(result);
		}

		const inputs = await getInputsFromSources({
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
		});

		const result = processFunction(inputs);
		return this.print(result);
	}
}

VoteCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonFlags.passphrase),
	'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
	'no-signature': flagParser.boolean(commonFlags.noSignature),
	votes: flagParser.string(commonFlags.votes),
	unvotes: flagParser.string(commonFlags.unvotes),
};

VoteCommand.description = `
Creates a transaction which will cast votes (or unvotes) for delegate candidates using their public keys if broadcast to the network.
`;

VoteCommand.examples = [
	'transaction:create:vote --votes 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa --unvotes e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba',
];
