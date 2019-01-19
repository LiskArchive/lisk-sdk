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
import { IsVerifiedResponse, TransactionJSON } from '../transaction_types';
import { getTransactionHash } from './get_transaction_hash';

export const signTransaction = (
	transaction: TransactionJSON,
	passphrase: string,
): string => {
	const transactionHash = getTransactionHash(transaction);

	return cryptography.signData(transactionHash, passphrase);
};

export const secondSignTransaction = (
	transaction: TransactionJSON,
	secondPassphrase: string,
): TransactionJSON => ({
	...transaction,
	signSignature: signTransaction(transaction, secondPassphrase),
});

export const multiSignTransaction = (
	transaction: TransactionJSON,
	passphrase: string,
): string => {
	const { signature, signSignature, ...transactionToSign } = transaction;

	const transactionHash = getTransactionHash(transactionToSign);

	return cryptography.signData(transactionHash, passphrase);
};

export const verifySignature = (
	publicKey: string,
	signature: string,
	transactionBytes: Buffer,
	id?: string,
): IsVerifiedResponse => {
	const transactionHash = cryptography.hash(transactionBytes);

	const verified = cryptography.verifyData(
		transactionHash,
		signature,
		publicKey,
	);

	return {
		verified,
		error: !verified
			? new TransactionError(
					`Failed to verify signature ${signature}`,
					id,
					'.signature',
			  )
			: undefined,
	};
};

export const verifyMultisignatures = (
	publicKeys: ReadonlyArray<string> = [],
	signatures: ReadonlyArray<string>,
	minimumValidations: number,
	transactionBytes: Buffer,
	id?: string,
): IsVerifiedResponse => {
	const checkedPublicKeys = new Set();
	const verifiedSignatures = new Set();
	// Check that signatures are unique
	const uniqueSignatures: ReadonlyArray<string> = [...new Set(signatures)];
	if (uniqueSignatures.length !== signatures.length) {
		return {
			verified: false,
			errors: [
				new TransactionError(
					'Encountered duplicate signature in transaction',
					id,
					'.signatures',
				),
			],
		};
	}

	publicKeys.forEach(publicKey => {
		signatures.forEach((signature: string) => {
			// Avoid single key from verifying more than one signature.
			// See issue: https://github.com/LiskHQ/lisk/issues/2540
			if (
				checkedPublicKeys.has(publicKey) ||
				verifiedSignatures.has(signature)
			) {
				return;
			}

			const { verified: signatureVerified } = verifySignature(
				publicKey,
				signature,
				transactionBytes,
				id,
			);

			if (signatureVerified) {
				checkedPublicKeys.add(publicKey);
				verifiedSignatures.add(signature);
			}
		});
	});

	const unverifiedTransactionSignatures = signatures.filter(
		signature => !verifiedSignatures.has(signature),
	);

	// Transaction is waiting for more signatures
	if (signatures.length < minimumValidations) {
		return {
			verified: false,
			errors: [
				new TransactionPendingError(`Missing signatures`, id, '.signatures'),
			],
		};
	}

	return {
		verified:
			verifiedSignatures.size >= minimumValidations &&
			unverifiedTransactionSignatures.length === 0,
		errors:
			unverifiedTransactionSignatures.length > 0
				? unverifiedTransactionSignatures.map(
						signature =>
							new TransactionError(
								`Failed to verify signature ${signature}`,
								id,
								'.signature',
							),
				  )
				: [],
	};
};

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
