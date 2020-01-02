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
 */

import {
	BaseTransaction,
	Status as TransactionStatus,
	TransactionResponse,
} from '@liskhq/lisk-transactions';

import { ExceptionOptions, WriteableTransactionResponse } from '../types';

const checkSenderPublicKeyException = (
	transactionResponse: TransactionResponse,
	_: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (
		!exceptions.senderPublicKey ||
		!exceptions.senderPublicKey.includes(transactionResponse.id)
	) {
		return false;
	}

	if (!(transactionResponse.errors.length > 1)) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.senderPublicKey') {
		return false;
	}

	return true;
};

const checkSignature = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (
		!exceptions.signatures ||
		!exceptions.signatures.includes(transaction.id)
	) {
		return false;
	}

	if (!(transactionResponse.errors.length > 1)) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.signature') {
		return false;
	}

	return true;
};

const checkSignSignature = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (
		!exceptions.signSignature ||
		!exceptions.signSignature.includes(transaction.id)
	) {
		return false;
	}

	if (!(transactionResponse.errors.length > 1)) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.signSignature') {
		return false;
	}

	return true;
};

const checkNullByte = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (
		!exceptions.transactionWithNullByte ||
		!exceptions.transactionWithNullByte.includes(transaction.id)
	) {
		return false;
	}

	if (transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.data') {
		return false;
	}

	return true;
};

const checkMultisig = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (
		!exceptions.multisignatures ||
		!exceptions.multisignatures.includes(transaction.id)
	) {
		return false;
	}

	if (transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.asset.min') {
		return false;
	}

	return true;
};

const checkVotes = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (!exceptions.votes || !exceptions.votes.includes(transaction.id)) {
		return false;
	}

	if (!(transactionResponse.errors.length > 1)) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.asset.votes') {
		return false;
	}

	return true;
};

const checkVoteTransactionAmount = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (!exceptions.votes || !exceptions.votes.includes(transaction.id)) {
		return false;
	}

	if (!(transactionResponse.errors.length > 1)) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.amount') {
		return false;
	}

	return true;
};

const checkRecipientLeadingZero = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (
		!exceptions.recipientLeadingZero ||
		!exceptions.recipientLeadingZero[transactionResponse.id]
	) {
		return false;
	}

	if (!(transactionResponse.errors.length > 1)) {
		return false;
	}
	if (transactionResponse.errors[0].dataPath !== '.recipientId') {
		return false;
	}

	if (
		exceptions.recipientLeadingZero[transactionResponse.id] !==
		// tslint:disable-next-line no-any
		(transaction.asset as any).recipientId
	) {
		return false;
	}

	return true;
};

const checkRecipientExceedingUint64 = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (
		!exceptions.recipientExceedingUint64 ||
		!exceptions.recipientExceedingUint64[transactionResponse.id]
	) {
		return false;
	}
	if (transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.recipientId') {
		return false;
	}

	if (
		exceptions.recipientExceedingUint64[transactionResponse.id] !==
		// tslint:disable-next-line no-any
		(transaction.asset as any).recipientId
	) {
		return false;
	}

	return true;
};

const checkDuplicateSignatures = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) => {
	if (
		!exceptions.duplicatedSignatures ||
		!exceptions.duplicatedSignatures[transaction.id]
	) {
		return false;
	}

	// In case of signatures, we have more than 1 error
	if (
		!transactionResponse.errors.every(error => error.dataPath === '.signatures')
	) {
		return false;
	}

	return true;
};

export const checkIfTransactionIsException = (
	transactionResponse: TransactionResponse,
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) =>
	[
		checkSenderPublicKeyException,
		checkDuplicateSignatures,
		checkSignature,
		checkSignSignature,
		checkVotes,
		checkRecipientLeadingZero,
		checkRecipientExceedingUint64,
		checkNullByte,
		checkMultisig,
		checkVoteTransactionAmount,
	]
		.map(fn => fn(transactionResponse, transaction, exceptions))
		.some(isException => isException);

export const checkIfTransactionIsInert = (
	transaction: BaseTransaction,
	exceptions: ExceptionOptions = {},
) =>
	exceptions.inertTransactions &&
	exceptions.inertTransactions.includes(transaction.id);

export const updateTransactionResponseForExceptionTransactions = (
	unprocessableTransactionResponses: TransactionResponse[],
	transactions: ReadonlyArray<BaseTransaction>,
	exceptions: ExceptionOptions,
) => {
	const unprocessableTransactionAndResponsePairs = unprocessableTransactionResponses.map(
		unprocessableTransactionResponse => ({
			transactionResponse: unprocessableTransactionResponse,
			transaction: transactions.find(
				transaction => transaction.id === unprocessableTransactionResponse.id,
			),
		}),
	);

	const exceptionTransactionsAndResponsePairs = unprocessableTransactionAndResponsePairs.filter(
		({ transactionResponse, transaction }) =>
			checkIfTransactionIsException(
				transactionResponse,
				transaction as BaseTransaction,
				exceptions,
			),
	);

	// Update the transaction response for exception transactions
	exceptionTransactionsAndResponsePairs.forEach(({ transactionResponse }) => {
		(transactionResponse as WriteableTransactionResponse).status =
			TransactionStatus.OK;
		(transactionResponse as WriteableTransactionResponse).errors = [];
	});
};
