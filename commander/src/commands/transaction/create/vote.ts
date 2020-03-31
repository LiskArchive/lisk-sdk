/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import {
	newCastVotes,
	utils as transactionUtils,
} from '@liskhq/lisk-transactions';
import {
	isValidFee,
	isValidNonce,
	validateAddress,
} from '@liskhq/lisk-validator';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { flags as commonFlags } from '../../../utils/flags';
import { getNetworkIdentifierWithInput } from '../../../utils/network_identifier';
import { getPassphraseFromPrompt } from '../../../utils/reader';

interface RawAssetVote {
	readonly delegateAddress: string;
	readonly amount: string;
}

const processInputs = (
	nonce: string,
	fee: string,
	networkIdentifier: string,
	votes: ReadonlyArray<RawAssetVote>,
	passphrase?: string,
) =>
	newCastVotes({
		nonce,
		fee,
		networkIdentifier,
		passphrase,
		votes,
	});

interface Args {
	readonly nonce: string;
	readonly fee: string;
}

const validateAddresses = (inputs: ReadonlyArray<RawAssetVote>) => {
	inputs.map(rawVoteAsset => validateAddress(rawVoteAsset.delegateAddress));

	return inputs;
};

export default class VoteCommand extends BaseCommand {
	static args = [
		{
			name: 'nonce',
			required: true,
			description: 'Nonce of the transaction.',
		},
		{
			name: 'fee',
			required: true,
			description: 'Transaction fee in LSK.',
		},
	];
	static description = `
	Creates a transaction which will cast votes for delegate candidates using their public keys if broadcast to the network.
	`;

	static examples = [
		'transaction:create:vote 1 100 --votes 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa --unvotes e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba',
	];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
		'no-signature': flagParser.boolean(commonFlags.noSignature),
		votes: flagParser.string({
			...commonFlags.votes,
			multiple: true,
		}),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
				'no-signature': noSignature,
				votes,
			},
		} = this.parse(VoteCommand);

		const { nonce, fee } = args as Args;

		if (!isValidNonce(nonce)) {
			throw new ValidationError('Enter a valid nonce in number string format.');
		}

		if (Number.isNaN(Number(fee))) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		const normalizedFee = transactionUtils.convertLSKToBeddows(fee);

		if (!isValidFee(normalizedFee)) {
			throw new ValidationError('Enter a valid fee in number string format.');
		}

		if (!votes) {
			throw new ValidationError('At least one vote option must be provided.');
		}

		const targetAddresses: string[] = [];
		const votesObjects = votes.map(vote => {
			const voteArr = vote.split(',');

			if (!targetAddresses.includes(voteArr[0])) {
				targetAddresses.push(voteArr[0]);
			} else {
				throw new Error('Delegate address must be unique.');
			}

			return {
				delegateAddress: voteArr[0],
				amount: voteArr[1],
			};
		});

		const validatedVotes = votesObjects ? validateAddresses(votesObjects) : [];

		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);

		if (noSignature) {
			const noSignatureResult = processInputs(
				nonce,
				normalizedFee,
				networkIdentifier,
				validatedVotes,
			);
			this.print(noSignatureResult);

			return;
		}

		const passphrase =
			passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));

		const result = processInputs(
			nonce,
			normalizedFee,
			networkIdentifier,
			validatedVotes,
			passphrase,
		);
		this.print(result);
	}
}
