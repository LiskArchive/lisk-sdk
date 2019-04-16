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
import * as cryptography from '@liskhq/lisk-cryptography';
import { TransactionError, TransactionPendingError } from '../errors';
import {
	IsValidResponse,
	IsValidResponseWithError,
	TransactionJSON,
} from '../transaction_types';
import { getTransactionHash } from './get_transaction_hash';

export const multiSignTransaction = (
	transaction: TransactionJSON,
	passphrase: string,
): string => {
	const { signature, signSignature, ...transactionToSign } = transaction;

	const transactionHash = getTransactionHash(transactionToSign);

	return cryptography.signData(transactionHash, passphrase);
};

export const validateSignature = (
	publicKey: string,
	signature: string,
	transactionBytes: Buffer,
	id?: string,
): IsValidResponseWithError => {
	const transactionHash = cryptography.hash(transactionBytes);

	const valid = cryptography.verifyData(transactionHash, signature, publicKey);

	return {
		valid,
		error: !valid
			? new TransactionError(
					`Failed to validate signature ${signature}`,
					id,
					'.signature',
			  )
			: undefined,
	};
};

export const signaturesAreUnique = (
	signatures: ReadonlyArray<string>,
): boolean => {
	const uniqueSignatures: ReadonlyArray<string> = [...new Set(signatures)];
	if (uniqueSignatures.length !== signatures.length) {
		return false;
	}

	return true;
};

export const checkPublicKeySignatureUniqueness = (
	publicKeys: ReadonlyArray<string>,
	signatures: ReadonlyArray<string>,
	transactionBytes: Buffer,
	id?: string,
): Set<string> => {
	const checkedPublicKeys = new Set();
	const validSignatures = new Set();
	publicKeys.forEach(publicKey => {
		signatures.forEach((signature: string) => {
			// Avoid single key from verifying more than one signature.
			// See issue: https://github.com/LiskHQ/lisk/issues/2540
			if (checkedPublicKeys.has(publicKey) || validSignatures.has(signature)) {
				return;
			}

			const { valid: signatureValid } = validateSignature(
				publicKey,
				signature,
				transactionBytes,
				id,
			);

			if (signatureValid) {
				checkedPublicKeys.add(publicKey);
				validSignatures.add(signature);
			}
		});
	});

	return validSignatures;
};

export const validateMultisignatures = (
	publicKeys: ReadonlyArray<string>,
	signatures: ReadonlyArray<string>,
	minimumValidations: number,
	transactionBytes: Buffer,
	id?: string,
): IsValidResponse => {
	// Check that signatures are unique
	if (!signaturesAreUnique(signatures)) {
		return {
			valid: false,
			errors: [
				new TransactionError(
					'Encountered duplicate signature in transaction',
					id,
					'.signatures',
				),
			],
		};
	}

	// Check that each PK signed only once
	const validSignatures = checkPublicKeySignatureUniqueness(
		publicKeys,
		signatures,
		transactionBytes,
		id,
	);

	const invalidTransactionSignatures = signatures.filter(
		signature => !validSignatures.has(signature),
	);

	// Transaction is waiting for more signatures
	if (signatures.length < minimumValidations) {
		return {
			valid: false,
			errors: [
				new TransactionPendingError(`Missing signatures`, id, '.signatures'),
			],
		};
	}

	return {
		valid:
			validSignatures.size >= minimumValidations &&
			invalidTransactionSignatures.length === 0,
		errors:
			invalidTransactionSignatures.length > 0
				? invalidTransactionSignatures.map(
						signature =>
							new TransactionError(
								`Failed to validate signature ${signature}`,
								id,
								'.signatures',
							),
				  )
				: [],
	};
};

// FIXME: Deprecated
export const signTransaction = (
	transaction: TransactionJSON,
	passphrase: string,
): string => {
	const transactionHash = getTransactionHash(transaction);

	return cryptography.signData(transactionHash, passphrase);
};

// FIXME: Deprecated
export const secondSignTransaction = (
	transaction: TransactionJSON,
	secondPassphrase: string,
): TransactionJSON => ({
	...transaction,
	signSignature: signTransaction(transaction, secondPassphrase),
});

// FIXME: Deprecated
export const verifyTransaction = (
	transaction: TransactionJSON,
	secondPublicKey?: string,
): boolean => {
	if (!transaction.signature) {
		throw new Error('Cannot verify transaction without signature.');
	}
	if (!!transaction.signSignature && !secondPublicKey) {
		throw new Error('Cannot verify signSignature without secondPublicKey.');
	}

	const {
		signature,
		signSignature,
		...transactionWithoutSignatures
	} = transaction;
	const transactionWithoutSignature = !!transaction.signSignature
		? {
				...transactionWithoutSignatures,
				signature,
		  }
		: transactionWithoutSignatures;

	const transactionHash = getTransactionHash(transactionWithoutSignature);

	const publicKey =
		!!transaction.signSignature && secondPublicKey
			? secondPublicKey
			: transaction.senderPublicKey;
	const lastSignature = transaction.signSignature
		? transaction.signSignature
		: transaction.signature;

	const verified = cryptography.verifyData(
		transactionHash,
		lastSignature,
		publicKey,
	);

	return !!transaction.signSignature
		? verified && verifyTransaction(transactionWithoutSignature)
		: verified;
};
