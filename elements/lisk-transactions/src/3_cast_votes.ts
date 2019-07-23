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
import { VoteTransaction } from './3_vote_transaction';
import { VOTE_FEE } from './constants';
import { TransactionJSON } from './transaction_types';
import {
	createBaseTransaction,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validatePublicKeys,
} from './utils';

export interface CastVoteInputs {
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
	readonly unvotes?: ReadonlyArray<string>;
	readonly votes?: ReadonlyArray<string>;
}

interface VotesObject {
	readonly unvotes?: ReadonlyArray<string>;
	readonly votes?: ReadonlyArray<string>;
}

const validateInputs = ({ votes = [], unvotes = [] }: VotesObject): void => {
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

export const castVotes = (inputs: CastVoteInputs): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { passphrase, secondPassphrase, votes = [], unvotes = [] } = inputs;

	const plusPrependedVotes = prependPlusToPublicKeys(votes);
	const minusPrependedUnvotes = prependMinusToPublicKeys(unvotes);
	const allVotes: ReadonlyArray<string> = [
		...plusPrependedVotes,
		...minusPrependedUnvotes,
	];

	const transaction = {
		...createBaseTransaction(inputs),
		type: 3,
		fee: VOTE_FEE.toString(),
		asset: {
			votes: allVotes,
		},
	};

	if (!passphrase) {
		return transaction;
	}

	const transactionWithSenderInfo = {
		...transaction,
		// SenderId and SenderPublicKey are expected to be exist from base transaction
		senderId: transaction.senderId as string,
		senderPublicKey: transaction.senderPublicKey as string,
		recipientId: transaction.senderId as string,
		recipientPublicKey: transaction.senderPublicKey,
	};

	const voteTransaction = new VoteTransaction(transactionWithSenderInfo);
	voteTransaction.sign(passphrase, secondPassphrase);

	return voteTransaction.toJSON();
};
