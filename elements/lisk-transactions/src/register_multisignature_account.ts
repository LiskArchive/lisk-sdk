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
	MAX_NUMBER_OF_KEYS,
	MAX_NUMBER_OF_SIGNATURES,
	MIN_NUMBER_OF_KEYS,
	MIN_NUMBER_OF_SIGNATURES,
} from './constants';
import { TransactionJSON } from './transaction_types';
import { createBaseTransaction } from './utils';

export interface RegisterMultisignatureInputs {
	readonly senderPassphrase: string;
	readonly passphrases: string[];
	readonly mandatoryKeys: string[];
	readonly optionalKeys: string[];
	readonly numberOfSignatures: number;
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
}

interface ValidateMultisignatureRegistrationInput {
	readonly mandatoryPublicKeys: string[];
	readonly optionalPublicKeys: string[];
	readonly numberOfSignatures: number;
	readonly networkIdentifier: string;
	readonly fee: string;
	readonly nonce: string;
}

const validateInputs = ({
	mandatoryPublicKeys,
	optionalPublicKeys,
	numberOfSignatures,
	networkIdentifier,
	fee,
	nonce,
}: ValidateMultisignatureRegistrationInput): void => {
	if (!isValidNonce(nonce)) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isValidFee(fee)) {
		throw new Error('Fee must be a valid number in string format.');
	}

	if (
		!isValidInteger(numberOfSignatures) ||
		numberOfSignatures < MIN_NUMBER_OF_SIGNATURES ||
		numberOfSignatures > MAX_NUMBER_OF_SIGNATURES
	) {
		throw new Error(
			`Please provide a valid numberOfSignatures value. Expected integer between ${MIN_NUMBER_OF_SIGNATURES} and ${MAX_NUMBER_OF_SIGNATURES}.`,
		);
	}

	if (mandatoryPublicKeys.length > numberOfSignatures) {
		throw new Error(
			'numberOfSignatures should be more than or equal to the number of mandatory passphrases.',
		);
	}

	if (
		numberOfSignatures >
		mandatoryPublicKeys.length + optionalPublicKeys.length
	) {
		throw new Error(
			`Please provide a valid numberOfSignatures. numberOfSignatures (${numberOfSignatures}) is bigger than the count of optional (${optionalPublicKeys.length}) and mandatory (${mandatoryPublicKeys.length}) keys.`,
		);
	}

	if (
		mandatoryPublicKeys.length + optionalPublicKeys.length >
		MAX_NUMBER_OF_SIGNATURES
	) {
		throw new Error(
			`Please provide a valid count for mandatory and optional passphrases. Expected integer between ${MIN_NUMBER_OF_SIGNATURES} and ${MAX_NUMBER_OF_SIGNATURES}.`,
		);
	}

	validateKeysgroup(
		mandatoryPublicKeys,
		MIN_NUMBER_OF_KEYS,
		MAX_NUMBER_OF_KEYS,
		'Mandatory Keys',
	);

	validateKeysgroup(
		optionalPublicKeys,
		MIN_NUMBER_OF_KEYS,
		MAX_NUMBER_OF_KEYS,
		'Optional Keys',
	);

	validateNetworkIdentifier(networkIdentifier);
};

export const registerMultisignature = (
	inputs: RegisterMultisignatureInputs,
): Partial<TransactionJSON> => {
	const {
		senderPassphrase,
		passphrases,
		mandatoryKeys,
		optionalKeys,
		numberOfSignatures,
		networkIdentifier,
		fee,
		nonce,
	} = inputs;

	validateInputs({
		mandatoryPublicKeys: mandatoryKeys,
		optionalPublicKeys: optionalKeys,
		numberOfSignatures,
		networkIdentifier,
		fee,
		nonce,
	});

	const transaction = {
		...createBaseTransaction(inputs),
		type: 12,
		networkIdentifier,
		asset: {
			mandatoryKeys,
			optionalKeys,
			numberOfSignatures,
		},
	};

	const multisignatureTransaction = new MultisignatureTransaction(transaction);

	multisignatureTransaction.signAll(networkIdentifier, senderPassphrase, {
		passphrases,
		mandatoryKeys,
		optionalKeys,
		numberOfSignatures,
	});

	return multisignatureTransaction.toJSON();
};
