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
import * as BigNum from '@liskhq/bignum';
import { MultisignatureStatus } from '../base_transaction';
import { TransactionError, TransactionPendingError } from '../errors';
import { Account } from '../transaction_types';
import { convertBeddowsToLSK } from '../utils/format';
import {
	validateMultisignatures,
	validateSignature,
} from './sign_and_validate';

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

export const verifySenderId = (
	id: string,
	sender: Account,
	address: string,
): TransactionError | undefined =>
	sender.address.toUpperCase() !== address.toUpperCase()
		? new TransactionError(
				'Invalid sender address',
				id,
				'.senderId',
				address.toUpperCase(),
				sender.address.toUpperCase(),
		  )
		: undefined;

export const verifyBalance = (
	id: string,
	account: Account,
	amount: BigNum,
): TransactionError | undefined =>
	new BigNum(account.balance).lt(new BigNum(amount))
		? new TransactionError(
				`Account does not have enough LSK: ${
					account.address
				}, balance: ${convertBeddowsToLSK(account.balance.toString())}`,
				id,
				'.balance',
		  )
		: undefined;

export const verifyAmountBalance = (
	id: string,
	account: Account,
	amount: BigNum,
	fee: BigNum,
): TransactionError | undefined => {
	const balance = new BigNum(account.balance);
	if (balance.gte(0) && balance.lt(new BigNum(amount))) {
		return new TransactionError(
			`Account does not have enough LSK: ${
				account.address
			}, balance: ${convertBeddowsToLSK(balance.plus(fee).toString())}`,
			id,
			'.balance',
		);
	}

	return undefined;
};

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

const isMultisignatureAccount = (account: Account): boolean =>
	!!(
		account.membersPublicKeys &&
		account.membersPublicKeys.length > 0 &&
		account.multiMin
	);

export const verifyMultiSignatures = (
	id: string,
	sender: Account,
	signatures: ReadonlyArray<string>,
	transactionBytes: Buffer,
): VerifyMultiSignatureResult => {
	if (!isMultisignatureAccount(sender) && signatures.length > 0) {
		return {
			status: MultisignatureStatus.FAIL,
			errors: [
				new TransactionError(
					'Sender is not a multisignature account',
					id,
					'.signatures',
				),
			],
		};
	}

	if (!isMultisignatureAccount(sender)) {
		return {
			status: MultisignatureStatus.NONMULTISIGNATURE,
			errors: [],
		};
	}

	const { valid, errors } = validateMultisignatures(
		sender.membersPublicKeys as ReadonlyArray<string>,
		signatures,
		sender.multiMin as number,
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
