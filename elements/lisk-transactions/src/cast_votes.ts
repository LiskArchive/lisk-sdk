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
import {
	isValidFee,
	isValidNonce,
	validateNetworkIdentifier,
} from '@liskhq/lisk-validator';

import { RawAssetVote, VoteTransaction } from './13_vote_transaction';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';

export interface CastVoteInputs {
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
	readonly passphrase?: string;
	readonly votes?: ReadonlyArray<RawAssetVote>;
}

interface GeneralInputs {
	readonly networkIdentifier: string;
	readonly fee: string;
	readonly nonce: string;
	readonly votes?: ReadonlyArray<RawAssetVote>;
}

const validateInputs = ({
	fee,
	nonce,
	networkIdentifier,
	votes,
}: GeneralInputs): void => {
	if (!isValidNonce(nonce)) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isValidFee(fee)) {
		throw new Error('Fee must be a valid number in string format.');
	}

	validateNetworkIdentifier(networkIdentifier);

	if (!votes?.length) {
		throw new Error('Votes must present to create transaction.');
	}
};

export const castVotes = (inputs: CastVoteInputs): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { networkIdentifier, passphrase, votes } = inputs;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 13,
		asset: {
			votes,
		},
	};

	if (!passphrase) {
		return transaction;
	}

	const transactionWithSenderInfo = {
		...transaction,
		// SenderId and SenderPublicKey are expected to be exist from base transaction
		senderPublicKey: transaction.senderPublicKey as string,
		asset: {
			...transaction.asset,
		},
	};

	const voteTransaction = new VoteTransaction(transactionWithSenderInfo);
	voteTransaction.sign(networkIdentifier, passphrase);

	const { errors } = voteTransaction.validate();
	if (errors.length > 0) {
		throw new Error(errors.toString());
	}

	return voteTransaction.toJSON();
};
