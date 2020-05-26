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
	validateNetworkIdentifier,
} from '@liskhq/lisk-validator';

import { MultisignatureTransaction } from './12_multisignature_transaction';
import {
	MAX_NUMBER_OF_KEYS,
	MAX_NUMBER_OF_SIGNATURES,
	MIN_NUMBER_OF_KEYS,
	MIN_NUMBER_OF_SIGNATURES,
} from './constants';
import { TransactionJSON } from './types';
import { createBaseTransaction, findRepeatedKeys } from './utils';

export interface RegisterMultisignatureInputs {
	readonly senderPassphrase: string;
	readonly passphrases: ReadonlyArray<string>;
	readonly mandatoryKeys: Array<Readonly<string>>;
	readonly optionalKeys: Array<Readonly<string>>;
	readonly numberOfSignatures: number;
	readonly networkIdentifier: string;
	readonly nonce: string;
	readonly fee: string;
}

interface ValidateMultisignatureRegistrationInput {
	readonly mandatoryPublicKeys: Array<Readonly<string>>;
	readonly optionalPublicKeys: Array<Readonly<string>>;
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
			`Please provide a valid numberOfSignatures value. Expected integer between ${MIN_NUMBER_OF_SIGNATURES.toString()} and ${MAX_NUMBER_OF_SIGNATURES.toString()}.`,
		);
	}

	if (mandatoryPublicKeys.length > numberOfSignatures) {
		throw new Error(
			'The numberOfSignatures should be more than or equal to the number of mandatory keys.',
		);
	}

	if (
		numberOfSignatures >
		mandatoryPublicKeys.length + optionalPublicKeys.length
	) {
		throw new Error(
			`Please provide a valid numberOfSignatures. numberOfSignatures (${numberOfSignatures.toString()}) is bigger than the count of optional (${
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				optionalPublicKeys.length
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			}) and mandatory (${mandatoryPublicKeys.length}) keys.`,
		);
	}

	if (
		mandatoryPublicKeys.length + optionalPublicKeys.length >
			MAX_NUMBER_OF_KEYS ||
		mandatoryPublicKeys.length + optionalPublicKeys.length < MIN_NUMBER_OF_KEYS
	) {
		throw new Error(
			`Please provide a valid number of mandatory and optional keys. Expected integer between ${MIN_NUMBER_OF_SIGNATURES.toString()} and ${MAX_NUMBER_OF_SIGNATURES.toString()}.`,
		);
	}

	// Check key duplication between sets
	const repeatedKeys = findRepeatedKeys(
		optionalPublicKeys,
		mandatoryPublicKeys,
	);
	if (repeatedKeys.length > 0) {
		throw new Error(
			`There are repeated values in optional and mandatory keys: '${repeatedKeys.join(
				', ',
			)}'`,
		);
	}

	// Check key repetitions inside each set
	const uniqueKeys = Array.from(
		new Set([...mandatoryPublicKeys, ...optionalPublicKeys]),
	);
	if (
		uniqueKeys.length !==
		mandatoryPublicKeys.length + optionalPublicKeys.length
	) {
		throw new Error(
			'There are repeated public keys. Mandatory and Optional Public Keys need too be unique.',
		);
	}

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
		asset: {
			mandatoryKeys,
			optionalKeys,
			numberOfSignatures,
		},
	};

	const multisignatureTransaction = new MultisignatureTransaction(transaction);

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!passphrases || !senderPassphrase) {
		return multisignatureTransaction;
	}

	multisignatureTransaction.sign(
		networkIdentifier,
		senderPassphrase,
		passphrases,
		{
			mandatoryKeys,
			optionalKeys,
			numberOfSignatures,
		},
	);

	return multisignatureTransaction;
};
