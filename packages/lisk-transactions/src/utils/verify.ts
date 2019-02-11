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
import * as BigNum from 'browserify-bignum';
import { TransactionError, TransactionPendingError } from '../errors';
import { Account } from '../transaction_types';
import { MultisignatureStatus } from '../transactions/base';
import { convertBeddowsToLSK } from '../utils/format';
import {
	validateMultisignatures,
	validateSignature,
} from '../utils/sign_and_verify';

export const verifySenderPublicKey = (
	id: string,
	sender: Account,
	publicKey: string,
): TransactionError | undefined =>
	sender.publicKey !== publicKey
		? new TransactionError('Invalid sender publicKey', id, '.senderPublicKey')
		: undefined;

export const verifySenderId = (
	id: string,
	sender: Account,
	address: string,
): TransactionError | undefined =>
	sender.address.toUpperCase() !== address.toUpperCase()
		? new TransactionError('Invalid sender address', id, '.senderId')
		: undefined;

export const verifyBalance = (
	id: string,
	sender: Account,
	amount: BigNum,
): TransactionError | undefined =>
	new BigNum(sender.balance).lt(new BigNum(amount))
		? new TransactionError(
				`Account does not have enough LSK: ${
					sender.address
				}, balance: ${convertBeddowsToLSK(sender.balance.toString())}`,
				id,
				'.balance',
		  )
		: undefined;

export const verifySecondSignature = (
	id: string,
	sender: Account,
	signSignature: string | undefined,
	transactionBytes: Buffer,
): TransactionError | undefined => {
	if (!sender.secondPublicKey && signSignature) {
		return new TransactionError(
			'Sender does not have a secondPublicKey',
			id,
			'.signSignature',
		);
	}
	if (!sender.secondPublicKey) {
		return undefined;
	}
	if (!signSignature) {
		return new TransactionError('Missing signSignature', id, '.signSignature');
	}
	const { valid, error } = validateSignature(
		sender.secondPublicKey,
		signSignature,
		transactionBytes,
		id,
	);
	if (valid) {
		return undefined;
	}

	return error;
};

interface VerifyMultiSignatureResult {
	readonly status: MultisignatureStatus;
	readonly errors: ReadonlyArray<TransactionError>;
}

export const verifyMultiSignatures = (
	id: string,
	sender: Account,
	signatures: ReadonlyArray<string>,
	transactionBytes: Buffer,
): VerifyMultiSignatureResult => {
	if (
		!(
			sender.multisignatures &&
			sender.multisignatures.length > 0 &&
			sender.multimin
		)
	) {
		return {
			status: MultisignatureStatus.NONMULTISIGNATURE,
			errors: [],
		};
	}

	const { valid, errors } = validateMultisignatures(
		sender.multisignatures,
		signatures,
		sender.multimin,
		transactionBytes,
		id,
	);

	if (valid) {
		return {
			status: MultisignatureStatus.READY,
			errors: [],
		};
	}

	if (
		errors &&
		errors.length === 1 &&
		errors[0] instanceof TransactionPendingError
	) {
		return {
			status: MultisignatureStatus.PENDING,
			errors,
		};
	}

	return {
		status: MultisignatureStatus.FAIL,
		errors: errors || [],
	};
};
