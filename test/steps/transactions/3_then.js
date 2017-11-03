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
import {
	getNumbers,
	getTransactionCreatorFunctionNameByType,
} from '../utils';

export function itShouldHaveAFunctionForCreatingATypeTransaction() {
	const { transactionsObject } = this.test.ctx;
	const transactionType = getNumbers(this.test.title)[0];
	const transactionFunctionName = getTransactionCreatorFunctionNameByType(transactionType);
	return (transactionsObject).should.have.key(transactionFunctionName).and.be.type('function');
}

export function itShouldCreateARegisterSecondPassphraseTransactionUsingThePassphraseAndTheSecondPassphrase() {
	const { passphrase, secondPassphrase } = this.test.ctx;
	return (transactions.createSignature).should.be.calledWith(passphrase, secondPassphrase);
}

export function itShouldResolveToTheCreatedTransaction() {
	const { returnValue, createdTransaction } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(createdTransaction);
}

export function itShouldCreateARegisterDelegateTransactionUsingThePassphraseTheDelegateUsernameAndTheSecondPassphrase() {
	const { passphrase, delegateUsername, secondPassphrase } = this.test.ctx;
	return (transactions.createDelegate).should.be.calledWithExactly(passphrase, delegateUsername, secondPassphrase);
}

export function itShouldCreateARegisterDelegateTransactionUsingThePassphraseAndTheDelegateUsername() {
	const { passphrase, delegateUsername } = this.test.ctx;
	return (transactions.createDelegate).should.be.calledWithExactly(passphrase, delegateUsername, null);
}

export function itShouldCreateACreateMultisignatureAccountTransactionUsingThePassphraseTheSecondPassphraseTheKeysgroupTheLifetimeAndTheMinimumOfSignatures() {
	const { passphrase, secondPassphrase, keysgroup, lifetime, minimum } = this.test.ctx;
	return (transactions.createMultisignature).should.be.calledWithExactly(passphrase, secondPassphrase, keysgroup, lifetime, minimum);
}

export function itShouldCreateACreateMultisignatureAccountTransactionUsingThePassphraseTheKeysgroupTheLifetimeAndTheMinimumOfSignatures() {
	const { passphrase, keysgroup, lifetime, minimum } = this.test.ctx;
	return (transactions.createMultisignature).should.be.calledWithExactly(passphrase, null, keysgroup, lifetime, minimum);
}
