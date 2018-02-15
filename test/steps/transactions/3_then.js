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
	return transactions.castVotes.should.be.calledWithExactly({
		passphrase,
		delegates: unvotes,
		secondPassphrase,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAPlus() {
	const { passphrase, secondPassphrase, votePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	return transactions.castVotes.should.be.calledWithExactly({
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
	return transactions.castVotes.should.be.calledWithExactly({
		passphrase,
		delegates: allVotes,
		secondPassphrase: null,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysPrependedWithAMinus() {
	const { passphrase, unvotePublicKeys } = this.test.ctx;
	const unvotes = prependMinusToPublicKeys(unvotePublicKeys);
	return transactions.castVotes.should.be.calledWithExactly({
		passphrase,
		delegates: unvotes,
		secondPassphrase: null,
	});
}

export function itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysPrependedWithAPlus() {
	const { passphrase, votePublicKeys } = this.test.ctx;
	const votes = prependPlusToPublicKeys(votePublicKeys);
	return transactions.castVotes.should.be.calledWithExactly({
		passphrase,
		delegates: votes,
		secondPassphrase: null,
	});
}

export function itShouldCreateATransferTransactionUsingTheAddressTheAmountThePassphraseAndTheSecondPassphrase() {
	const { passphrase, secondPassphrase, address, amount } = this.test.ctx;
	return transactions.transfer.should.be.calledWithExactly({
		recipientId: address,
		amount,
		passphrase,
		secondPassphrase,
	});
}

export function itShouldCreateATransferTransactionUsingTheAddressTheAmountAndThePassphrase() {
	const { passphrase, address, amount } = this.test.ctx;
	return transactions.transfer.should.be.calledWithExactly({
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
	return transactionsObject.should.have
		.property(transactionFunctionName)
		.and.be.a('function');
}

export function itShouldCreateARegisterSecondPassphraseTransactionUsingThePassphraseAndTheSecondPassphrase() {
	const { passphrase, secondPassphrase } = this.test.ctx;
	return transactions.registerSecondPassphrase.should.be.calledWithExactly({
		passphrase,
		secondPassphrase,
	});
}

export function itShouldResolveToTheCreatedTransaction() {
	const { returnValue, createdTransaction } = this.test.ctx;
	return returnValue.should.eventually.eql(createdTransaction);
}

export function itShouldCreateARegisterDelegateTransactionUsingThePassphraseAndTheDelegateUsername() {
	const { passphrase, delegateUsername } = this.test.ctx;
	return transactions.registerDelegate.should.be.calledWithExactly({
		passphrase,
		username: delegateUsername,
		secondPassphrase: null,
	});
}

export function itShouldCreateARegisterDelegateTransactionUsingThePassphraseTheSecondPassphraseAndTheDelegateUsername() {
	const { passphrase, secondPassphrase, delegateUsername } = this.test.ctx;
	return transactions.registerDelegate.should.be.calledWithExactly({
		passphrase,
		username: delegateUsername,
		secondPassphrase,
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
	const publicKeysWithPlus = keysgroup.map(publicKey => {
		return `+${publicKey}`;
	});
	return transactions.registerMultisignature.should.be.calledWithExactly({
		passphrase,
		secondPassphrase,
		keysgroup: publicKeysWithPlus,
		lifetime,
		minimum,
	});
}

export function itShouldCreateARegisterMultisignatureAccountTransactionUsingThePassphraseTheKeysgroupTheLifetimeAndTheMinimumNumberOfSignatures() {
	const { passphrase, keysgroup, lifetime, minimum } = this.test.ctx;
	const publicKeysWithPlus = keysgroup.map(publicKey => {
		return `+${publicKey}`;
	});
	return transactions.registerMultisignature.should.be.calledWithExactly({
		passphrase,
		secondPassphrase: null,
		keysgroup: publicKeysWithPlus,
		lifetime,
		minimum,
	});
}
