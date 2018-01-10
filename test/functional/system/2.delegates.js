'use strict';

var expect = require('chai').expect;
var lisk = require('lisk-js');
var Promise = require('bluebird');

var test = require('../../test');
var _ = test._;
var accountFixtures = require('../../fixtures/accounts');

var erroCodes = require('../../../helpers/apiCodes');
var constants = require('../../../helpers/constants');

var waitFor = require('../../common/utils/waitFor');
var apiHelpers = require('../../common/helpers/api');
var randomUtil = require('../../common/utils/random');

var waitForBlocksPromise = Promise.promisify(waitFor.blocks);

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
				return _.map(res.body.data, 'id');
			})
		};
		return strippedResults;
	}

	function enrichRandomAccount () {
		account = randomUtil.account();
		validParams = {
			secret: account.password,
			username: account.username
		};

		var transaction = lisk.transaction.createTransaction(account.address, 4 * constants.fees.delegate, accountFixtures.genesis.password);
		return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
			res.body.data.message.should.be.equal('Transaction(s) accepted');
			return waitFor.confirmations([transaction.id]);
		});
	}

	function sendTwoAndConfirm (transaction1, transaction2, secondSendSchedule) {
		return Promise.all([
			apiHelpers.sendTransactionPromise(transaction1),
			secondSendSchedule(transaction2)
		]).then(function (results) {
			results[0].body.data.message.should.be.equal('Transaction(s) accepted');
			results[1].body.data.message.should.be.equal('Transaction(s) accepted');
			return waitForBlocksPromise(1).then(function () {
				return Promise.all([
					apiHelpers.getTransactionByIdPromise(transaction1.id),
					apiHelpers.getTransactionByIdPromise(transaction2.id)
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
						firstTransaction = lisk.delegate.createDelegate(validParams.secret, validParams.username);
						secondTransaction = lisk.delegate.createDelegate(validParams.secret, validParams.username);
						return Promise.all([
							apiHelpers.sendTransactionPromise(firstTransaction),
							apiHelpers.sendTransactionPromise(secondTransaction, erroCodes.PROCESSING_ERROR)
						]).then(function (results) {
							firstResponse = results[0];
							secondResponse = results[1];
						});
					});
				});

				it('first transaction should be ok', function () {
					firstResponse.body.data.message.should.be.equal('Transaction(s) accepted');
				});

				it('second transaction should fail', function () {
					expect(secondResponse).to.have.nested.property('body.message').equal('Transaction is already processed: ' + firstTransaction.id);
				});
			});

			describe('with different timestamp @unstable', function () {

				var transactionWithoutDelay;
				var transactionWithDelay;

				before(function () {
					return enrichRandomAccount()
						.then(function () {
							transactionWithoutDelay = lisk.delegate.createDelegate(validParams.secret, validParams.username);
							transactionWithDelay = lisk.delegate.createDelegate(validParams.secret, validParams.username, null, -1000);
							return sendTwoAndConfirm(transactionWithDelay, transactionWithoutDelay, apiHelpers.sendTransactionPromise);
						});
				});

				it('should confirm one transaction', function () {
					expect(strippedResults.statusFields).to.contain(200);
					expect(strippedResults.transactionsIds).to.have.lengthOf(1);
					expect([transactionWithDelay.id, transactionWithoutDelay.id]).and.to.contain(strippedResults.transactionsIds[0]);
				});
			});
		});

		describe('using different usernames', function () {

			var differentUsernameParams;
			var transaction1;
			var transaction2;

			before(function () {
				return enrichRandomAccount()
					.then(function () {
						differentUsernameParams = {
							secret: account.password,
							username: randomUtil.username()
						};
						transaction1 = lisk.delegate.createDelegate(differentUsernameParams.secret, differentUsernameParams.username);
						transaction2 = lisk.delegate.createDelegate(validParams.secret, validParams.username);
						return sendTwoAndConfirm(transaction1, transaction2, apiHelpers.sendTransactionPromise);
					});
			});

			it('should confirm only one transaction', function () {
				expect(strippedResults.statusFields).to.contain(200);
				expect(strippedResults.transactionsIds).to.have.lengthOf(1);
				expect([transaction1.id, transaction2.id]).and.to.contain(strippedResults.transactionsIds[0]);
			});
		});
	});

	describe('using two different accounts', function () {

		var secondAccount;
		var secondAccountValidParams;

		var enrichSecondRandomAccount = function () {
			secondAccount = randomUtil.account();
			secondAccountValidParams = {
				secret: secondAccount.password,
				username: secondAccount.username
			};

			var transaction = lisk.transaction.createTransaction(secondAccount.address, 4 * constants.fees.delegate, accountFixtures.genesis.password);
			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {

				res.body.data.message.should.be.equal('Transaction(s) accepted');
				return waitFor.confirmations([transaction.id]);
			});
		};

		before(function () {
			return Promise.all([enrichSecondRandomAccount(), enrichRandomAccount()]);
		});

		describe('using same username', function () {

			var transaction1;
			var transaction2;

			before(function () {
				secondAccountValidParams.username = validParams.username;
				transaction1 = lisk.delegate.createDelegate(validParams.secret, validParams.username);
				transaction2 = lisk.delegate.createDelegate(secondAccountValidParams.secret, secondAccountValidParams.username);
				return sendTwoAndConfirm(transaction1, transaction2, apiHelpers.sendTransactionPromise);
			});

			it('should confirm only one transaction', function () {
				expect(strippedResults.statusFields).to.contain(200);
				expect(strippedResults.transactionsIds).to.have.lengthOf(1);
				expect([transaction1.id, transaction2.id]).and.to.contain(strippedResults.transactionsIds[0]);
			});
		});

		describe('using different usernames', function () {

			var transaction1;
			var transaction2;

			before(function () {
				return enrichSecondRandomAccount().then(enrichRandomAccount);
			});

			before(function () {
				transaction1 = lisk.delegate.createDelegate(validParams.secret, validParams.username);
				transaction2 = lisk.delegate.createDelegate(secondAccountValidParams.secret, secondAccountValidParams.username);
				return sendTwoAndConfirm(transaction1, transaction2, apiHelpers.sendTransactionPromise);
			});

			it('should successfully confirm both transactions', function () {
				expect(strippedResults.statusFields).eql([200, 200]);
				expect(strippedResults.transactionsIds).to.have.lengthOf(2).and.to.contain(transaction1.id, transaction2.id);
			});
		});
	});
});
