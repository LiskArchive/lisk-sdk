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
	isValidInteger,
	isValidNonce,
	validateKeysgroup,
	validateNetworkIdentifier,
} from '@liskhq/lisk-validator';

import { MultisignatureTransaction } from './12_multisignature_transaction';
import {
	MULTISIGNATURE_MAX_KEYSGROUP,
	MULTISIGNATURE_MAX_LIFETIME,
	MULTISIGNATURE_MIN_KEYSGROUP,
	MULTISIGNATURE_MIN_LIFETIME,
} from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction, prependPlusToPublicKeys } from './utils';

export interface RegisterMultisignatureInputs {
	readonly keysgroup: ReadonlyArray<string>;
	readonly lifetime: number;
	readonly minimum: number;
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
}

const validateInputs = ({
	keysgroup,
	lifetime,
	minimum,
	networkIdentifier,
	fee,
	nonce,
}: RegisterMultisignatureInputs): void => {
	if (!isValidNonce(nonce)) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isValidFee(fee)) {
		throw new Error('Fee must be a valid number in string format.');
	}

	if (
		!isValidInteger(lifetime) ||
		lifetime < MULTISIGNATURE_MIN_LIFETIME ||
		lifetime > MULTISIGNATURE_MAX_LIFETIME
	) {
		throw new Error(
			`Please provide a valid lifetime value. Expected integer between ${MULTISIGNATURE_MIN_LIFETIME} and ${MULTISIGNATURE_MAX_LIFETIME}.`,
		);
	}

	if (
		!isValidInteger(minimum) ||
		minimum < MULTISIGNATURE_MIN_KEYSGROUP ||
		minimum > MULTISIGNATURE_MAX_KEYSGROUP
	) {
		throw new Error(
			`Please provide a valid minimum value. Expected integer between ${MULTISIGNATURE_MIN_KEYSGROUP} and ${MULTISIGNATURE_MAX_KEYSGROUP}.`,
		);
	}

	if (keysgroup.length < minimum) {
		throw new Error(
			'Minimum number of signatures is larger than the number of keys in the keysgroup.',
		);
	}

	validateKeysgroup(
		keysgroup,
		MULTISIGNATURE_MIN_KEYSGROUP,
		MULTISIGNATURE_MAX_KEYSGROUP,
	);

	validateNetworkIdentifier(networkIdentifier);
};

export const registerMultisignature = (
	inputs: RegisterMultisignatureInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const {
		keysgroup,
		lifetime,
		minimum,
		passphrase,
		networkIdentifier,
	} = inputs;

	const plusPrependedKeysgroup = prependPlusToPublicKeys(keysgroup);

	const transaction = {
		...createBaseTransaction(inputs),
		type: 12,
		asset: {
			min: minimum,
			lifetime,
			keysgroup: plusPrependedKeysgroup,
		},
		networkIdentifier,
	};

	if (!passphrase) {
		return transaction;
	}

	const multisignatureTransaction = new MultisignatureTransaction(transaction);
	multisignatureTransaction.sign(passphrase);

	return multisignatureTransaction.toJSON();
};
