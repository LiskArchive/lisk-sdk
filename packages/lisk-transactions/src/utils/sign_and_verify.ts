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
import { TransactionError } from '../errors';
import { TransactionJSON } from '../transaction_types';
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

interface VerifySignatureReturn {
	readonly verified: boolean;
	readonly error?: TransactionError;
}

export const verifySignature = (
	publicKey: string,
	signature: string,
	transactionBytes: Buffer,
	id?: string,
): VerifySignatureReturn => {
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

interface VerifyMultisignatureReturn {
	readonly verified: boolean;
	readonly errors: ReadonlyArray<TransactionError>;
}

export const verifyMultisignatures = (
	memberPublicKeys: ReadonlyArray<string> = [],
	signatures: ReadonlyArray<string>,
	minimumValidations: number,
	transactionBytes: Buffer,
	id?: string,
): VerifyMultisignatureReturn => {
	if (!minimumValidations || typeof minimumValidations !== 'number') {
		return {
			verified: false,
			errors: [new TransactionError('Sender does not have valid multimin', id)],
		};
	}
	if (!signatures || (signatures && signatures.length < minimumValidations)) {
		return {
			verified: false,
			errors: [new TransactionError('Missing signatures', id, '.signatures')],
		};
	}

	const verifiedSignatures: string[] = [];
	const checkedPublicKeys: string[] = [];

	memberPublicKeys.forEach(publicKey => {
		if (checkedPublicKeys.includes(publicKey)) {
			return;
		}

		signatures.forEach((signature: string) => {
			if (verifiedSignatures.includes(signature)) {
				return;
			}
			const { verified: signatureVerified } = verifySignature(
				publicKey,
				signature,
				transactionBytes,
			);
			if (signatureVerified) {
				checkedPublicKeys.push(publicKey);
				verifiedSignatures.push(signature);
			}
		});
	});

	const unverifiedSignatures = signatures.filter(
		e => !verifiedSignatures.find(a => e === a),
	);

	return {
		verified: verifiedSignatures.length >= minimumValidations,
		errors:
			unverifiedSignatures.length > 0
				? unverifiedSignatures.map(
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
