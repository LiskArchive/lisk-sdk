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
 */

'use strict';

const checkSenderPublicKeyException = (exceptions, transactionResponse) => {
	if (!exceptions.senderPublicKey.includes(transactionResponse.id)) {
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

const checkSignature = (exceptions, transactionResponse, transaction) => {
	if (!exceptions.signatures.includes(transaction.id)) {
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

const checkSignSignature = (exceptions, transactionResponse, transaction) => {
	if (!exceptions.signSignature.includes(transaction.id)) {
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

const checkNullByte = (exceptions, transactionResponse, transaction) => {
	if (!exceptions.transactionWithNullByte.includes(transaction.id)) {
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

const checkMultisig = (exceptions, transactionResponse, transaction) => {
	if (!exceptions.multisignatures.includes(transaction.id)) {
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

const checkVotes = (exceptions, transactionResponse, transaction) => {
	if (!exceptions.votes.includes(transaction.id)) {
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
	exceptions,
	transactionResponse,
	transaction
) => {
	if (!exceptions.votes.includes(transaction.id)) {
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
	exceptions,
	transactionResponse,
	transaction
) => {
	if (!exceptions.recipientLeadingZero[transactionResponse.id]) {
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
	exceptions,
	transactionResponse,
	transaction
) => {
	if (!exceptions.recipientExceedingUint64[transactionResponse.id]) {
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
	exceptions,
	transactionResponse,
	transaction
) => {
	if (!exceptions.duplicatedSignatures[transaction.id]) {
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
	exceptions,
	transactionResponse,
	transaction
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
		.map(fn => fn(exceptions, transactionResponse, transaction))
		.some(isException => isException);

const checkIfTransactionIsInert = (exceptions, transaction) =>
	exceptions.inertTransactions.includes(transaction.id);

module.exports = {
	checkIfTransactionIsException,
	checkIfTransactionIsInert,
};
