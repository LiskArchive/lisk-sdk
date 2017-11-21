/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import transactions from '../../../src/utils/transactions';
import { getNumbers, getTransactionCreatorFunctionNameByType } from '../utils';
import {
	prependPlusToPublicKeys,
	prependMinusToPublicKeys,
} from '../../../src/utils/helpers';

export function itShouldCreateACastVoteTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithTheCorrectModifier() {
	const {
		passphrase,
		secondPassphrase,
		votePublicKeys,
		unvotePublicKeys,
	} = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	const unvotes = prependMinusToPublicKeys(unvotePublicKeys);
	const allVotes = [...votes, ...unvotes];
	return transactions.createVote.should.be.calledWithExactly(
		passphrase,
		allVotes,
		secondPassphrase,
	);
}

export function itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAMinus() {
	const { passphrase, secondPassphrase, unvotePublicKeys } = this.test.ctx;
	const unvotes = prependMinusToPublicKeys(unvotePublicKeys);
	return transactions.createVote.should.be.calledWithExactly(
		passphrase,
		unvotes,
		secondPassphrase,
	);
}

export function itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAPlus() {
	const { passphrase, secondPassphrase, votePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	return transactions.createVote.should.be.calledWithExactly(
		passphrase,
		votes,
		secondPassphrase,
	);
}

export function itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithTheCorrectModifier() {
	const { passphrase, votePublicKeys, unvotePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	const unvotes = prependMinusToPublicKeys(unvotePublicKeys);
	const allVotes = [...votes, ...unvotes];
	return transactions.createVote.should.be.calledWithExactly(
		passphrase,
		allVotes,
		null,
	);
}

export function itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysPrependedWithAMinus() {
	const { passphrase, unvotePublicKeys } = this.test.ctx;
	const unvotes = prependMinusToPublicKeys(unvotePublicKeys);
	return transactions.createVote.should.be.calledWithExactly(
		passphrase,
		unvotes,
		null,
	);
}

export function itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysPrependedWithAPlus() {
	const { passphrase, votePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	return transactions.createVote.should.be.calledWithExactly(
		passphrase,
		votes,
		null,
	);
}

export function itShouldCreateATransferTransactionUsingTheAddressTheAmountThePassphraseAndTheSecondPassphrase() {
	const { passphrase, secondPassphrase, address, amount } = this.test.ctx;
	return transactions.transfer.should.be.calledWithExactly(
		address,
		amount,
		passphrase,
		secondPassphrase,
	);
}

export function itShouldCreateATransferTransactionUsingTheAddressTheAmountAndThePassphrase() {
	const { passphrase, address, amount } = this.test.ctx;
	return transactions.transfer.should.be.calledWithExactly(
		address,
		amount,
		passphrase,
		null,
	);
}

export function itShouldHaveAFunctionForCreatingATypeTransaction() {
	const { transactionsObject } = this.test.ctx;
	const transactionType = getNumbers(this.test.title)[0];
	const transactionFunctionName = getTransactionCreatorFunctionNameByType(
		transactionType,
	);
	return transactionsObject.should.have
		.key(transactionFunctionName)
		.and.be.type('function');
}

export function itShouldCreateARegisterSecondPassphraseTransactionUsingThePassphraseAndTheSecondPassphrase() {
	const { passphrase, secondPassphrase } = this.test.ctx;
	return transactions.registerSecondPassphrase.should.be.calledWith(
		passphrase,
		secondPassphrase,
	);
}

export function itShouldResolveToTheCreatedTransaction() {
	const { returnValue, createdTransaction } = this.test.ctx;
	return returnValue.should.be.fulfilledWith(createdTransaction);
}

export function itShouldCreateARegisterDelegateTransactionUsingThePassphraseAndTheDelegateUsername() {
	const { passphrase, delegateUsername } = this.test.ctx;
	return transactions.registerDelegate.should.be.calledWithExactly(
		passphrase,
		delegateUsername,
		null,
	);
}

export function itShouldCreateARegisterDelegateTransactionUsingThePassphraseTheSecondPassphraseAndTheDelegateUsername() {
	const { passphrase, secondPassphrase, delegateUsername } = this.test.ctx;
	return transactions.registerDelegate.should.be.calledWithExactly(
		passphrase,
		delegateUsername,
		secondPassphrase,
	);
}

export function itShouldCreateACreateMultisignatureAccountTransactionUsingThePassphraseTheSecondPassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures() {
	const {
		passphrase,
		secondPassphrase,
		keysgroup,
		lifetime,
		minimum,
	} = this.test.ctx;
	const publicKeysWithPlus = keysgroup.map(publicKey => {
		return `+${publicKey}`;
	});
	return transactions.registerMultisignature.should.be.calledWithExactly(
		passphrase,
		secondPassphrase,
		publicKeysWithPlus,
		lifetime,
		minimum,
	);
}

export function itShouldCreateACreateMultisignatureAccountTransactionUsingThePassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures() {
	const { passphrase, keysgroup, lifetime, minimum } = this.test.ctx;
	const publicKeysWithPlus = keysgroup.map(publicKey => {
		return `+${publicKey}`;
	});
	return transactions.registerMultisignature.should.be.calledWithExactly(
		passphrase,
		null,
		publicKeysWithPlus,
		lifetime,
		minimum,
	);
}
