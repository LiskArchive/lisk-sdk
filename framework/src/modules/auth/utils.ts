/*
 * Copyright © 2021 Lisk Foundation
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
 */

import { Transaction, TAG_TRANSACTION } from '@liskhq/lisk-chain';
import { codec, Schema } from '@liskhq/lisk-codec';
import { ed } from '@liskhq/lisk-cryptography';
import { isHexString } from '@liskhq/lisk-validator';
import { VerificationResult, VerifyStatus } from '../../state_machine';
import { Keys } from './types';
import { AuthAccount } from './stores/auth_account';

/**
 * Verifies that the given `signature` corresponds to given `chainID`, `publicKey` and `transactionBytes`
 *
 * https://github.com/LiskHQ/lips/blob/main/proposals/lip-0041.md#transaction-verification
 */
export const verifySignature = (
	chainID: Buffer,
	publicKey: Buffer,
	signature: Buffer,
	transactionBytes: Buffer,
	id: Buffer,
): void => {
	const isSignatureValid = ed.verifyData(
		TAG_TRANSACTION,
		chainID,
		transactionBytes,
		signature,
		publicKey,
	);

	if (!isSignatureValid) {
		throw new Error(
			`Failed to validate signature '${signature.toString(
				'hex',
			)}' for transaction with id '${id.toString('hex')}'`,
		);
	}
};

export const verifyAllSignatures = (
	chainID: Buffer,
	keys: ReadonlyArray<Buffer>,
	mandatoryKeysCount: number,
	signatures: ReadonlyArray<Buffer>,
	transactionBytes: Buffer,
	id: Buffer,
): void => {
	for (let i = 0; i < keys.length; i += 1) {
		if (signatures[i].length !== 0) {
			verifySignature(chainID, keys[i], signatures[i], transactionBytes, id);
		}
		// do not throw for missing optional signatures
		else if (signatures[i].length === 0 && i < mandatoryKeysCount) {
			throw new Error('Missing signature for a mandatory key.');
		}
	}
};

/**
 * https://github.com/LiskHQ/lips/blob/main/proposals/lip-0041.md#transaction-verification
 * Current code is already in sync with LIP. No change needed.
 */
export const verifyMultiSignatureTransaction = (
	chainID: Buffer,
	id: Buffer,
	account: AuthAccount,
	signatures: ReadonlyArray<Buffer>,
	transactionBytes: Buffer,
): void => {
	const keys = account.mandatoryKeys.concat(account.optionalKeys);
	const mandatoryKeysCount = account.mandatoryKeys.length;

	// Filter empty signature to compare against numberOfSignatures
	const nonEmptySignaturesCount = signatures.filter(k => k.length !== 0).length;

	// Check if signatures excluding empty string match required numberOfSignatures
	if (nonEmptySignaturesCount !== account.numberOfSignatures || signatures.length !== keys.length) {
		throw new Error(
			`Transaction signatures does not match required number of signatures: '${account.numberOfSignatures.toString()}' for transaction with id '${id.toString(
				'hex',
			)}'`,
		);
	}

	verifyAllSignatures(chainID, keys, mandatoryKeysCount, signatures, transactionBytes, id);
};

export const verifyRegisterMultiSignatureTransaction = (
	transactionParamsSchema: Schema,
	transaction: Transaction,
	chainID: Buffer,
): void => {
	const { mandatoryKeys, optionalKeys } = codec.decode<Keys>(
		transactionParamsSchema,
		transaction.params,
	);

	// For multisig registration we need all signatures to be present (including sender's one that's why we add 1 to the count)
	const numberOfExpectedKeys = mandatoryKeys.length + optionalKeys.length + 1;
	if (numberOfExpectedKeys !== transaction.signatures.length) {
		throw new Error(
			`There are missing signatures. Expected: ${numberOfExpectedKeys} signatures but got: ${transaction.signatures.length}.`,
		);
	}

	// Check if empty signatures are present
	if (!transaction.signatures.every((signature: Buffer) => signature.length > 0)) {
		throw new Error('A valid signature is required for each registered key.');
	}

	// Verify that the first signature is from senderPublicKey
	verifySignature(
		chainID,
		transaction.senderPublicKey,
		transaction.signatures[0],
		transaction.getSigningBytes(),
		transaction.id,
	);

	const keys = mandatoryKeys.concat(optionalKeys);

	verifyAllSignatures(
		chainID,
		keys,
		mandatoryKeys.length,
		transaction.signatures.slice(1),
		transaction.getSigningBytes(),
		transaction.id,
	);
};

export const verifySignatures = (
	transaction: Transaction,
	chainID: Buffer,
	account: AuthAccount,
) => {
	if (account.numberOfSignatures !== 0) {
		verifyMultiSignatureTransaction(
			chainID,
			transaction.id,
			account,
			transaction.signatures,
			transaction.getSigningBytes(),
		);
	} else {
		if (transaction.signatures.length !== 1) {
			throw new Error(
				`Transactions from a single signature account should have exactly one signature. Found ${transaction.signatures.length} signatures.`,
			);
		}

		verifySignature(
			chainID,
			transaction.senderPublicKey,
			transaction.signatures[0],
			transaction.getSigningBytes(),
			transaction.id,
		);
	}
};

export const verifyNonce = (
	transaction: Transaction,
	senderAccount: AuthAccount,
): VerificationResult => {
	if (transaction.nonce < senderAccount.nonce) {
		return { status: VerifyStatus.FAIL };
	}
	return {
		status: transaction.nonce > senderAccount.nonce ? VerifyStatus.PENDING : VerifyStatus.OK,
	};
};

export const getTransactionFromParameter = (transactionParameter: unknown) => {
	if (!isHexString(transactionParameter)) {
		throw new Error('Transaction parameter must be a string.');
	}

	const transactionBuffer = Buffer.from(transactionParameter as string, 'hex');

	const transaction = Transaction.fromBytes(transactionBuffer);
	transaction.validate();

	return transaction;
};
