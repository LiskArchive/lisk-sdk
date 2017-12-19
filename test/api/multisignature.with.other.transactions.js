'use strict';

var async = require('async');
var node = require('./../node.js');
var expect = node.expect;
var genesisDelegates = require('../genesisDelegates.json');

var constants = require('../../helpers/constants.js');

function getTransactionById (id, cb) {
	var params = 'id=' + id;
	node.get('/api/transactions/get?' + params, cb);
}

function sendLISK (params, cb) {
	params.secret = params.secret || node.gAccount.password;
	node.put('/api/transactions/', params, function (err, res) {
		cb(err, res);
	});
}

function createAccountWithLisk (params, cb) {
	sendLISK(params, function (err, res) {
		node.onNewBlock(cb);
	});
}

function putSignature (params, cb) {
	node.put('/api/signatures', params, cb);
}

function putDelegates (params, cb) {
	node.put('/api/delegates', params, cb);
}

function putAccountsDelegates (params, cb) {
	node.put('/api/accounts/delegates', params, cb);
}

function confirmTransaction (transactionId, passphrases, cb) {
	var count = 0;
	async.until(function () {
		return (count >= passphrases.length);
	}, function (untilCb) {
		var passphrase = passphrases[count];
		node.post('/api/multisignatures/sign', {
			secret: passphrase,
			transactionId: transactionId
		}, function (err, res) {
			if (err || !res.body.success) {
				return untilCb(err || res.body.error);
			}
			expect(res.body.transactionId).to.equal(transactionId);
			count++;
			return untilCb();
		});
	}, cb);
}

function createDapp (params, cb) {
	var params = {
		secret: params.account.password,
		category: node.randomProperty(node.dappCategories),
		name: params.applicationName,
		type: node.dappTypes.DAPP,
		description: 'A dapp added via API autotest',
		tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
		link: 'https://github.com/' + params.applicationName + '/master.zip',
		icon: node.guestbookDapp.icon
	};

	node.put('/api/dapps', params, cb);
}

function createIntransfer (params, cb) {
	node.put('/api/dapps/transaction', params, cb);
}

function createOutTransfer (params, cb) {
	node.put('/api/dapps/withdrawal', params, cb);
}

function checkConfirmedTransactions (ids, cb) {
	async.each(ids, function (id, eachCb) {
		getTransactionById(id, function (err, res) {
			expect(err).to.not.exist;
			expect(res.body.success).to.equal(true);
			expect(res.body.transaction).to.be.an('object');
			expect(res.body.transaction.id).to.equal(id);
			eachCb(err);
		});
	}, function (err) {
		cb(err);
	});
}

function createMultisignatureAndConfirm (account, cb) {
	var totalMembers = 15;
	var requiredSignatures = 15;
	var passphrases;
	var accounts = [];
	var keysgroup = [];
	for (var i = 0; i < totalMembers; i++) {
		accounts[i] = node.randomAccount();
		var member = '+' + accounts[i].publicKey;
		keysgroup.push(member);
	}
	passphrases = accounts.map(function (account) {
		return account.password;
	});
	var params = {
		secret: account.password,
		lifetime: parseInt(node.randomNumber(1,72)),
		min: requiredSignatures,
		keysgroup: keysgroup
	};
	node.put('/api/multisignatures', params, function (err, res) {
		expect(res.body.success).to.equal(true);
		expect(res.body.transactionId).to.exist;
		confirmTransaction(res.body.transactionId, passphrases, function (err, result) {
			expect(err).to.not.exist;
			cb(err, res);
		});
	});
}

