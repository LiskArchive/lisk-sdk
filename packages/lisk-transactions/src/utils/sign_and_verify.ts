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
import { MAX_MULTISIG_SIGNATURES } from '../constants';
import { TransactionError } from '../errors';
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
	memberPublicKeys: ReadonlyArray<string> = [],
	signatures: ReadonlyArray<string>,
	minimumValidations: number,
	transactionBytes: Buffer,
	id?: string,
): IsVerifiedResponse => {
	if (!minimumValidations || typeof minimumValidations !== 'number') {
		return {
			verified: false,
			errors: [new TransactionError('Sender does not have valid multimin', id)],
		};
	}
	if (!signatures) {
		return {
			verified: false,
			errors: [new TransactionError('Missing signatures', id, '.signatures')],
		};
	}

	if (signatures.length > MAX_MULTISIG_SIGNATURES) {
		return {
			verified: false,
			errors: [
				new TransactionError(
					'Exceeds maximum of 15 signatures.',
					id,
					'.signatures',
				),
			],
		};
	}

	const checkedPublicKeys = new Map();
	const verifiedSignatures = new Map();

	memberPublicKeys.forEach(publicKey => {
		if (checkedPublicKeys.has(publicKey)) {
			return;
		}

		signatures.forEach((signature: string) => {
			if (verifiedSignatures.has(signature)) {
				return;
			}
			const { verified: signatureVerified } = verifySignature(
				publicKey,
				signature,
				transactionBytes,
				id,
			);
			if (signatureVerified) {
				checkedPublicKeys.set(publicKey, true);
				verifiedSignatures.set(signature, true);
			}
		});
	});

	const invalidSignatures: ReadonlyArray<string> = signatures.filter(
		signature =>
			!Array.from(verifiedSignatures.keys()).find(
				verifiedSignature => signature === verifiedSignature,
			),
	);

	// Transaction is waiting for more signatures
	if (
		signatures.length < minimumValidations &&
		invalidSignatures.length === 0
	) {
		return {
			verified: false,
			pending: true,
		};
	}

	return {
		verified:
			verifiedSignatures.size >= minimumValidations &&
			verifiedSignatures.size === signatures.length,
		errors:
			invalidSignatures.length > 0
				? invalidSignatures.map(
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
