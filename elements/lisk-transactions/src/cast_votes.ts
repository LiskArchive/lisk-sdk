/*
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

import { hexToBuffer } from '@liskhq/lisk-cryptography';
import {
	isValidFee,
	isValidNonce,
	validateNetworkIdentifier,
} from '@liskhq/lisk-validator';

import { RawAssetVote, VoteTransaction, Vote } from './13_vote_transaction';
import { createBaseTransaction, baseTransactionToJSON } from './utils';
import { TransactionJSON } from './types';

export interface CastVoteInputs {
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
	readonly passphrase?: string;
	readonly votes: ReadonlyArray<RawAssetVote>;
}

const validateInputs = ({
	fee,
	nonce,
	networkIdentifier,
	votes,
}: CastVoteInputs): void => {
	if (!isValidNonce(nonce.toString())) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isValidFee(fee.toString())) {
		throw new Error('Fee must be a valid number in string format.');
	}

	validateNetworkIdentifier(networkIdentifier);

	if (!votes.length) {
		throw new Error('Votes must present to create transaction.');
	}
};

const convertVotes = (
	votes: ReadonlyArray<RawAssetVote>,
): ReadonlyArray<Vote> =>
	votes.map(vote => ({
		delegateAddress: hexToBuffer(vote.delegateAddress),
		amount: BigInt(vote.amount),
	}));

export const castVotes = (inputs: CastVoteInputs): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { passphrase, votes } = inputs;
	const networkIdentifier = hexToBuffer(inputs.networkIdentifier);

	const transaction = {
		...createBaseTransaction(inputs),
		type: VoteTransaction.TYPE,
		asset: {
			votes: convertVotes(votes),
		},
	} as VoteTransaction;

	if (!passphrase) {
		return baseTransactionToJSON(transaction);
	}

	const voteTransaction = new VoteTransaction(transaction);
	voteTransaction.sign(networkIdentifier, passphrase);

	const { errors } = voteTransaction.validate();
	if (errors.length > 0) {
		throw new Error(errors.toString());
	}

	return baseTransactionToJSON(voteTransaction);
};
