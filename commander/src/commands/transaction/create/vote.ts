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
	castVotes,
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
	castVotes({
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
	for (const rawVoteAsset of inputs) {
		validateAddress(rawVoteAsset.delegateAddress);
	}

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
	Creates a transaction which will cast votes for delegate candidates using their addresses if broadcast to the network.
	`;

	static examples = [
		'transaction:create:vote 1 100 --votes="356975984361330918L,1000000000" --votes="7539210577161571444L,3000000000" --votes="456975984361330919L,-1000000000"',
	];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
		'no-signature': flagParser.boolean(commonFlags.noSignature),
		votes: flagParser.string({
			...commonFlags.votes,
			multiple: true,
			required: true,
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

		const targetAddresses: string[] = [];
		const votesObjects = votes.map(vote => {
			const voteArr = vote.split(',');

			const [delegateAddress, amount] = voteArr;

			if (!targetAddresses.includes(delegateAddress)) {
				targetAddresses.push(delegateAddress);
			} else {
				throw new Error('Delegate address must be unique.');
			}

			const numberAmount = Number(amount);

			if (Number.isNaN(numberAmount)) {
				throw new ValidationError(
					'Enter a valid amount in number string format.',
				);
			}

			const sign = numberAmount < 0 ? -1 : 1;

			const normalizedAmount = transactionUtils.convertLSKToBeddows(
				String(Math.abs(numberAmount)),
			);

			if (!isValidFee(normalizedAmount)) {
				throw new ValidationError(
					'Enter a valid vote amount in number string format.',
				);
			}

			return {
				delegateAddress,
				amount: String(Number(normalizedAmount) * sign),
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
