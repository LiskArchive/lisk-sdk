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
import cryptography from '@liskhq/lisk-cryptography';
import { BaseTransaction } from '../types/transactions';
import { getTransactionHash } from './get_transaction_hash';

export const signTransaction = (
	transaction: BaseTransaction,
	passphrase?: string,
): string => {
	const transactionHash = getTransactionHash(transaction);

	return cryptography.signData(transactionHash, passphrase);
};

export const multiSignTransaction = (
	transaction: BaseTransaction,
	passphrase: string,
): string => {
	const { signature, signSignature, ...transactionToSign } = transaction;

	const transactionHash = getTransactionHash(transactionToSign);

	return cryptography.signData(transactionHash, passphrase);
};

export const verifyTransaction = (
	transaction: BaseTransaction,
	secondPublicKey?: string,
): boolean => {
	const secondSignaturePresent = !!transaction.signSignature;
	if (secondSignaturePresent && !secondPublicKey) {
		throw new Error('Cannot verify signSignature without secondPublicKey.');
	}

	const {
		signature,
		signSignature,
		...transactionWithoutSignatures
	} = transaction;
	const transactionWithoutSignature = secondSignaturePresent
		? {
				...transactionWithoutSignatures,
				signature,
		  }
		: transactionWithoutSignatures;

	const transactionHash = getTransactionHash(transactionWithoutSignature);

	const publicKey = secondSignaturePresent
		? secondPublicKey
		: transaction.senderPublicKey;
	const lastSignature = secondSignaturePresent
		? transaction.signSignature
		: transaction.signature;

	const verified = cryptography.verifyData(
		transactionHash,
		lastSignature,
		publicKey,
	);

	return secondSignaturePresent
		? verified && verifyTransaction(transactionWithoutSignature)
		: verified;
};
