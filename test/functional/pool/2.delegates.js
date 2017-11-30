'use strict';

var _ = require('lodash');

var constants = require('../../../helpers/constants');
var node = require('../../node');

var getTransactionByIdPromise = require('../../common/apiHelpers').getTransactionByIdPromise;
var onNewBlockPromise = node.Promise.promisify(node.onNewBlock);
var sendTransactionPromise = require('../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../common/apiHelpers').waitForConfirmations;


describe('POST /api/transactions (type 2) double delegate registration', function () {

	var account;
	var strippedResults;
	var validParams;

	function stripTransactionsResults (results) {
		strippedResults = {
			statusFields: results.map(function (res) {
				return res.status;
			}),
			transactionsIds: _.flatMap(results, function (res) {
				return _.map(res.body.transactions, 'id');
			})
		};
		return strippedResults;
	}

	function enrichRandomAccount () {
		account = node.randomAccount();
		validParams = {
			secret: account.password,
			username: account.username
		};

		var transaction = node.lisk.transaction.createTransaction(account.address, 4 * constants.fees.delegate, node.gAccount.password);
		return sendTransactionPromise(transaction).then(function (res) {
			node.expect(res).to.have.property('status').to.be.equal(200);
			node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
			return waitForConfirmations([transaction.id]);
		});
	}

	function sendTwoAndConfirm (transaction1, transaction2, secondSendSchedule) {
		return node.Promise.all([
			sendTransactionPromise(transaction1),
			secondSendSchedule(transaction2)
		]).then(function (results) {
			node.expect(results).to.have.nested.property('0.status').to.equal(200);
			node.expect(results).to.have.nested.property('0.body.status').to.equal('Transaction(s) accepted');
			node.expect(results).to.have.nested.property('1.status').to.equal(200);
			node.expect(results).to.have.nested.property('1.body.status').to.equal('Transaction(s) accepted');
			return onNewBlockPromise().then(function () {
				return node.Promise.all([
					getTransactionByIdPromise(transaction1.id),
					getTransactionByIdPromise(transaction2.id)
				]).then(stripTransactionsResults);
			});
		});
	}

	describe('using same account', function () {

		describe('using same username', function () {

			describe('with the same id', function () {

				var firstResponse;
				var secondResponse;
				var firstTransaction;
				var secondTransaction;

				before(function () {
					return enrichRandomAccount().then(function () {
						firstTransaction = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
						secondTransaction = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
						return node.Promise.all([
							sendTransactionPromise(firstTransaction),
							sendTransactionPromise(secondTransaction)
						]).then(function (results) {
							firstResponse = results[0];
							secondResponse = results[1];
						});
					});
				});

				it('first transaction should be ok', function () {
					node.expect(firstResponse).to.have.property('status').to.equal(200);
					node.expect(firstResponse).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				});

				it('second transaction should fail', function () {
					node.expect(secondResponse).to.have.property('status').to.equal(400);
					node.expect(secondResponse).to.have.nested.property('body.message').equal('Transaction is already processed: ' + firstTransaction.id);
				});
			});

			describe('with different timestamp', function () {

				var transactionWithoutDelay;
				var transactionWithDelay;

				before(function () {
					return enrichRandomAccount()
						.then(function () {
							transactionWithoutDelay = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
							transactionWithDelay = node.lisk.delegate.createDelegate(validParams.secret, validParams.username, null, -1000);
							return sendTwoAndConfirm(transactionWithDelay, transactionWithoutDelay, sendTransactionPromise);
						});
				});

				it('should confirm one transaction', function () {
					node.expect(strippedResults.statusFields).to.contain(200);
					node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
					node.expect([transactionWithDelay.id, transactionWithoutDelay.id]).and.to.contain(strippedResults.transactionsIds[0]);
				});
			});
		});

		describe('with different usernames', function () {

			var differentUsernameParams;
			var transaction1;
			var transaction2;

			before(function () {
				return enrichRandomAccount()
					.then(function () {
						differentUsernameParams = {
							secret: account.password,
							username: node.randomUsername()
						};
						transaction1 = node.lisk.delegate.createDelegate(differentUsernameParams.secret, differentUsernameParams.username);
						transaction2 = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
						return sendTwoAndConfirm(transaction1, transaction2, sendTransactionPromise);
					});
			});

			it('should confirm only one transaction', function () {
				node.expect(strippedResults.statusFields).to.contain(200);
				node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
				node.expect([transaction1.id, transaction2.id]).and.to.contain(strippedResults.transactionsIds[0]);
			});
		});
	});

	describe('using two different accounts', function () {

		var secondAccount;
		var secondAccountValidParams;

		var enrichSecondRandomAccount = function () {
			secondAccount = node.randomAccount();
			secondAccountValidParams = {
				secret: secondAccount.password,
				username: secondAccount.username
			};

			var transaction = node.lisk.transaction.createTransaction(secondAccount.address, 4 * constants.fees.delegate, node.gAccount.password);
			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				return waitForConfirmations([transaction.id]);
			});
		};

		before(function () {
			return node.Promise.all([enrichSecondRandomAccount(), enrichRandomAccount()]);
		});

		describe('using same username', function () {

			var transaction1;
			var transaction2;

			before(function () {
				secondAccountValidParams.username = validParams.username;
				transaction1 = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
				transaction2 = node.lisk.delegate.createDelegate(secondAccountValidParams.secret, secondAccountValidParams.username);
				return sendTwoAndConfirm(transaction1, transaction2, sendTransactionPromise);
			});

			it('should confirm only one transaction', function () {
				node.expect(strippedResults.statusFields).to.contain(200);
				node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
				node.expect([transaction1.id, transaction2.id]).and.to.contain(strippedResults.transactionsIds[0]);
			});
		});

		describe('using different usernames', function () {

			var transaction1;
			var transaction2;

			before(function () {
				return enrichSecondRandomAccount().then(enrichRandomAccount);
			});

			before(function () {
				transaction1 = node.lisk.delegate.createDelegate(validParams.secret, validParams.username);
				transaction2 = node.lisk.delegate.createDelegate(secondAccountValidParams.secret, secondAccountValidParams.username);
				return sendTwoAndConfirm(transaction1, transaction2, sendTransactionPromise);
			});

			it('should successfully confirm both transactions', function () {
				node.expect(strippedResults.statusFields).eql([200, 200]);
				node.expect(strippedResults.transactionsIds).to.have.lengthOf(2).and.to.contain(transaction1.id, transaction2.id);
			});
		});
	});
});
