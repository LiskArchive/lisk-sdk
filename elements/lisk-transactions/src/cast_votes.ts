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
import { getAddressFromPassphrase } from '@liskhq/lisk-cryptography';
import {
	validateNetworkIdentifier,
	validatePublicKeys,
} from '@liskhq/lisk-validator';

import { VoteTransaction } from './11_vote_transaction';
import { TransactionJSON } from './transaction_types';
import {
	createBaseTransaction,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
} from './utils';

export interface CastVoteInputs {
	readonly networkIdentifier: string;
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
	readonly unvotes?: ReadonlyArray<string>;
	readonly votes?: ReadonlyArray<string>;
}

interface VotesObject {
	readonly unvotes?: ReadonlyArray<string>;
	readonly votes?: ReadonlyArray<string>;
	readonly networkIdentifier: string;
}

const validateInputs = ({
	votes = [],
	unvotes = [],
	networkIdentifier,
}: VotesObject): void => {
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

	validateNetworkIdentifier(networkIdentifier);
};

export const castVotes = (inputs: CastVoteInputs): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const {
		networkIdentifier,
		passphrase,
		secondPassphrase,
		votes = [],
		unvotes = [],
	} = inputs;

	const plusPrependedVotes = prependPlusToPublicKeys(votes);
	const minusPrependedUnvotes = prependMinusToPublicKeys(unvotes);
	const allVotes: ReadonlyArray<string> = [
		...plusPrependedVotes,
		...minusPrependedUnvotes,
	];

	const transaction = {
		...createBaseTransaction(inputs),
		type: 11,
		asset: {
			// TODO: Remove this after hardfork change. Amount is kept as asset property for exceptions
			amount: '0',
			votes: allVotes,
		},
	};

	if (!passphrase) {
		return transaction;
	}

	const recipientId = getAddressFromPassphrase(passphrase);
	const transactionWithSenderInfo = {
		...transaction,
		// SenderId and SenderPublicKey are expected to be exist from base transaction
		senderPublicKey: transaction.senderPublicKey as string,
		asset: {
			...transaction.asset,
			recipientId,
		},
		networkIdentifier,
	};

	const voteTransaction = new VoteTransaction(transactionWithSenderInfo);
	voteTransaction.sign(passphrase, secondPassphrase);

	return voteTransaction.toJSON();
};
