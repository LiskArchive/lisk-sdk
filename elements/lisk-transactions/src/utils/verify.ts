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
import { TransactionError } from '../errors';
import { Account } from '../transaction_types';

import { convertBeddowsToLSK } from './format';
import { validateSignature } from './sign_and_validate';

export const verifySenderPublicKey = (
	id: string,
	sender: Account,
	publicKey: string,
): TransactionError | undefined =>
	sender.publicKey && sender.publicKey !== publicKey
		? new TransactionError(
				'Invalid sender publicKey',
				id,
				'.senderPublicKey',
				publicKey,
				sender.publicKey,
		  )
		: undefined;

export const verifyMinRemainingBalance = (
	id: string,
	account: Account,
	minRemainingBalance: bigint,
): TransactionError | undefined => {
	if (account.balance < minRemainingBalance) {
		return new TransactionError(
			`Account does not have enough minimum remaining LSK: ${
				account.address
			}, balance: ${convertBeddowsToLSK(account.balance.toString())}`,
			id,
			'.balance',
			account.balance.toString(),
			minRemainingBalance.toString(),
		);
	}

	return undefined;
};

export const isMultisignatureAccount = (account: Account): boolean =>
	!!(
		(account.keys.mandatoryKeys.length > 0 ||
			account.keys.optionalKeys.length > 0) &&
		account.keys.numberOfSignatures
	);

export const validateKeysSignatures = (
	keys: readonly string[],
	signatures: readonly string[],
	transactionBytes: Buffer,
) => {
	const errors = [];
	// tslint:disable-next-line: prefer-for-of no-let
	for (let i = 0; i < keys.length; i += 1) {
		const { error } = validateSignature(
			keys[i],
			signatures[i],
			transactionBytes,
		);

		if (error) {
			errors.push(error);
		}
	}

	return errors;
};

export const verifyMultiSignatureTransaction = (
	id: string,
	sender: Account,
	signatures: ReadonlyArray<string>,
	transactionBytes: Buffer,
) => {
	const errors = [];

	const { mandatoryKeys, optionalKeys, numberOfSignatures } = sender.keys;
	const numMandatoryKeys = mandatoryKeys.length;
	const numOptionalKeys = optionalKeys.length;
	const nonEmptySignaturesCount = signatures.filter(k => k.length !== 0).length;

	// Check if signatures excluding empty string matched required numberOfSignatures
	if (
		nonEmptySignaturesCount !== numberOfSignatures ||
		signatures.length !== numMandatoryKeys + numOptionalKeys
	) {
		const error = new TransactionError(
			`Transaction signatures does not match required number of transactions: ${numberOfSignatures}`,
			id,
			'.signatures',
			signatures.join(','),
		);

		return [error];
	}

	const mandatoryKeysError = validateKeysSignatures(
		mandatoryKeys,
		signatures,
		transactionBytes,
	);

	errors.push(...mandatoryKeysError);

	// Iterate through non empty optional keys for signature validity
	// tslint:disable-next-line: prefer-for-of no-let
	for (let k = 0; k < numOptionalKeys; k += 1) {
		const signature = signatures[numMandatoryKeys + k];
		if (signature.length !== 0) {
			const { error } = validateSignature(
				optionalKeys[k],
				signature,
				transactionBytes,
			);
			errors.push(error as TransactionError);
		}
	}

	return errors;
};
