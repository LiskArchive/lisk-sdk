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
import { Account } from '../types';

import { convertBeddowsToLSK } from './format';
import { validateSignature } from './sign_and_validate';

export const verifySenderPublicKey = (
	id: Buffer,
	sender: Account,
	publicKey: Buffer,
): TransactionError | undefined =>
	sender.publicKey.length !== 0 && !sender.publicKey.equals(publicKey)
		? new TransactionError(
				'Invalid sender publicKey',
				id,
				'.senderPublicKey',
				publicKey.toString('base64'),
				sender.publicKey.toString('base64'),
		  )
		: undefined;

export const verifyMinRemainingBalance = (
	id: Buffer,
	account: Account,
	minRemainingBalance: bigint,
): TransactionError | undefined => {
	if (account.balance < minRemainingBalance) {
		return new TransactionError(
			`Account does not have enough minimum remaining LSK: ${account.address.toString(
				'base64',
			)}, balance: ${convertBeddowsToLSK(account.balance.toString())}`,
			id,
			'.balance',
			account.balance.toString(),
			minRemainingBalance.toString(),
		);
	}

	return undefined;
};

export const verifyAccountNonce = (
	id: Buffer,
	account: Account,
	nonce: bigint,
): TransactionError | undefined => {
	if (nonce < account.nonce) {
		return new TransactionError(
			`Incompatible transaction nonce for account: ${account.address.toString(
				'base64',
			)}, Tx Nonce: ${nonce.toString()}, Account Nonce: ${account.nonce.toString()}`,
			id,
			'.nonce',
			nonce.toString(),
			account.nonce.toString(),
		);
	}

	if (nonce > account.nonce) {
		return new TransactionError(
			`Transaction nonce for account: ${account.address.toString(
				'base64',
			)} is higher than expected, Tx Nonce: ${nonce.toString()}, Account Nonce: ${account.nonce.toString()}`,
			id,
			'.nonce',
			nonce.toString(),
			account.nonce.toString(),
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
	keys: Array<Readonly<Buffer>>,
	signatures: Array<Readonly<Buffer>>,
	transactionBytes: Buffer,
): TransactionError[] => {
	const errors = [];

	for (let i = 0; i < keys.length; i += 1) {
		if (signatures[i].length === 0) {
			errors.push(
				new TransactionError(
					'Invalid signatures format. signatures should not include empty string.',
					undefined,
					'.signatures',
					signatures.map(sign => sign.toString('base64')).join(','),
				),
			);
			break;
		}
		const { error } = validateSignature(
			keys[i] as Buffer,
			signatures[i] as Buffer,
			transactionBytes,
		);

		if (error) {
			errors.push(error);
		}
	}

	return errors;
};

export const verifyMultiSignatureTransaction = (
	id: Buffer,
	sender: Account,
	signatures: Array<Readonly<Buffer>>,
	transactionBytes: Buffer,
): TransactionError[] => {
	const errors = [];

	const { mandatoryKeys, optionalKeys, numberOfSignatures } = sender.keys;
	const numMandatoryKeys = mandatoryKeys.length;
	const numOptionalKeys = optionalKeys.length;
	// Filter empty signature to compare against numberOfSignatures
	const nonEmptySignaturesCount = signatures.filter(k => k.length !== 0).length;

	// Check if signatures excluding empty string matched required numberOfSignatures
	if (
		nonEmptySignaturesCount !== numberOfSignatures ||
		signatures.length !== numMandatoryKeys + numOptionalKeys
	) {
		const error = new TransactionError(
			`Transaction signatures does not match required number of signatures: ${numberOfSignatures.toString()}`,
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
	for (let k = 0; k < numOptionalKeys; k += 1) {
		// Get corresponding optional key signature starting from offset(end of mandatory keys)
		const signature = signatures[numMandatoryKeys + k];
		if (signature.length !== 0) {
			const { error } = validateSignature(
				optionalKeys[k],
				signature as Buffer,
				transactionBytes,
			);
			if (error) {
				errors.push(error);
			}
		}
	}

	return errors;
};
