'use strict';

require('../../functional.js');

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

var randomUtil = require('../../../common/utils/random');

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
		var transaction1 = node.lisk.transaction.createTransaction(account.address, 1000 * node.normalizer, node.gAccount.password);
		var transaction2 = node.lisk.transaction.createTransaction(accountMinimalFunds.address, constants.fees.delegate, node.gAccount.password);
		var transaction3 = node.lisk.transaction.createTransaction(accountUpperCase.address, constants.fees.delegate, node.gAccount.password);
		var transaction4 = node.lisk.transaction.createTransaction(accountFormerDelegate.address, constants.fees.delegate, node.gAccount.password);
		transactions.push(transaction1);
		transactions.push(transaction2);
		transactions.push(transaction3);
		transactions.push(transaction4);

		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));
		promises.push(sendTransactionPromise(transaction3));
		promises.push(sendTransactionPromise(transaction4));

		return node.Promise.all(promises).then(function (results) {
			results.forEach(function (res, index) {
				node.expect(res).to.have.property('status').to.equal(200);
				transactionsToWaitFor.push(transactions[index].id);
			});
			return waitForConfirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', function () {

		shared.invalidAssets('delegate', badTransactions);
	});

	describe('transactions processing', function () {

		it('with no funds should fail', function () {
			transaction = node.lisk.delegate.createDelegate(accountNoFunds.password, accountNoFunds.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', function () {
			transaction = node.lisk.delegate.createDelegate(accountMinimalFunds.password, accountMinimalFunds.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('using blank username should fail', function () {
			transaction = node.lisk.delegate.createDelegate(account.password, '');

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Username is undefined');
				badTransactions.push(transaction);
			});
		});

		it('using invalid username should fail', function () {
			var username = '~!@#$ %^&*()_+.,?/';
			transaction = node.lisk.delegate.createDelegate(account.password, username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate delegate schema: Object didn\'t pass validation for format username: ' + username);
				badTransactions.push(transaction);
			});
		});

		it('using username longer than 20 characters should fail', function () {
			var username = node.randomString.generate({
				length: 20+1,
				charset: 'alphabetic',
				capitalization: 'lowercase'
			});

			transaction = node.lisk.delegate.createDelegate(account.password, username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Username is too long. Maximum is 20 characters');
				badTransactions.push(transaction);
			});
		});

		it('using uppercase username should fail', function () {
			transaction = node.lisk.delegate.createDelegate(accountUpperCase.password, accountUpperCase.username.toUpperCase());

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Username must be lowercase');
				badTransactions.push(transaction);
			});
		});

		it('using valid params should be ok', function () {
			transaction = node.lisk.delegate.createDelegate(account.password, account.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});

	describe('validation', function () {

		it('setting same delegate twice should fail', function () {
			transaction = node.lisk.delegate.createDelegate(account.password, account.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('using existing username should fail', function () {
			transaction = node.lisk.delegate.createDelegate(accountFormerDelegate.password, account.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Username already exists');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('updating registered delegate should fail', function () {
			transaction = node.lisk.delegate.createDelegate(account.password, 'newusername');

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});
	});

	describe('confirm validation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement);
	});
});
