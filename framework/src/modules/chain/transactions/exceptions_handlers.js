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

'use strict';

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');

const checkSenderPublicKeyException = (
	transactionResponse,
	_,
	exceptions = {},
) => {
	if (
		!exceptions.senderPublicKey ||
		!exceptions.senderPublicKey.includes(transactionResponse.id)
	) {
		return false;
	}

	if (!transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.senderPublicKey') {
		return false;
	}

	return true;
};

const checkSignature = (transactionResponse, transaction, exceptions = {}) => {
	if (
		!exceptions.signatures ||
		!exceptions.signatures.includes(transaction.id)
	) {
		return false;
	}

	if (!transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.signature') {
		return false;
	}

	return true;
};

const checkSignSignature = (
	transactionResponse,
	transaction,
	exceptions = {},
) => {
	if (
		!exceptions.signSignature ||
		!exceptions.signSignature.includes(transaction.id)
	) {
		return false;
	}

	if (!transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.signSignature') {
		return false;
	}

	return true;
};

const checkNullByte = (transactionResponse, transaction, exceptions = {}) => {
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

const checkMultisig = (transactionResponse, transaction, exceptions = {}) => {
	if (
		!exceptions.multisignatures ||
		!exceptions.multisignatures.includes(transaction.id)
	) {
		return false;
	}

	if (transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.asset.multisignature.min') {
		return false;
	}

	return true;
};

const checkVotes = (transactionResponse, transaction, exceptions = {}) => {
	if (!exceptions.votes || !exceptions.votes.includes(transaction.id)) {
		return false;
	}

	if (!transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.asset.votes') {
		return false;
	}

	return true;
};

const checkVoteTransactionAmount = (
	transactionResponse,
	transaction,
	exceptions = {},
) => {
	if (!exceptions.votes || !exceptions.votes.includes(transaction.id)) {
		return false;
	}

	if (!transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.amount') {
		return false;
	}

	return true;
};

const checkRecipientLeadingZero = (
	transactionResponse,
	transaction,
	exceptions = {},
) => {
	if (
		!exceptions.recipientLeadingZero ||
		!exceptions.recipientLeadingZero[transactionResponse.id]
	) {
		return false;
	}

	if (!transactionResponse.errors.length > 1) {
		return false;
	}

	if (transactionResponse.errors[0].dataPath !== '.recipientId') {
		return false;
	}

	if (
		exceptions.recipientLeadingZero[transactionResponse.id] !==
		transaction.recipientId
	) {
		return false;
	}

	return true;
};

const checkRecipientExceedingUint64 = (
	transactionResponse,
	transaction,
	exceptions = {},
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
		transaction.recipientId
	) {
		return false;
	}

	return true;
};

const checkDuplicateSignatures = (
	transactionResponse,
	transaction,
	exceptions = {},
) => {
	if (
		!exceptions.duplicatedSignatures ||
		!exceptions.duplicatedSignatures[transaction.id]
	) {
		return false;
	}

	// in case of signatures, we have more than 1 error
	if (
		!transactionResponse.errors.every(error => error.dataPath === '.signatures')
	) {
		return false;
	}

	return true;
};

const checkIfTransactionIsException = (
	transactionResponse,
	transaction,
	exceptions = {},
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

const checkIfTransactionIsInert = (transaction, exceptions = {}) =>
	exceptions.inertTransactions &&
	exceptions.inertTransactions.includes(transaction.id);

const updateTransactionResponseForExceptionTransactions = (
	unprocessableTransactionResponses,
	transactions,
	exceptions,
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
				transaction,
				exceptions,
			),
	);

	// Update the transaction response for exception transactions
	exceptionTransactionsAndResponsePairs.forEach(({ transactionResponse }) => {
		transactionResponse.status = TransactionStatus.OK;
		transactionResponse.errors = [];
	});
};

module.exports = {
	checkSenderPublicKeyException,
	checkSignature,
	checkSignSignature,
	checkDuplicateSignatures,
	checkMultisig,
	checkVotes,
	checkNullByte,
	checkIfTransactionIsException,
	checkIfTransactionIsInert,
	updateTransactionResponseForExceptionTransactions,
};
