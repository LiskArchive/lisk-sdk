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

require('../../functional.js');
var Promise = require('bluebird');
var lisk = require('lisk-elements').default;
var phases = require('../../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');
var apiHelpers = require('../../../common/helpers/api');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var errorCodes = require('../../../../helpers/api_codes');
var common = require('./common');

const { FEES, NORMALIZER } = global.constants;

var sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('POST /api/transactions (type 2) register delegate', () => {
	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];

	var account = randomUtil.account();
	var accountNoFunds = randomUtil.account();
	var accountMinimalFunds = randomUtil.account();
	var accountUpperCase = randomUtil.account();
	var accountFormerDelegate = randomUtil.account();

	// Crediting accounts
	before(() => {
		var transactions = [];
		var transaction1 = lisk.transaction.transfer({
			amount: 1000 * NORMALIZER,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: account.address,
		});
		var transaction2 = lisk.transaction.transfer({
			amount: FEES.DELEGATE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMinimalFunds.address,
		});
		var transaction3 = lisk.transaction.transfer({
			amount: FEES.DELEGATE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountUpperCase.address,
		});
		var transaction4 = lisk.transaction.transfer({
			amount: FEES.DELEGATE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountFormerDelegate.address,
		});
		transactions.push(transaction1);
		transactions.push(transaction2);
		transactions.push(transaction3);
		transactions.push(transaction4);

		var promises = [];
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
		it('with no funds should fail', () => {
			transaction = lisk.transaction.registerDelegate({
				passphrase: accountNoFunds.passphrase,
				username: accountNoFunds.username,
			});

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Account does not have enough LSK: ${
						accountNoFunds.address
					} balance: 0`
				);
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', () => {
			transaction = lisk.transaction.registerDelegate({
				passphrase: accountMinimalFunds.passphrase,
				username: accountMinimalFunds.username,
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('using blank username should fail', () => {
			transaction = lisk.transaction.registerDelegate({
				passphrase: account.passphrase,
				username: '',
			});

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Username is undefined');
				badTransactions.push(transaction);
			});
		});

		it('using invalid username should fail', () => {
			var username = '~!@#$ %^&*()_+.,?/';
			transaction = lisk.transaction.registerDelegate({
				passphrase: account.passphrase,
				username,
			});

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Invalid transaction body - Failed to validate delegate schema: Object didn't pass validation for format username: ${username}`
				);
				badTransactions.push(transaction);
			});
		});

		it('using username longer than 20 characters should fail', () => {
			var delegateName = `${randomUtil.delegateName()}x`;
			transaction = lisk.transaction.registerDelegate({
				passphrase: account.passphrase,
				username: delegateName,
			});

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Username is too long. Maximum is 20 characters'
				);
				badTransactions.push(transaction);
			});
		});

		it('using uppercase username should fail', () => {
			transaction = lisk.transaction.registerDelegate({
				passphrase: accountUpperCase.passphrase,
				username: accountUpperCase.username.toUpperCase(),
			});

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Username must be lowercase');
				badTransactions.push(transaction);
			});
		});

		it('using valid params should be ok', () => {
			transaction = lisk.transaction.registerDelegate({
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
		it('setting same delegate twice should fail', () => {
			transaction = lisk.transaction.registerDelegate({
				passphrase: account.passphrase,
				username: account.username,
			});

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('using existing username should fail', () => {
			transaction = lisk.transaction.registerDelegate({
				passphrase: accountFormerDelegate.passphrase,
				username: account.username,
			});

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Username ${account.username} already exists`
				);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('updating registered delegate should fail', () => {
			transaction = lisk.transaction.registerDelegate({
				passphrase: account.passphrase,
				username: 'newusername',
			});

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
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
