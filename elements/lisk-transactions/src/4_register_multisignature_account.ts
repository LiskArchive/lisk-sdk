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
import { MultisignatureTransaction } from './4_multisignature_transaction';
import {
	MULTISIGNATURE_FEE,
	MULTISIGNATURE_MAX_KEYSGROUP,
	MULTISIGNATURE_MAX_LIFETIME,
	MULTISIGNATURE_MIN_KEYSGROUP,
	MULTISIGNATURE_MIN_LIFETIME,
} from './constants';
import { TransactionJSON } from './transaction_types';
import {
	createBaseTransaction,
	isValidInteger,
	prependPlusToPublicKeys,
	validateKeysgroup,
} from './utils';

export interface RegisterMultisignatureInputs {
	readonly keysgroup: ReadonlyArray<string>;
	readonly lifetime: number;
	readonly minimum: number;
	readonly passphrase?: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
}

const validateInputs = ({
	keysgroup,
	lifetime,
	minimum,
}: {
	readonly keysgroup: ReadonlyArray<string>;
	readonly lifetime: number;
	readonly minimum: number;
}): void => {
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
	validateKeysgroup(keysgroup);
};

export const registerMultisignature = (
	inputs: RegisterMultisignatureInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { keysgroup, lifetime, minimum, passphrase, secondPassphrase } = inputs;

	const plusPrependedKeysgroup = prependPlusToPublicKeys(keysgroup);
	const keygroupFees = plusPrependedKeysgroup.length + 1;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 4,
		fee: (MULTISIGNATURE_FEE * keygroupFees).toString(),
		asset: {
			multisignature: {
				min: minimum,
				lifetime,
				keysgroup: plusPrependedKeysgroup,
			},
		},
	};

	if (!passphrase) {
		return transaction;
	}

	const multisignatureTransaction = new MultisignatureTransaction(
		transaction as TransactionJSON,
	);
	multisignatureTransaction.sign(passphrase, secondPassphrase);

	return multisignatureTransaction.toJSON();
};
