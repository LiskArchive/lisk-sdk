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
				expect(res).to.have.property('status').to.equal(200);
				transactionsToWaitFor.push(transactions[index].id);
			});
			return waitFor.confirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', function () {

		common.invalidAssets('delegate', badTransactions);
	});

	describe('transactions processing', function () {

		it('with no funds should fail', function () {
			transaction = lisk.delegate.createDelegate(accountNoFunds.password, accountNoFunds.username);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', function () {
			transaction = lisk.delegate.createDelegate(accountMinimalFunds.password, accountMinimalFunds.username);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('using blank username should fail', function () {
			transaction = lisk.delegate.createDelegate(account.password, '');

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Username is undefined');
				badTransactions.push(transaction);
			});
		});

		it('using invalid username should fail', function () {
			var username = '~!@#$ %^&*()_+.,?/';
			transaction = lisk.delegate.createDelegate(account.password, username);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate delegate schema: Object didn\'t pass validation for format username: ' + username);
				badTransactions.push(transaction);
			});
		});

		it('using username longer than 20 characters should fail', function () {
			var delegateName = randomUtil.delegateName() + 'x';
			transaction = lisk.delegate.createDelegate(account.password, delegateName);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Username is too long. Maximum is 20 characters');
				badTransactions.push(transaction);
			});
		});

		it('using uppercase username should fail', function () {
			transaction = lisk.delegate.createDelegate(accountUpperCase.password, accountUpperCase.username.toUpperCase());

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Username must be lowercase');
				badTransactions.push(transaction);
			});
		});

		it('using valid params should be ok', function () {
			transaction = lisk.delegate.createDelegate(account.password, account.username);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
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

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('using existing username should fail', function () {
			transaction = lisk.delegate.createDelegate(accountFormerDelegate.password, account.username);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Username already exists');
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('updating registered delegate should fail', function () {
			transaction = lisk.delegate.createDelegate(account.password, 'newusername');

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Account is already a delegate');
				badTransactionsEnforcement.push(transaction);
			});
		});
	});

	describe('confirm validation', function () {

		phases.confirmation(goodTransactionsEnforcement, badTransactionsEnforcement);
	});

	describe('double registration', function () {

		var strippedResults;
		var firstTransactionId;
		var secondTransactionId;
		var validParams;

		var stripTransactionsResults = function (results) {
			return {
				successFields:results.map(function (res) {
					return res.body.success;
				}),
				errorFields: results.map(function (res) {
					return res.body.error;
				}).filter(function (error) {
					return error;
				}),
				transactionsIds: results.map(function (res) {
					return res.body.transaction;
				}).filter(function (trs) {
					return trs;
				}).map(function (trs) {
					return trs.id;
				})
			};
		};
		function postDelegate (params, done) {
			transaction = node.lisk.delegate.createDelegate(params.secret, params.username);
			return sendTransactionPromise(transaction).then(function (res) {
				done(res.body);
			});
		}

		function sendLISK (params, done) {
			transaction = node.lisk.delegate.createDelegate(params.secret, params.username);
			return creditAccountPromise(accountFormerDelegate.address, constants.fees.delegate).then(done);
		}

		function enrichRandomAccount (cb) {
			account = node.randomAccount();
			validParams = {
				secret: account.password,
				username: account.username
			};
			sendLISK({
				secret: node.gAccount.password,
				amount: node.LISK,
				recipientId: account.address
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactionId');
				node.expect(res.body.transactionId).to.be.not.empty;
				node.onNewBlock(cb);
			});
		}

		var sendTwice = function (sendSecond, cb) {
			node.async.series({
				first: function (cb) {
					return postDelegate(validParams, cb);
				},
				second: sendSecond
			}, function (err, res) {
				node.expect(res).to.have.deep.property('first.body.success').to.be.true;
				node.expect(res).to.have.deep.property('second.body.success').to.be.true;
				firstTransactionId = res.first.body.transaction.id;
				secondTransactionId = res.second.body.transaction.id;
				cb();
			});
		};

		var getConfirmations = function (cb) {
			return function () {
				node.onNewBlock(function () {
					node.async.series([
						function (cb) {
							return node.get('/api/transactions/get?id=' + firstTransactionId, cb);
						},
						function (cb) {
							return node.get('/api/transactions/get?id=' + secondTransactionId, cb);
						}
					], function (err, results) {
						strippedResults = stripTransactionsResults(results);
						cb();
					});
				});
			};
		};

		describe('using same account', function () {

			describe('using same username', function () {

				describe('with the same id', function () {

					var firstResponse;
					var secondResponse;

					before(enrichRandomAccount);

					before(function (done) {
						node.async.series({
							first: function (cb) {
								return postDelegate(validParams, cb);
							},
							second: function (cb) {
								return postDelegate(validParams, cb);
							}
						}, function (err, res) {
							if (err) {
								return done(err);
							}
							firstResponse = res.first.body;
							secondResponse = res.second.body;
							done();
						});
					});

					it('first transaction should be ok', function () {
						node.expect(firstResponse).to.have.property('transaction');
					});

					it('second transaction should fail', function () {
						node.expect(secondResponse).to.have.property('error').equal('Transaction is already processed: ' + firstResponse.transaction.id);
					});
				});

				describe('with different timestamp', function () {

					before(enrichRandomAccount);

					before(function (done) {
						sendTwice(function (cb) {
							setTimeout(function () {
								return postDelegate(validParams, cb);
							}, 1001);
						}, getConfirmations(done));
					});

					it('should not confirm one transaction', function () {
						node.expect(strippedResults.successFields).to.contain(false);
						node.expect(strippedResults.errorFields).to.have.lengthOf(1).and.to.contain('Transaction not found');
					});

					it('should confirm one transaction', function () {
						node.expect(strippedResults.successFields).to.contain(true);
						node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
						node.expect([firstTransactionId, secondTransactionId]).and.to.contain(strippedResults.transactionsIds[0]);
					});
				});
			});

			describe('with different usernames', function () {

				var differentUsernameParams;

				before(enrichRandomAccount);

				before(function (done) {
					differentUsernameParams = {
						secret: account.password,
						username: node.randomUsername()
					};
					sendTwice(function (cb) {
						return postDelegate(differentUsernameParams, cb);
					}, getConfirmations(done));
				});

				it('should not confirm one transaction', function () {
					node.expect(strippedResults.successFields).to.contain(false);
					node.expect(strippedResults.errorFields).to.have.lengthOf(1).and.to.contain('Transaction not found');
				});

				it('should confirm one transaction', function () {
					node.expect(strippedResults.successFields).to.contain(true);
					node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
					node.expect([firstTransactionId, secondTransactionId]).and.to.contain(strippedResults.transactionsIds[0]);
				});
			});
		});

		describe('using two different accounts', function () {

			var secondAccount;
			var secondAccountValidParams;

			var enrichSecondRandomAccount = function (cb) {
				secondAccount = node.randomAccount();
				secondAccountValidParams = {
					secret: secondAccount.password,
					username: secondAccount.username
				};
				sendLISK({
					secret: node.gAccount.password,
					amount: node.LISK,
					recipientId: secondAccount.address
				}, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactionId');
					node.expect(res.body.transactionId).to.be.not.empty;
					cb();
				});
			};

			before(function (done) {
				enrichSecondRandomAccount(function () {
					enrichRandomAccount(done);
				});
			});

			describe('using same username', function () {

				before(function (done) {
					secondAccountValidParams.username = validParams.username;
					sendTwice(function (cb) {
						return postDelegate(secondAccountValidParams, cb);
					}, getConfirmations(done));
				});

				it('should not confirm one transaction', function () {
					node.expect(strippedResults.successFields).to.contain(false);
					node.expect(strippedResults.errorFields).to.have.lengthOf(1).and.to.contain('Transaction not found');
				});

				it('should confirm one transaction', function () {
					node.expect(strippedResults.successFields).to.contain(true);
					node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
					node.expect([firstTransactionId, secondTransactionId]).and.to.contain(strippedResults.transactionsIds[0]);
				});
			});

			describe('using different usernames', function () {

				var firstConfirmedTransaction;
				var secondConfirmedTransaction;

				before(function (done) {
					enrichSecondRandomAccount(function () {
						enrichRandomAccount(done);
					});
				});

				before(function (done) {
					sendTwice(function (cb) {
						return postDelegate(secondAccountValidParams, cb);
					}, function () {
						node.onNewBlock(function () {
							node.async.series({
								firstConfirmedTransaction: function (cb) {
									return node.get('/api/transactions/get?id=' + firstTransactionId, cb);
								},
								secondConfirmedTransaction: function (cb) {
									return node.get('/api/transactions/get?id=' + secondTransactionId, cb);
								}
							}, function (err, res) {
								firstConfirmedTransaction = res.firstConfirmedTransaction.body;
								secondConfirmedTransaction = res.secondConfirmedTransaction.body;
								done();
							});
						});
					});
				});

				it('should successfully confirm both transactions', function () {
					node.expect(firstConfirmedTransaction).to.have.deep.property('success').to.be.true;
					node.expect(firstConfirmedTransaction).to.have.deep.property('transaction.id').to.be.equal(firstTransactionId);
					node.expect(secondConfirmedTransaction).to.have.deep.property('success').to.be.true;
					node.expect(secondConfirmedTransaction).to.have.deep.property('transaction.id').to.be.equal(secondTransactionId);
				});
			});
		});
	});

});
