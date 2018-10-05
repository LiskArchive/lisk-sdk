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
import cryptography from '@liskhq/lisk-cryptography';
import { VOTE_FEE } from './constants';
import { PartialTransaction } from './transaction_types';
import {
	prepareTransaction,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validatePublicKeys,
} from './utils';

export interface CastVoteInputs {
	readonly passphrase: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
	readonly unvotes: ReadonlyArray<string>;
	readonly votes: ReadonlyArray<string>;
}

const validateInputs = ({ votes = [], unvotes = [] }: CastVoteInputs) => {
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

export const castVotes = (inputs: CastVoteInputs) => {
	validateInputs(inputs);
	const { passphrase, secondPassphrase, timeOffset, votes = [], unvotes = [] } = inputs;
	const recipientId = passphrase
		? cryptography.getAddressAndPublicKeyFromPassphrase(passphrase).address
		: undefined;

	const plusPrependedVotes = prependPlusToPublicKeys(votes);
	const minusPrependedUnvotes = prependMinusToPublicKeys(unvotes);
	const allVotes: ReadonlyArray<string> = [
		...plusPrependedVotes,
		...minusPrependedUnvotes,
	];

	const transaction: PartialTransaction = {
		type: 3,
		fee: VOTE_FEE.toString(),
		recipientId,
		asset: {
			votes: allVotes,
		},
	};

	return prepareTransaction(transaction, passphrase, secondPassphrase, timeOffset);
	
};