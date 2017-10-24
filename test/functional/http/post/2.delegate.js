'use strict';

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var getBlocksToWaitPromise = require('../../../common/apiHelpers').getBlocksToWaitPromise;
var waitForBlocksPromise = node.Promise.promisify(node.waitForBlocks);

describe('POST /api/transactions (type 2) register delegate', function () {

	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];

	var account = node.randomAccount();
	var accountNoFunds = node.randomAccount();
	var accountMinimalFunds = node.randomAccount();
	var accountUpperCase = node.randomAccount();
	var accountFormerDelegate = node.randomAccount();

	var transaction;

	// Crediting accounts
	before(function () {

		var promises = [];
		promises.push(creditAccountPromise(account.address, 1000 * node.normalizer ));
		promises.push(creditAccountPromise(accountMinimalFunds.address, constants.fees.delegate));
		promises.push(creditAccountPromise(accountUpperCase.address, constants.fees.delegate));
		promises.push(creditAccountPromise(accountFormerDelegate.address, constants.fees.delegate));

		return node.Promise.all(promises).then(function (results) {
			results.forEach(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
			});
		}).then(function (res) {
			return getBlocksToWaitPromise().then(waitForBlocksPromise);
		});
	});

	describe('schema validations', function () {

		shared.invalidAssets(account, 'delegate', badTransactions);
	});

	describe('transactions processing', function () {

		it('with no funds should fail', function () {
			transaction = node.lisk.delegate.createDelegate(accountNoFunds.password, accountNoFunds.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', function () {
			transaction = node.lisk.delegate.createDelegate(accountMinimalFunds.password, accountMinimalFunds.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
				goodTransactions.push(transaction);
			});
		});

		it('using blank username should fail', function () {
			transaction = node.lisk.delegate.createDelegate(account.password, '');

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Username is undefined');
				badTransactions.push(transaction);
			});
		});

		it('using invalid username should fail', function () {
			var username = '~!@#$ %^&*()_+.,?/';
			transaction = node.lisk.delegate.createDelegate(account.password, username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate delegate schema: Object didn\'t pass validation for format username: ' + username);
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
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Username is too long. Maximum is 20 characters');
				badTransactions.push(transaction);
			});
		});

		it('using uppercase username should fail', function () {
			transaction = node.lisk.delegate.createDelegate(accountUpperCase.password, accountUpperCase.username.toUpperCase());

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Username must be lowercase');
				badTransactions.push(transaction);
			});
		});

		it('using valid params should be ok', function () {
			transaction = node.lisk.delegate.createDelegate(account.password, account.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
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
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('using existing username should fail', function () {
			transaction = node.lisk.delegate.createDelegate(accountFormerDelegate.password, account.username);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Username already exists');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('updating registered delegate should fail', function () {
			transaction = node.lisk.delegate.createDelegate(account.password, 'newusername');

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});
	});

	describe('confirm validation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement);
	});
});
