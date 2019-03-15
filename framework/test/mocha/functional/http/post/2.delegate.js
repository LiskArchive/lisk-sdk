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

require('../../functional');
const Promise = require('bluebird');
const Bignum = require('bignumber.js');
const {
	transfer,
	registerDelegate,
	utils: transactionUtils,
} = require('@liskhq/lisk-transactions');
const phases = require('../../../common/phases');
const accountFixtures = require('../../../fixtures/accounts');
const apiHelpers = require('../../../common/helpers/api');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');
const common = require('./common');

const { FEES, NORMALIZER } = global.constants;

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
			amount: (1000 * NORMALIZER).toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: account.address,
		});
		const transaction2 = transfer({
			amount: FEES.DELEGATE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMinimalFunds.address,
		});
		const transaction3 = transfer({
			amount: FEES.DELEGATE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountUpperCase.address,
		});
		const transaction4 = transfer({
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
		common.invalidAssets('delegate', badTransactions);
	});

	describe('transactions processing', () => {
		it('with no funds should fail', async () => {
			transaction = registerDelegate({
				passphrase: accountNoFunds.passphrase,
				username: accountNoFunds.username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Account does not have enough LSK: ${
						accountNoFunds.address
					} balance: 0`
				);
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', async () => {
			transaction = registerDelegate({
				passphrase: accountMinimalFunds.passphrase,
				username: accountMinimalFunds.username,
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('using blank username should fail', async () => {
			// TODO: Remove signRawTransaction on lisk-transactions 3.0.0
			transaction = transactionUtils.signRawTransaction({
				transaction: {
					type: 2,
					amount: '0',
					fee: new Bignum(FEES.DELEGATE).toString(),
					asset: {
						delegate: {
							username: '',
						},
					},
				},
				passphrase: account.passphrase,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Username is undefined');
				badTransactions.push(transaction);
			});
		});

		it('using invalid username should fail', async () => {
			const username = '~!@#$ %^&*()_+.,?/';
			transaction = registerDelegate({
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate delegate schema: Object didn't pass validation for format username: ${username}`
				);
				badTransactions.push(transaction);
			});
		});

		it('with specialChar should fail', () => {
			const username = `lorem${specialChar}`;
			transaction = registerDelegate({
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate delegate schema: Object didn't pass validation for format username: ${username}`
				);
				badTransactions.push(transaction);
			});
		});

		it('with nullChar1 should fail', () => {
			const username = `lorem${nullChar1}`;
			transaction = registerDelegate({
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate delegate schema: Object didn't pass validation for format username: ${username}`
				);
				badTransactions.push(transaction);
			});
		});

		it('with nullChar2 should fail', () => {
			const username = `lorem${nullChar2}`;
			transaction = registerDelegate({
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate delegate schema: Object didn't pass validation for format username: ${username}`
				);
				badTransactions.push(transaction);
			});
		});

		it('with nullChar3 should fail', () => {
			const username = `lorem${nullChar3}`;
			transaction = registerDelegate({
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate delegate schema: Object didn't pass validation for format username: ${username}`
				);
				badTransactions.push(transaction);
			});
		});

		it('with nullChar4 should fail', () => {
			const username = `lorem${nullChar4}`;
			transaction = registerDelegate({
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate delegate schema: Object didn't pass validation for format username: ${username}`
				);
				badTransactions.push(transaction);
			});
		});

		it('using username longer than 20 characters should fail', () => {
			const delegateName = `${randomUtil.delegateName()}x`;
			// TODO: Remove signRawTransaction on lisk-transactions 3.0.0
			transaction = transactionUtils.signRawTransaction({
				transaction: {
					type: 2,
					amount: '0',
					fee: new Bignum(FEES.DELEGATE).toString(),
					asset: {
						delegate: {
							username: delegateName,
						},
					},
				},
				passphrase: account.passphrase,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Username is too long. Maximum is 20 characters'
				);
				badTransactions.push(transaction);
			});
		});

		it('using uppercase username should fail', async () => {
			transaction = registerDelegate({
				passphrase: accountUpperCase.passphrase,
				username: accountUpperCase.username.toUpperCase(),
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Username must be lowercase');
				badTransactions.push(transaction);
			});
		});

		it('using valid params should be ok', async () => {
			transaction = registerDelegate({
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
				passphrase: account.passphrase,
				username: account.username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('using existing username should fail', async () => {
			transaction = registerDelegate({
				passphrase: accountFormerDelegate.passphrase,
				username: account.username,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Username ${account.username} already exists`
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('updating registered delegate should fail', async () => {
			transaction = registerDelegate({
				passphrase: account.passphrase,
				username: 'newusername',
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});
	});

	describe('confirm validation', () => {
		phases.confirmation(
			goodTransactionsEnforcement,
			badTransactionsEnforcement
		);
	});
});
