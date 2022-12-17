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

export const verifyMessageSig = (
	chainID: Buffer,
	publicKey: Buffer,
	signature: Buffer,
	transactionBytes: Buffer,
	id: Buffer,
): void => {
	const valid = ed.verifyData(TAG_TRANSACTION, chainID, transactionBytes, signature, publicKey);

	if (!valid) {
		throw new Error(
			`Failed to validate signature '${signature.toString(
				'hex',
			)}' for transaction with id '${id.toString('hex')}'`,
		);
	}
};

export const validateKeysSignatures = (
	chainID: Buffer,
	keys: ReadonlyArray<Buffer>,
	signatures: ReadonlyArray<Buffer>,
	transactionBytes: Buffer,
	id: Buffer,
): void => {
	for (let i = 0; i < keys.length; i += 1) {
		if (signatures[i].length === 0) {
			throw new Error('Invalid signature. Empty buffer is not a valid signature.');
		}

		verifyMessageSig(chainID, keys[i], signatures[i], transactionBytes, id);
	}
};

/**
 * https://github.com/LiskHQ/lips/blob/main/proposals/lip-0041.md#transaction-verification
 * Current code is already in sync with LIP. No change needed.
 */
export const verifyMultiSignatureTransaction = (
	chainID: Buffer,
	id: Buffer,
	keys: Keys,
	signatures: ReadonlyArray<Buffer>,
	transactionBytes: Buffer,
): void => {
	const { mandatoryKeys, optionalKeys, numberOfSignatures } = keys;
	const numMandatoryKeys = mandatoryKeys.length;
	const numOptionalKeys = optionalKeys.length;
	// Filter empty signature to compare against numberOfSignatures
	const nonEmptySignaturesCount = signatures.filter(k => k.length !== 0).length;

	// Check if signatures excluding empty string match required numberOfSignatures
	if (
		nonEmptySignaturesCount !== numberOfSignatures ||
		signatures.length !== numMandatoryKeys + numOptionalKeys
	) {
		throw new Error(
			`Transaction signatures does not match required number of signatures: '${numberOfSignatures.toString()}' for transaction with id '${id.toString(
				'hex',
			)}'`,
		);
	}

	validateKeysSignatures(chainID, mandatoryKeys, signatures, transactionBytes, id);

	// Iterate through non empty optional keys for signature validity
	for (let k = 0; k < numOptionalKeys; k += 1) {
		// Get corresponding optional key signature starting from offset(end of mandatory keys)
		const signature = signatures[numMandatoryKeys + k];
		if (signature.length !== 0) {
			verifyMessageSig(chainID, optionalKeys[k], signature, transactionBytes, id);
		}
	}
};

export const verifyRegisterMultiSignatureTransaction = (
	transactionParamsSchema: Schema,
	transaction: Transaction,
	transactionBytes: Buffer,
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

	// Verify first signature is from senderPublicKey
	verifyMessageSig(
		chainID,
		transaction.senderPublicKey,
		transaction.signatures[0],
		transactionBytes,
		transaction.id,
	);

	// Verify each mandatory key signed in order
	validateKeysSignatures(
		chainID,
		mandatoryKeys,
		transaction.signatures.slice(1, mandatoryKeys.length + 1),
		transactionBytes,
		transaction.id,
	);

	// Verify each optional key signed in order
	validateKeysSignatures(
		chainID,
		optionalKeys,
		transaction.signatures.slice(mandatoryKeys.length + 1),
		transactionBytes,
		transaction.id,
	);
};

export const verifySingleSignatureTransaction = (
	transaction: Transaction,
	transactionBytes: Buffer,
	chainID: Buffer,
): void => {
	if (transaction.signatures.length !== 1) {
		throw new Error(
			`Transactions from a single signature account should have exactly one signature. Found ${transaction.signatures.length} signatures.`,
		);
	}

	verifyMessageSig(
		chainID,
		transaction.senderPublicKey,
		transaction.signatures[0],
		transactionBytes,
		transaction.id,
	);
};

export const verifySignatures = (
	transaction: Transaction,
	transactionBytes: Buffer,
	chainID: Buffer,
	account: AuthAccount,
) => {
	if (account.numberOfSignatures !== 0) {
		verifyMultiSignatureTransaction(
			chainID,
			transaction.id,
			account,
			transaction.signatures,
			transactionBytes,
		);
	} else {
		verifySingleSignatureTransaction(transaction, transactionBytes, chainID);
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
