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

require('../../functional');
const Promise = require('bluebird');
const {
	transfer,
	registerDelegate,
	DelegateTransaction,
} = require('@liskhq/lisk-transactions');
const phases = require('../../../common/phases');
const accountFixtures = require('../../../fixtures/accounts');
const apiHelpers = require('../../../common/helpers/api');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');
const common = require('./common');
const { getNetworkIdentifier } = require('../../../common/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const { FEES } = global.constants;
const { NORMALIZER } = global.__testContext.config;

const sendTransactionPromise = apiHelpers.sendTransactionPromise;

const specialChar = '❤';
const nullChar1 = '\0';
const nullChar2 = '\x00';
const nullChar3 = '\u0000';
const nullChar4 = '\\U00000000';

describe('POST /api/transactions (type 2) register delegate', () => {
	let transaction;
	const transactionsToWaitFor = [];
	const badTransactions = [];
	const goodTransactions = [];
	const badTransactionsEnforcement = [];
	const goodTransactionsEnforcement = [];

	const account = randomUtil.account();
	const accountNoFunds = randomUtil.account();
	const accountMinimalFunds = randomUtil.account();
	const accountUpperCase = randomUtil.account();
	const accountFormerDelegate = randomUtil.account();

	// Crediting accounts
	before(() => {
		const transactions = [];
		const transaction1 = transfer({
			networkIdentifier,
			amount: (1000 * NORMALIZER).toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: account.address,
		});
		const transaction2 = transfer({
			networkIdentifier,
			amount: FEES.DELEGATE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMinimalFunds.address,
		});
		const transaction3 = transfer({
			networkIdentifier,
			amount: FEES.DELEGATE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountUpperCase.address,
		});
		const transaction4 = transfer({
			networkIdentifier,
			amount: FEES.DELEGATE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountFormerDelegate.address,
		});
		transactions.push(transaction1);
		transactions.push(transaction2);
		transactions.push(transaction3);
		transactions.push(transaction4);

		const promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));
		promises.push(sendTransactionPromise(transaction3));
		promises.push(sendTransactionPromise(transaction4));

		return Promise.all(promises).then(results => {
			results.forEach((res, index) => {
				transactionsToWaitFor.push(transactions[index].id);
			});
			return waitFor.confirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', () => {
		common.invalidAssets('username', badTransactions);
	});

	describe('transactions processing', () => {
		it('with no funds should fail', async () => {
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: accountNoFunds.passphrase,
				username: accountNoFunds.username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Account does not have enough LSK: ${accountNoFunds.address}, balance: 0`,
				);
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', async () => {
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: accountMinimalFunds.passphrase,
				username: accountMinimalFunds.username,
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('using blank username should fail', async () => {
			const tx = new DelegateTransaction({
				networkIdentifier,
				asset: {
					username: '',
				},
			});
			tx.sign(account.passphrase);
			transaction = tx.toJSON();

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					"'.username' should NOT be shorter than 1 characters",
				);
				badTransactions.push(transaction);
			});
		});

		it('using invalid username should fail', async () => {
			const username = '~!@#$ %^&*()_+.,?/';
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'\'.username\' should match format "username"',
				);
				badTransactions.push(transaction);
			});
		});

		it('with specialChar should fail', () => {
			const username = `lorem${specialChar}`;
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'\'.username\' should match format "username"',
				);
				badTransactions.push(transaction);
			});
		});

		it('with nullChar1 should fail', () => {
			const username = `lorem${nullChar1}`;
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'\'.username\' should match format "username"',
				);
				badTransactions.push(transaction);
			});
		});

		it('with nullChar2 should fail', () => {
			const username = `lorem${nullChar2}`;
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'\'.username\' should match format "username"',
				);
				badTransactions.push(transaction);
			});
		});

		it('with nullChar3 should fail', () => {
			const username = `lorem${nullChar3}`;
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'\'.username\' should match format "username"',
				);
				badTransactions.push(transaction);
			});
		});

		it('with nullChar4 should fail', () => {
			const username = `lorem${nullChar4}`;
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'\'.username\' should match format "username"',
				);
				badTransactions.push(transaction);
			});
		});

		it('using username longer than 20 characters should fail', () => {
			const delegateName = `${randomUtil.delegateName()}x`;
			const tx = new DelegateTransaction({
				networkIdentifier,
				asset: {
					username: delegateName,
				},
			});
			tx.sign(account.passphrase);
			transaction = tx.toJSON();

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					"'.username' should NOT be longer than 20 characters",
				);
				badTransactions.push(transaction);
			});
		});

		it('using uppercase username should fail', async () => {
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: accountUpperCase.passphrase,
				username: accountUpperCase.username.toUpperCase(),
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'\'.username\' should match format "username"',
				);
				badTransactions.push(transaction);
			});
		});

		it('using network identifier from different network should fail', async () => {
			const networkIdentifierOtherNetwork =
				'91a254dc30db5eb1ce4001acde35fd5a14d62584f886d30df161e4e883220eb1';
			const transactionFromDifferentNetwork = registerDelegate({
				networkIdentifier: networkIdentifierOtherNetwork,
				passphrase: account.passphrase,
				username: account.username,
			});

			return sendTransactionPromise(
				transactionFromDifferentNetwork,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.errors[0].message).to.include(
					`Failed to validate signature ${transactionFromDifferentNetwork.signature}`,
				);
				badTransactions.push(transactionFromDifferentNetwork);
			});
		});

		it('using valid params should be ok', async () => {
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username: account.username,
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});

	describe('validation', () => {
		it('setting same delegate twice should fail', async () => {
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username: account.username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'Username is not unique.',
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('using existing username should fail', async () => {
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: accountFormerDelegate.passphrase,
				username: account.username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'Username is not unique.',
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('updating registered delegate should fail', async () => {
			transaction = registerDelegate({
				networkIdentifier,
				passphrase: account.passphrase,
				username: 'newusername',
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'Account is already a delegate',
				);
				badTransactionsEnforcement.push(transaction);
			});
		});
	});

	describe('confirm validation', () => {
		phases.confirmation(
			goodTransactionsEnforcement,
			badTransactionsEnforcement,
		);
	});
});
