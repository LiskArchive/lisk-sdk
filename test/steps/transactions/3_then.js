/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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

export function itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysAddedToUnvotes() {
	const { passphrase, secondPassphrase, unvotePublicKeys } = this.test.ctx;
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		votes: [],
		unvotes: unvotePublicKeys,
		secondPassphrase,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysAddedToVotes() {
	const { passphrase, secondPassphrase, votePublicKeys } = this.test.ctx;
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		votes: votePublicKeys,
		unvotes: [],
		secondPassphrase,
	});
}

export function itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysToCorrespondingVoteKeys() {
	const { passphrase, votePublicKeys, unvotePublicKeys } = this.test.ctx;
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		votes: votePublicKeys,
		unvotes: unvotePublicKeys,
		secondPassphrase: null,
	});
}

export function itShouldCreateACastVotesTransactionWithThePublicKeysAddedToVotes() {
	const { votePublicKeys } = this.test.ctx;
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase: null,
		votes: votePublicKeys,
		unvotes: [],
		secondPassphrase: null,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToUnvotes() {
	const { passphrase, unvotePublicKeys } = this.test.ctx;
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		votes: [],
		unvotes: unvotePublicKeys,
		secondPassphrase: null,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToVotes() {
	const { passphrase, votePublicKeys } = this.test.ctx;
	return expect(transactions.castVotes).to.be.calledWithExactly({
		passphrase,
		votes: votePublicKeys,
		unvotes: [],
		secondPassphrase: null,
	});
}

export function itShouldCreateATransferTransactionUsingTheAddressAndTheNormalizedAmount() {
	const { address, normalizedAmount } = this.test.ctx;
	return expect(transactions.transfer).to.be.calledWithExactly({
		recipientId: address,
		amount: normalizedAmount,
		passphrase: null,
		secondPassphrase: null,
	});
}

export function itShouldCreateATransferTransactionUsingTheAddressTheNormalizedAmountThePassphraseAndTheSecondPassphrase() {
	const {
		passphrase,
		secondPassphrase,
		address,
		normalizedAmount,
	} = this.test.ctx;
	return expect(transactions.transfer).to.be.calledWithExactly({
		recipientId: address,
		amount: normalizedAmount,
		passphrase,
		secondPassphrase,
	});
}

export function itShouldCreateATransferTransactionUsingTheAddressTheNormalizedAmountAndThePassphrase() {
	const { passphrase, address, normalizedAmount } = this.test.ctx;
	return expect(transactions.transfer).to.be.calledWithExactly({
		recipientId: address,
		amount: normalizedAmount,
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

export function itShouldCallVerifyTransactionWithTheTransaction() {
	const { transaction } = this.test.ctx;
	return expect(transactions.utils.verifyTransaction).to.be.calledWithExactly(
		JSON.parse(transaction),
		null,
	);
}

export function itShouldCallPrepareTransactionWithTheTransactionAndThePassphrase() {
	const { transaction, passphrase } = this.test.ctx;
	return expect(transactions.utils.prepareTransaction).to.be.calledWithExactly(
		JSON.parse(transaction),
		passphrase,
		null,
	);
}

export function itShouldCallPrepareTransactionWithTheTransactionAndThePassphraseAndTheSecondPassphrase() {
	const { transaction, passphrase, secondPassphrase } = this.test.ctx;
	return expect(transactions.utils.prepareTransaction).to.be.calledWithExactly(
		JSON.parse(transaction),
		passphrase,
		secondPassphrase,
	);
}

export function itShouldCallVerifyTransactionWithTheTransactionAndSecondPublicKey() {
	const { transaction, options } = this.test.ctx;
	return expect(transactions.utils.verifyTransaction).to.be.calledWithExactly(
		JSON.parse(transaction),
		options['second-public-key'],
	);
}

export function itShouldCallVerifyTransactionWithTheTransactionAndSecondPublicKeySuppliedByData() {
	const { transaction, data } = this.test.ctx;
	return expect(transactions.utils.verifyTransaction).to.be.calledWithExactly(
		JSON.parse(transaction),
		data,
	);
}

export function itShouldResolveToResultOfSuccessfullyVerifyingTransaction() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue).to.eventually.eql({
		verified: true,
	});
}