describe('for an account with lisk', function () {

	var multisigAccount;
	var amounts = [100000000*10, 100000000*12, 100000000*11];

	beforeEach(function (done) {
		multisigAccount = node.randomAccount();
		createAccountWithLisk({
			recipientId: multisigAccount.address,
			amount: 100000000*1000
		}, done);
	});

	describe('for multisignature transaction in the same block', function () {

		var multisigTransactionId;

		beforeEach(function (done) {
			createMultisignatureAndConfirm(multisigAccount, function (err, res) {
				expect(err).to.not.exist;
				expect(res.body.success).to.equal(true);
				multisigTransactionId = res.body.transactionId || res.body.transaction.id;
				done(err, res);
			});
		});

		describe('with one type 0', function () {

			var transactionInCheckId;

			beforeEach(function (done) {
				sendLISK({
					recipientId: node.randomAccount().address,
					amount: 10,
					secret: multisigAccount.password
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);
					transactionInCheckId = res.body.transactionId || res.body.transaction.id;
					node.onNewBlock(done);
				});
			});

			it('should confirm transaction', function (done) {
				checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
			});
		});

		describe('with multiple type 0', function () {

			var transactionsToCheckIds;

			beforeEach(function (done) {
				async.map([node.randomAccount(), node.randomAccount(), node.randomAccount()], function (account, cb) {
					sendLISK({
						recipientId: node.randomAccount().address,
						amount: 10,
						secret: multisigAccount.password
					}, cb);
				}, function (err, results) {
					expect(err).to.not.exist;
					results.forEach(function (res) {
						expect(res.body.success).to.equal(true);
					});
					transactionsToCheckIds = results.map(function (res) {
						return res.body.transactionId;
					});
					transactionsToCheckIds.push(multisigTransactionId);
					node.onNewBlock(done);
				});
			});

			it('should confirm transaction', function (done) {
				checkConfirmedTransactions(transactionsToCheckIds, done);
			});
		});

		describe('with one type 1', function () {

			var transactionInCheckId;

			beforeEach(function (done) {
				var params = {
					secret: multisigAccount.password,
					secondSecret: multisigAccount.secondPassword
				};

				putSignature(params, function (err, res) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);
					transactionInCheckId = res.body.transactionId || res.body.transaction.id;
					node.onNewBlock(done);
				});
			});

			it('should confirm transaction', function (done) {
				checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
			});
		});

		describe('with one type 2', function () {

			var transactionInCheckId;

			beforeEach(function (done) {
				var params = {
					secret: multisigAccount.password,
					username: multisigAccount.username
				};

				putDelegates(params, function (err, res) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);
					transactionInCheckId = res.body.transactionId || res.body.transaction.id;
					node.onNewBlock(done);
				});
			});

			it('should confirm transaction', function (done) {
				checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
			});
		});

		describe('with one type 3', function () {

			var transactionInCheckId;

			beforeEach(function (done) {
				putAccountsDelegates({
					secret: multisigAccount.password,
					delegates: ['+' + node.eAccount.publicKey]
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);
					transactionInCheckId = res.body.transactionId || res.body.transaction.id;
					node.onNewBlock(done);
				});
			});

			it('should confirm transaction', function (done) {
				checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
			});
		});

		describe('with multiple type 3', function (done) {

			var transactionsToCheckIds;

			beforeEach(function (done) {

				async.map([genesisDelegates.delegates[0], genesisDelegates.delegates[1], genesisDelegates.delegates[2]], function (delegate, cb) {
					putAccountsDelegates({
						secret: multisigAccount.password,
						delegates: ['+' + delegate.publicKey]
					}, cb);
				}, function (err, results) {
					expect(err).to.not.exist;
					results.forEach(function (res) {
						expect(res.body.success).to.equal(true);
					});
					transactionsToCheckIds = results.map(function (res) {
						return res.body.transaction.id;
					});
					transactionsToCheckIds.push(multisigTransactionId);
					node.onNewBlock(done);
				});
			});

			it('should confirm transactions', function (done) {
				checkConfirmedTransactions(transactionsToCheckIds, done);
			});
		});

		describe('with one type 4', function () {

			var transactionInCheckId;

			beforeEach(function (done) {
				createMultisignatureAndConfirm(multisigAccount, function (err, res) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);
					transactionInCheckId = res.body.transactionId || res.body.transaction.id;
					node.onNewBlock(done);
				});
			});

			// TODO: This test should be updated after introducing determinism in the order of multisignature transaction confirmations
			it('should confirm one of the transaction', function (done) {
				async.map([transactionInCheckId, multisigTransactionId], function (id, mapCb) {
					getTransactionById(id, mapCb);
				}, function (err, results) {
					expect(err).to.not.exist;
					var successStatuses = [];
					results.map(function (value) {
						successStatuses.push(value.body.success);
					});
					expect(successStatuses).to.include(true, false);
					done();
				});
			});
		});

		describe('with one type 5', function () {

			var transactionInCheckId;

			beforeEach(function (done) {
				var applicationName = node.randomApplicationName();
				createDapp({
					account: multisigAccount,
					applicationName: applicationName,
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);
					transactionInCheckId = res.body.transactionId || res.body.transaction.id;
					node.onNewBlock(done);
				});
			});

			it('should confirm transaction', function (done) {
				checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
			});
		});

		describe('with multiple type 5', function () {

			var transactionsToCheckIds;

			beforeEach(function (done) {
				async.map([node.randomApplicationName(), node.randomApplicationName(), node.randomApplicationName()], function (applicationName, cb) {
					createDapp({
						account: multisigAccount,
						applicationName: applicationName,
					}, cb);
				}, function (err, results) {
					expect(err).to.not.exist;
					results.forEach(function (res) {
						expect(res.body.success).to.equal(true);
					});
					transactionsToCheckIds = results.map(function (res) {
						return res.body.transaction.id;
					});
					transactionsToCheckIds.push(multisigTransactionId);
					node.onNewBlock(done);
				});
			});

			it('should confirm transactions', function (done) {
				checkConfirmedTransactions(transactionsToCheckIds, done);
			});
		});
	});

	describe('when dapp is already registered', function () {

		var dappId;

		beforeEach(function (done) {
			var applicationName = node.randomApplicationName();
			createDapp({
				account: multisigAccount,
				applicationName: applicationName,
			}, function (err, res) {
				expect(err).to.not.exist;
				expect(res.body.success).to.equal(true);
				dappId = res.body.transactionId || res.body.transaction.id;
				node.onNewBlock(done);
			});
		});

		describe('for multisignature transaction in the same block', function () {

			var multisigTransactionId;

			beforeEach(function (done) {
				createMultisignatureAndConfirm(multisigAccount, function (err, res) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);
					multisigTransactionId = res.body.transactionId || res.body.transaction.id;
					done();
				});
			});

			describe('with one type 6', function () {

				var transactionInCheckId;

				beforeEach(function (done) {
					var params = {
						secret: multisigAccount.password,
						dappId: dappId,
						amount: 100000000*10
					};
					createIntransfer(params, function (err, res) {
						expect(err).to.not.exist;
						expect(res.body.success).to.equal(true);
						transactionInCheckId = res.body.transactionId || res.body.transaction.id;
						node.onNewBlock(done);
					});
				});

				it('should confirm transaction', function (done) {
					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});

			describe('with multiple type 6', function () {

				var transactionsToCheckIds;

				beforeEach(function (done) {
					async.map(amounts, function (amount, cb) {
						var params = {
							secret: multisigAccount.password,
							dappId: dappId,
							amount: amount
						};
						createIntransfer(params, function (err, res) {
							expect(err).to.not.exist;
							expect(res.body.success).to.equal(true);
							cb(err, res);
						});
					}, function (err, results) {
						expect(err).to.not.exist;
						results.forEach(function (res) {
							expect(res.body.success).to.equal(true);
						});

						transactionsToCheckIds = results.map(function (res) {
							return res.body.transactionId;
						});
						transactionsToCheckIds.push(multisigTransactionId);
						node.onNewBlock(done);
					});
				});

				it('should confirm transaction', function (done) {
					checkConfirmedTransactions(transactionsToCheckIds, done);
				});
			});
		});

		describe('when multiple inTransfer are already transaction made', function () {

			var inTransferId;
			var inTransferIds;

			beforeEach(function (done) {
				async.map(amounts, function (amount, cb) {
					var params = {
						secret: multisigAccount.password,
						dappId: dappId,
						amount: amount
					};
					createIntransfer(params, function (err, res) {
						expect(err).to.not.exist;
						expect(res.body.success).to.equal(true);
						cb(err, res);
					});
				}, function (err, results) {
					expect(err).to.not.exist;
					results.forEach(function (res) {
						expect(res.body.success).to.equal(true);
					});
					var transactionIds = results.map(function (res) {
						return res.body.transactionId;
					});
					inTransferId = transactionIds[0];
					inTransferIds = transactionIds;
					node.onNewBlock(done);
				});
			});

			describe('for multisignature transaction in the same block', function () {

				var multisigTransactionId;

				beforeEach(function (done) {
					createMultisignatureAndConfirm(multisigAccount, function (err, res) {
						expect(err).to.not.exist;
						expect(res.body.success).to.equal(true);
						multisigTransactionId = res.body.transactionId || res.body.transaction.id;
						done(err, res);
					});
				});

				describe('with one type 7 transaction', function () {

					var transactionInCheckId;

					beforeEach(function (done) {
						var outTransferParams = {
							amount: 1000,
							recipientId: '16313739661670634666L',
							dappId: dappId,
							transactionId: inTransferId,
							secret: multisigAccount.password
						};
						createOutTransfer(outTransferParams, function (err, res) {
							expect(err).to.not.exist;
							expect(res.body.success).to.equal(true);
							transactionInCheckId = res.body.transactionId || res.body.transaction.id;
							node.onNewBlock(done);
						});
					});

					it('should confirmed transaction', function (done) {
						checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
					});
				});

				describe('with multiple type 7', function () {

					var transactionsToCheckIds;

					beforeEach(function (done) {
						async.map(amounts, function (amount, cb) {
							var outTransferParams = {
								amount: 1000,
								recipientId: '16313739661670634666L',
								dappId: dappId,
								transactionId: inTransferIds[amounts.indexOf(amount)],
								secret: multisigAccount.password
							};
							createOutTransfer(outTransferParams, function (err, res) {
								expect(err).to.not.exist;
								expect(res.body.success).to.equal(true);
								cb(err, res);
							});
						}, function (err, results) {
							expect(err).to.not.exist;
							results.forEach(function (res) {
								expect(res.body.success).to.equal(true);
							});
							transactionsToCheckIds = results.map(function (res) {
								return res.body.transactionId || res.body.transaction.id;
							});
							transactionsToCheckIds.push(multisigTransactionId);
							node.onNewBlock(done);
						});
					});

					it('should confirm transaction', function (done) {
						checkConfirmedTransactions(transactionsToCheckIds, done);
					});
				});

				describe('with all transaction types together', function () {

					var transactionsToCheckIds;

					beforeEach(function (done) {
						async.parallel([
							function type0 (cb) {
								var params = {
									secret: multisigAccount.password,
									recipientId: node.randomAccount().address,
									amount: 100
								};
								sendLISK(params, cb);
							},
							function type1 (cb) {
								var params = {
									secret: multisigAccount.password,
									secondSecret: multisigAccount.secondPassword
								};
								putSignature(params, cb);
							},
							function type2 (cb) {
								var params = {
									secret: multisigAccount.password,
									username: multisigAccount.username
								};
								putDelegates(params, cb);
							},
							function type3 (cb) {
								var params = {
									secret: multisigAccount.password,
									delegates: ['+' + node.eAccount.publicKey]
								};
								putAccountsDelegates(params, cb);
							},
							function type5 (cb) {
								var applicationName = node.randomApplicationName();
								createDapp({
									account: multisigAccount,
									applicationName: applicationName,
								}, cb);
							},
							function type6 (cb) {
								var params = {
									secret: multisigAccount.password,
									dappId: dappId,
									amount: 10000
								};
								createIntransfer(params, cb);
							},
							function type7 (cb) {
								var outTransferParams = {
									amount: 10000,
									recipientId: '16313739661670634666L',
									dappId: dappId,
									transactionId: inTransferId,
									secret: multisigAccount.password
								};
								createOutTransfer(outTransferParams, cb);
							}
						], function (err, result) {
							expect(err).to.not.exist;
							result.map(function (res) {
								expect(res.body.success).to.equal(true);
							});
							transactionsToCheckIds = result.map(function (res) {
								return res.body.transactionId || res.body.transaction.id;
							});
							transactionsToCheckIds.push(multisigTransactionId);
							node.onNewBlock(done);
						});
					});

					it('should save all transactions in the block', function (done) {
						checkConfirmedTransactions(transactionsToCheckIds, done);
					});
				});
			});
		});
	});
});
