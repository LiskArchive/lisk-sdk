'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;
var Promise = require('bluebird');

var common = require('./common');
var phases = require('../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');

var apiHelpers = require('../../../common/helpers/api');
var sendTransactionPromise = apiHelpers.sendTransactionPromise;

var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/waitFor');
var errorCodes = require('../../../../helpers/apiCodes');

describe('POST /api/transactions (type 2) register delegate', function () {

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
	before(function () {

		var transactions = [];
		var transaction1 = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
		var transaction2 = lisk.transaction.createTransaction(accountMinimalFunds.address, constants.fees.delegate, accountFixtures.genesis.password);
		var transaction3 = lisk.transaction.createTransaction(accountUpperCase.address, constants.fees.delegate, accountFixtures.genesis.password);
		var transaction4 = lisk.transaction.createTransaction(accountFormerDelegate.address, constants.fees.delegate, accountFixtures.genesis.password);
		transactions.push(transaction1);
		transactions.push(transaction2);
		transactions.push(transaction3);
		transactions.push(transaction4);

		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));
		promises.push(sendTransactionPromise(transaction3));
		promises.push(sendTransactionPromise(transaction4));

		return Promise.all(promises).then(function (results) {
			results.forEach(function (res, index) {
				transactionsToWaitFor.push(transactions[index].id);
			});
			return waitFor.confirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', function () {

		common.invalidAssets('delegate', badTransactions);
	});

	describe('transactions processing', function () {

		it('when account does not exist should fail', function () {
			transaction = lisk.delegate.createDelegate(accountNoFunds.password, accountNoFunds.username);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Account does not exist');
				badTransactions.push(transaction);
			});
		});

		it.skip('with no funds should fail', function () {
			// FIXME: Create an account with 1 LSK and try to create delegate
			transaction = lisk.delegate.createDelegate(accountNoFunds.password, accountNoFunds.username);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', function () {
			transaction = lisk.delegate.createDelegate(accountMinimalFunds.password, accountMinimalFunds.username);

			return sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('using blank username should fail', function () {
			transaction = lisk.delegate.createDelegate(account.password, '');

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Username is undefined');
				badTransactions.push(transaction);
			});
		});

		it('using invalid username should fail', function () {
			var username = '~!@#$ %^&*()_+.,?/';
			transaction = lisk.delegate.createDelegate(account.password, username);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Invalid transaction body - Failed to validate delegate schema: Object didn\'t pass validation for format username: ' + username);
				badTransactions.push(transaction);
			});
		});

		it('using username longer than 20 characters should fail', function () {
			var delegateName = randomUtil.delegateName() + 'x';
			transaction = lisk.delegate.createDelegate(account.password, delegateName);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Username is too long. Maximum is 20 characters');
				badTransactions.push(transaction);
			});
		});

		it('using uppercase username should fail', function () {
			transaction = lisk.delegate.createDelegate(accountUpperCase.password, accountUpperCase.username.toUpperCase());

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Username must be lowercase');
				badTransactions.push(transaction);
			});
		});

		it('using valid params should be ok', function () {
			transaction = lisk.delegate.createDelegate(account.password, account.username);

			return sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});

	describe('validation', function () {

		it('setting same delegate twice should fail', function () {
			transaction = lisk.delegate.createDelegate(account.password, account.username);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('using existing username should fail', function () {
			transaction = lisk.delegate.createDelegate(accountFormerDelegate.password, account.username);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Username already exists');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('updating registered delegate should fail', function () {
			transaction = lisk.delegate.createDelegate(account.password, 'newusername');

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});
	});

	describe('confirm validation', function () {

		phases.confirmation(goodTransactionsEnforcement, badTransactionsEnforcement);
	});
});
