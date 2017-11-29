'use strict';

require('../../functional.js');

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;
var getAccountsPromise = require('../../../common/apiHelpers').getAccountsPromise;

var randomUtil = require('../../../common/utils/random');

describe('POST /api/transactions (type 6) inTransfer dapp', function () {

	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();
	var accountMinimalFunds = randomUtil.account();

	// Crediting accounts
	before(function () {
		var transaction1 = node.lisk.transaction.createTransaction(account.address, 1000 * node.normalizer, node.gAccount.password);
		var transaction2 = node.lisk.transaction.createTransaction(accountMinimalFunds.address, constants.fees.dappRegistration, node.gAccount.password);
		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));

		return node.Promise.all(promises)
			.then(function (results) {
				results.forEach(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				});

				transactionsToWaitFor.push(transaction1.id, transaction2.id);

				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, randomUtil.guestbookDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');

				randomUtil.guestbookDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.guestbookDapp.id);
				transaction = node.lisk.dapp.createDapp(accountMinimalFunds.password, null, randomUtil.blockDataDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');

				randomUtil.blockDataDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.blockDataDapp.id);

				return waitForConfirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', function () {

		shared.invalidAssets('inTransfer', badTransactions);

		describe('dappId', function () {

			it('without should fail', function () {
				transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), node.gAccount.password);
				delete transaction.asset.inTransfer.dappId;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate inTransfer schema: Missing required property: dappId');
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), node.gAccount.password);
				transaction.asset.inTransfer.dappId = 1;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with number should fail', function () {
				transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), node.gAccount.password);
				transaction.asset.inTransfer.dappId = 1.2;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type number');
					badTransactions.push(transaction);
				});
			});

			it('with empty array should fail', function () {
				transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), node.gAccount.password);
				transaction.asset.inTransfer.dappId = [];

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type array');
					badTransactions.push(transaction);
				});
			});

			it('with empty object should fail', function () {
				transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), node.gAccount.password);
				transaction.asset.inTransfer.dappId = {};

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type object');
					badTransactions.push(transaction);
				});
			});

			it('with empty string should fail', function () {
				transaction = node.lisk.transfer.createInTransfer('', Date.now(), account.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate inTransfer schema: String is too short (0 chars), minimum 1');
					badTransactions.push(transaction);
				});
			});

			it('with invalid string should fail', function () {
				var invalidDappId = '1L';
				transaction = node.lisk.transfer.createInTransfer(invalidDappId, 1, node.gAccount.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate inTransfer schema: Object didn\'t pass validation for format id: ' + invalidDappId);
					badTransactions.push(transaction);
				});
			});
		});

		describe('amount', function () {

			it('using < 0 should fail', function () {
				transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, -1, node.gAccount.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum 0');
					badTransactions.push(transaction);
				});
			});

			it('using > balance should fail', function () {
				return getAccountsPromise('address=' + account.address)
					.then(function (res) {
						node.expect(res.body).to.have.nested.property('data').to.have.lengthOf(1);

						var balance = res.body.data[0].balance;
						var amount = new node.bignum(balance).plus('1').toNumber();
						transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, amount, account.password);

						return sendTransactionPromise(transaction);
					})
					.then(function (res) {
						node.expect(res).to.have.property('status').to.equal(400);
						node.expect(res).to.have.nested.property('body.message').to.match(/^Account does not have enough LSK: /);
						badTransactions.push(transaction);
					});
			});
		});
	});

	describe('transactions processing', function () {

		it('using unknown dapp id should fail', function () {
			var unknownDappId = '1';
			transaction = node.lisk.transfer.createInTransfer(unknownDappId, 1, node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Application not found: ' + unknownDappId);
				badTransactions.push(transaction);
			});
		});

		it('using valid but inexistent transaction id as dapp id should fail', function () {
			var inexistentId = randomUtil.transaction().id;
			transaction = node.lisk.transfer.createInTransfer(inexistentId, 1, account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Application not found: ' + inexistentId);
				badTransactions.push(transaction);
			});
		});

		it('using unrelated transaction id as dapp id should fail', function () {
			transaction = node.lisk.transfer.createInTransfer(transactionsToWaitFor[0], 1, node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Application not found: ' + transactionsToWaitFor[0]);
				badTransactions.push(transaction);
			});
		});

		it('with correct data should be ok', function () {
			transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, 10 * node.normalizer, node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		describe('from the author itself', function (){

			it('with minimal funds should fail', function () {
				transaction = node.lisk.transfer.createInTransfer(randomUtil.blockDataDapp.id, 1, accountMinimalFunds.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/^Account does not have enough LSK: /);
					badTransactions.push(transaction);
				});
			});

			it('with enough funds should be ok', function () {
				transaction = node.lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, 10 * node.normalizer, account.password);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
