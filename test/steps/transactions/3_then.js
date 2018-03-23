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

export function itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAMinus() {
	const { passphrase, secondPassphrase, unvotePublicKeys } = this.test.ctx;
	const unvotes = prependMinusToPublicKeys(unvotePublicKeys);
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		delegates: unvotes,
		secondPassphrase,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAPlus() {
	const { passphrase, secondPassphrase, votePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		delegates: votes,
		secondPassphrase,
	});
}

export function itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithTheCorrectModifier() {
	const { passphrase, votePublicKeys, unvotePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	const unvotes = prependMinusToPublicKeys(unvotePublicKeys);
	const allVotes = [...votes, ...unvotes];
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		delegates: allVotes,
		secondPassphrase: null,
	});
}

export function itShouldCreateACastVotesTransactionWithThePublicKeysPrependedWithAPlus() {
	const { votePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase: null,
		delegates: votes,
		secondPassphrase: null,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysPrependedWithAMinus() {
	const { passphrase, unvotePublicKeys } = this.test.ctx;
	const unvotes = prependMinusToPublicKeys(unvotePublicKeys);
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		delegates: unvotes,
		secondPassphrase: null,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysPrependedWithAPlus() {
	const { passphrase, votePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		delegates: votes,
		secondPassphrase: null,
	});
}

export function itShouldCreateATransferTransactionUsingTheAddressAndTheAmount() {
	const { address, amount } = this.test.ctx;
	return expect(transactions.transfer).to.be.calledWithExactly({
		recipientId: address,
		amount,
		passphrase: null,
		secondPassphrase: null,
	});
}

export function itShouldCreateATransferTransactionUsingTheAddressTheAmountThePassphraseAndTheSecondPassphrase() {
	const { passphrase, secondPassphrase, address, amount } = this.test.ctx;
	return expect(transactions.transfer).to.be.calledWithExactly({
		recipientId: address,
		amount,
		passphrase,
		secondPassphrase,
	});
}

export function itShouldCreateATransferTransactionUsingTheAddressTheAmountAndThePassphrase() {
	const { passphrase, address, amount } = this.test.ctx;
	return expect(transactions.transfer).to.be.calledWithExactly({
		recipientId: address,
		amount,
		passphrase,
		secondPassphrase: null,
	});
}

export function itShouldHaveAFunctionForCreatingATypeTransaction() {
	const { transactionsObject } = this.test.ctx;
	const transactionType = getNumbers(this.test.title)[0];
	const transactionFunctionName = getTransactionCreatorFunctionNameByType(
		transactionType,
	);
	return expect(transactionsObject)
		.to.have.property(transactionFunctionName)
		.and.be.a('function');
}

export function itShouldCreateARegisterSecondPassphraseTransactionUsingTheSecondPassphrase() {
	const { secondPassphrase } = this.test.ctx;
	return expect(transactions.registerSecondPassphrase).to.be.calledWithExactly({
		passphrase: null,
		secondPassphrase,
	});
}

export function itShouldCreateARegisterSecondPassphraseTransactionUsingThePassphraseAndTheSecondPassphrase() {
	const { passphrase, secondPassphrase } = this.test.ctx;
	return expect(transactions.registerSecondPassphrase).to.be.calledWithExactly({
		passphrase,
		secondPassphrase,
	});
}

export function itShouldResolveToTheCreatedTransaction() {
	const { returnValue, createdTransaction } = this.test.ctx;
	return expect(returnValue).to.eventually.equal(createdTransaction);
}

export function itShouldCreateARegisterDelegateTransactionUsingThePassphraseAndTheDelegateUsername() {
	const { passphrase, delegateUsername } = this.test.ctx;
	return expect(transactions.registerDelegate).to.be.calledWithExactly({
		passphrase,
		username: delegateUsername,
		secondPassphrase: null,
	});
}

export function itShouldCreateARegisterDelegateTransactionUsingTheDelegateUsername() {
	const { delegateUsername } = this.test.ctx;
	return expect(transactions.registerDelegate).to.be.calledWithExactly({
		passphrase: null,
		username: delegateUsername,
		secondPassphrase: null,
	});
}

export function itShouldCreateARegisterDelegateTransactionUsingThePassphraseTheSecondPassphraseAndTheDelegateUsername() {
	const { passphrase, secondPassphrase, delegateUsername } = this.test.ctx;
	return expect(transactions.registerDelegate).to.be.calledWithExactly({
		passphrase,
		username: delegateUsername,
		secondPassphrase,
	});
}

export function itShouldCreateARegisterMultisignatureAccountTransactionUsingTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures() {
	const { keysgroup, lifetime, minimum } = this.test.ctx;
	return expect(transactions.registerMultisignature).to.be.calledWithExactly({
		passphrase: null,
		secondPassphrase: null,
		keysgroup,
		lifetime,
		minimum,
	});
}

export function itShouldCreateARegisterMultisignatureAccountTransactionUsingThePassphraseTheSecondPassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures() {
	const {
		passphrase,
		secondPassphrase,
		keysgroup,
		lifetime,
		minimum,
	} = this.test.ctx;
	return expect(transactions.registerMultisignature).to.be.calledWithExactly({
		passphrase,
		secondPassphrase,
		keysgroup,
		lifetime,
		minimum,
	});
}

export function itShouldCreateARegisterMultisignatureAccountTransactionUsingThePassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures() {
	const { passphrase, keysgroup, lifetime, minimum } = this.test.ctx;
	return expect(transactions.registerMultisignature).to.be.calledWithExactly({
		passphrase,
		secondPassphrase: null,
		keysgroup,
		lifetime,
		minimum,
	});
}
