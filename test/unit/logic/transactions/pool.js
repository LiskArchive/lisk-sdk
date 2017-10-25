'use strict';

var expect = require('chai').expect;
var sinon  = require('sinon');
var _ = require('lodash');

var node = require('../../../node');
var DBSandbox = require('../../../common/globalBefore').DBSandbox;
var modulesLoader = require('../../../common/modulesLoader');
var bson = require('../../../../helpers/bson.js');
var constants = require('../../../../helpers/constants.js');
var TransactionPool = require('../../../../logic/transactions/pool.js');

var testAccounts = [
	{
		account: {
			username: 'tpool_test_1',
			isDelegate: 1,
			address: '2737453412992791987L',
			publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
			balance: 5300000000000000,
			u_balance: 5300000000000000
		},
		secret: 'message crash glance horror pear opera hedgehog monitor connect vague chuckle advice',
		secret2: 'monitor connect vague chuckle advice message crash glance horror pear opera hedgehog'
	},{
		account: {
			username: 'tpool_test_2',
			isDelegate: 0,
			address: '2896019180726908125L',
			publicKey: '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
			balance: 0,
			u_balance: 0
		},
		secret: 'joy ethics cruise churn ozone asset quote renew dutch erosion seed pioneer',
	},{
		account: {
			username: 'tpool_test_3',
			isDelegate: 0,
			address: '15240249857307028085L',
			publicKey: '181414336a6642307feda947a697c36f299093de35bf0fb263ccdeccb497962c',
			balance: 3500000000000000,
			u_balance: 3500000000000000
		},
		secret: 'song gather until exercise explain utility walk choice garbage cross route develop',
	},{
		account: {
			username: 'tpool_test_4',
			isDelegate: 0,
			address: '13898484363564790288L',
			publicKey: '849b37aaeb6038aebbe7e7341735d7a9d207da1851b701d87db5426651ed3fe8',
			balance: 3500000000000000,
			u_balance: 3500000000000000
		},
		secret: 'island pizza tilt scrap spend guilt one guitar range narrow rough hotel',
	}
];

var transactions = [
	/* Type: 0 - Transmit funds.*/
	node.lisk.transaction.createTransaction(testAccounts[1].account.address, 300000000, testAccounts[0].secret),
	/* Type: 1 - Register a second signature.*/
	node.lisk.signature.createSignature(testAccounts[0].secret, testAccounts[0].secret2),
	/* Type: 2 - Register a delegate.*/
	node.lisk.delegate.createDelegate(testAccounts[3].secret, 'tpool_new_delegate'),
	/* Type: 3 - Submit votes.*/
	node.lisk.vote.createVote(testAccounts[0].secret, 
		['+c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5']),
	/* Type: 4 - Multisignature registration.*/
	[
		/* - Create normal multisignature, all accounts in database */
		createMultisignatureSigned (testAccounts[0].secret, null, 
			['+' + testAccounts[1].account.publicKey, '+' + testAccounts[2].account.publicKey], 
			[testAccounts[1].secret, testAccounts[2].secret], 1, 2),
		/* - Create multisignature signed with signer account not register in database.*/
		createMultisignatureSigned (testAccounts[2].secret, null, 
			['+6a23c387172fdf66654f27ccb451ceb4bed7507584c20ed5168f0e7a979f9c5e'], 
			['horse endless tag awkward pact reveal kiss april crash interest prefer lunch'], 1, 1),
		/* - Create multisignature signed without enough signatures.*/
		createMultisignatureSigned (testAccounts[3].secret, null, 
			['+' + testAccounts[2].account.publicKey,'+' + testAccounts[1].account.publicKey], [testAccounts[2].secret], 1, 2)
	]
];

var invalidsTransactions = [
	/* Type: 0 - Transmit funds account without enough credit.*/
	node.lisk.transaction.createTransaction(testAccounts[0].account.address, 4400000000, testAccounts[1].secret),
	/* Type: 1 - Register a second signature account without enough credit.*/
	node.lisk.signature.createSignature(testAccounts[1].secret, testAccounts[0].secret2),
	/* Type: 2.*/
	[
		/* - Register a delegate account without enough credit.*/
		node.lisk.delegate.createDelegate('genre spare shed home aim achieve second garbage army erode rubber baby', 'tpool_new_delegate'),
		/* - Register a delegate that already is delegate*/
		node.lisk.delegate.createDelegate(testAccounts[0].secret, testAccounts[0].account.username),
		/* - Register a delegate account with existing username*/
		node.lisk.delegate.createDelegate(testAccounts[1].secret, testAccounts[1].account.username)
	],
	/* Type: 3.*/
	[
		/* - Submit votes from an account without enough credit.*/
		node.lisk.vote.createVote(testAccounts[1].secret, 
			['+c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5']),
		/* - Submit votes to an account that is not a delegate.*/
		node.lisk.vote.createVote(testAccounts[2].secret, 
			['+181414336a6642307feda947a697c36f299093de35bf0fb263ccdeccb497962c'])
	],
	/* Type: 4.*/
	[
		/* - Create multisignature signed from an account without enough credit.*/
		createMultisignatureSigned (testAccounts[1].secret, null, 
			['+' + testAccounts[3].account.publicKey], [testAccounts[3].secret], 1, 1),
		/* - Create multisignature signed with invalid signature.*/
		createMultisignatureSigned (testAccounts[3].secret, null, 
			['+' + testAccounts[2].account.publicKey], [testAccounts[1].secret], 1, 1)
	]
];

var hackedTransactions = [
	/* Invalid signature */
	{
		'type': 2,
		'amount': 0,
		'fee': 2500000000,
		'recipientId': null,
		'senderPublicKey': '911441a4984f1ed369f36bb044758d0b3e158581418832a5dd4a67f3d03387e9',
		'timestamp': 43775831,
		'asset': {
			'delegate': {
				'username': 'txp_new_delegate',
				'publicKey': '911441a4984f1ed369f36bb044758d0b3e158581418832a5dd4a67f3d03387e9'
			}
		},
		'signature': '6db720cd875035de6d6e91cd6f48303c1f7baab3f85074e03029af857e71e8af96cf7be33fd2b7bf650c4bf01383dbccfaaba23a4020974fcb9d1912b84a4f0a',
		'id': '16349767733713562311'
	}
];

// Set spies for logger
var debug = sinon.stub(modulesLoader.scope.logger, 'debug');
var info = sinon.stub(modulesLoader.scope.logger, 'info');
var warn = sinon.stub(modulesLoader.scope.logger, 'warn');
var error = sinon.stub(modulesLoader.scope.logger, 'error');

function resetSpiesState () {
	// Reset state of spies
	debug.reset();
	info.reset();
	warn.reset();
	error.reset();
}

function restoreSpiesState () {
	// Restore state of spies
	debug.restore();
	info.restore();
	warn.restore();
	error.restore();
}

function createMultisignatureSigned (creatorSecret, creatorSecondSecret, keysgroup, signeersSecrets, min, lifetime) {
	var multisignatureTransaction = node.lisk.multisignature.createMultisignature(creatorSecret, creatorSecondSecret, keysgroup, min, lifetime);
	var signatures = [];
	signeersSecrets.forEach(function (secret) {
		var sign = node.lisk.multisignature.signTransaction(multisignatureTransaction, secret);
		signatures.push(sign);
	});
	multisignatureTransaction.signatures = signatures;
	return multisignatureTransaction;
}

describe('transactionPool', function () {
	
	var accounts;
	var transactionPool;
	var poolTotals;
	var poolStorageTransactionsLimit;
	var dbSandbox;

	before(function (done) {
		dbSandbox = new DBSandbox(node.config.db, 'lisk_test_logic_transactionPool');
		dbSandbox.create(function (err, __db) {
			if (err) {
				return done(err);
			}
			// Wait for genesisBlock transaction being applied
			node.initApplication(function (err, scope) {
				constants.unconfirmedTransactionTimeOut = 1;
				constants.signatureTransactionTimeOutMultiplier = 1;
				constants.secondsPerHour = 1;
				poolStorageTransactionsLimit =  modulesLoader.scope.config.transactions.pool.storageLimit = 6;
				modulesLoader.scope.config.transactions.pool.processInterval = 60000000;
				modulesLoader.scope.config.transactions.pool.expiryInterval = 300000000;

				// Init transaction logic
				transactionPool = new TransactionPool(
					modulesLoader.scope.config.transactions.pool.storageLimit,
					modulesLoader.scope.config.transactions.pool.processInterval,
					modulesLoader.scope.config.transactions.pool.expiryInterval,
					scope.logic.transaction,
					scope.logic.account,
					modulesLoader.scope.bus,
					modulesLoader.scope.logger,
					modulesLoader.scope.ed
				);
				transactionPool.bind(
					scope.modules.accounts,
					null,
					scope.modules.loader
				);
				accounts = scope.modules.accounts;
				done();
			}, {db: __db});
		});
	});

	beforeEach(function () {
		resetSpiesState();
	});

	after(function () {
		restoreSpiesState();
	});

	after(function (done) {
		dbSandbox.destroy();
		node.appCleanup(done);
	});

	describe('setup database', function () {
		
		it('should be ok when generate account 1', function (done) {
			accounts.setAccountAndGet(testAccounts[0].account, function (err, newaccount) {
				expect(newaccount.address).to.equal(testAccounts[0].account.address);
				done();
			});
		});

		it('should be ok when generate account 2', function (done) {
			accounts.setAccountAndGet(testAccounts[1].account, function (err, newaccount) {
				expect(newaccount.address).to.equal(testAccounts[1].account.address);
				done();
			});
		});

		it('should be ok when generate account 3', function (done) {
			accounts.setAccountAndGet(testAccounts[2].account, function (err, newaccount) {
				expect(newaccount.address).to.equal(testAccounts[2].account.address);
				done();
			});
		});

		it('should be ok when generate account 4', function (done) {
			accounts.setAccountAndGet(testAccounts[3].account, function (err, newaccount) {
				expect(newaccount.address).to.equal(testAccounts[3].account.address);
				done();
			});
		});
	});

	describe('process workers', function () {

		it('should be ok when get pool totals to initialize local counter', function (done) {
			var totals = transactionPool.getUsage();

			expect(totals).to.be.an('object');
			expect(totals.unverified).to.be.a('number');
			expect(totals.pending).to.be.a('number');
			expect(totals.ready).to.be.a('number');
			expect(totals.invalid).to.be.a('number');
			poolTotals = totals;
			done();
		});

		describe('processPool', function () {

			describe('Transaction type: 0 - Transmit funds', function () {
				var tmpTransactionInvalidId;

				it('should be ok when add normal transaction to unverified', function (done) {
					transactionPool.add(transactions[0], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					transactionPool.add(invalidsTransactions[0], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with invalid transaction id', function (done) {
					tmpTransactionInvalidId = _.cloneDeep(invalidsTransactions[0]);
					tmpTransactionInvalidId.id = '01234567890123456789';

					transactionPool.add(tmpTransactionInvalidId, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when process pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTransactions[0].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', testAccounts[1].account.address, 'balance: 3'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + tmpTransactionInvalidId.id);
						expect(error.args[1][1]).to.equal('Invalid transaction id');
						poolTotals.invalid += 1;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					transactionPool.add(transactions[0], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[0].id);
						done();
					});
				});

				it('should fail when add same transaction with invalid id to unverified', function (done) {
					transactionPool.add(tmpTransactionInvalidId, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + tmpTransactionInvalidId.id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[0]);

					expect(deletedTransaction.length).to.equal(1);
					expect(deletedTransaction[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(1);
					poolTotals.invalid -= 1;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.equal(poolTotals.unverified);
					expect(totals.pending).to.equal(poolTotals.pending);
					expect(totals.ready).to.equal(poolTotals.ready);
					expect(totals.invalid).to.equal(poolTotals.invalid);
					done();
				});
			});

			describe('Transaction type: 1 - Register a second signature', function () {
				var invalidTransactionType;

				it('should be ok when add normal transaction to unverified', function (done) {
					transactionPool.add(transactions[1], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					transactionPool.add(invalidsTransactions[1], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with invalid transaction type', function (done) {
					invalidTransactionType = _.cloneDeep(invalidsTransactions[0]);
					invalidTransactionType.id = '12345678901234567890';
					invalidTransactionType.type = 99;

					transactionPool.add(invalidTransactionType, function (err, cbtransaction) {
						if (err) {
							done(err);
						}
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when process pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTransactions[1].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', testAccounts[1].account.address, 'balance: 0'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidTransactionType.id);
						expect(error.args[1][1]).to.equal(['Unknown transaction type', invalidTransactionType.type].join(' '));
						poolTotals.invalid += 1;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					transactionPool.add(transactions[1], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[1].id);
						done();
					});
				});

				it('should fail when add same transaction with invalid transaction type to unverified', function (done) {
					transactionPool.add(invalidTransactionType, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidTransactionType.id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[1]);

					expect(deletedTransaction.length).to.equal(1);
					expect(deletedTransaction[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					done();
				});
			});

			describe('Transaction type: 2 - Register a delegate', function () {
				var invalidSignature;

				it('should be ok when add normal transaction to unverified', function (done) {
					transactionPool.add(transactions[2], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					transactionPool.add(invalidsTransactions[2][0], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified that already is a delegate', function (done) {
					transactionPool.add(invalidsTransactions[2][1], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with same username', function (done) {
					transactionPool.add(invalidsTransactions[2][2], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with invalid signature', function (done) {
					invalidSignature = _.cloneDeep(hackedTransactions[0]);

					transactionPool.add(invalidSignature, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when process pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTransactions[2][0].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTransactions[2][0].senderId, 'balance: 0'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTransactions[2][1].id);
						expect(error.args[1][1]).to.equal('Account is already a delegate');
						expect(error.args[2][0]).to.equal('Failed to process unverified transaction: ' + invalidsTransactions[2][2].id);
						expect(error.args[2][1]).to.equal('Username already exists');
						expect(error.args[3][0]).to.equal('Failed to process unverified transaction: ' + invalidSignature.id);
						expect(error.args[3][1]).to.equal('Failed to verify signature');
						poolTotals.invalid += 3;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					transactionPool.add(transactions[2], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[2].id);
						done();
					});
				});

				it('should fail when add same transaction with registered delegate to unverified', function (done) {
					transactionPool.add(invalidsTransactions[2][1], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[2][1].id);
						done();
					});
				});

				it('should fail when add same transaction with registered delegate to unverified', function (done) {
					transactionPool.add(invalidsTransactions[2][1], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[2][1].id);
						done();
					});
				});

				it('should fail when add same transaction with same username to unverified', function (done) {
					transactionPool.add(invalidsTransactions[2][2], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[2][2].id);
						done();
					});
				});

				it('should fail when add same transaction with invalid signature to unverified', function (done) {
					transactionPool.add(invalidSignature, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidSignature.id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[2]);

					expect(deletedTransaction.length).to.equal(1);
					expect(deletedTransaction[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					done();
				});
			});

			describe('Transaction type: 3 - Submit votes', function () {

				it('should be ok when add normal transaction to unverified', function (done) {
					transactionPool.add(transactions[3], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					transactionPool.add(invalidsTransactions[3][0], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified that votes a non delegate', function (done) {
					transactionPool.add(invalidsTransactions[3][1], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when process pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTransactions[3][0].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTransactions[3][0].senderId, 'balance: 0'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTransactions[3][1].id);
						expect(error.args[1][1]).to.equal('Delegate not found');
						poolTotals.invalid += 1;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					transactionPool.add(transactions[3], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[3].id);
						done();
					});
				});

				it('should fail when add same transaction that votes a non delegate to unverified', function (done) {
					transactionPool.add(invalidsTransactions[3][1], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[3][1].id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[3]);

					expect(deletedTransaction.length).to.equal(1);
					expect(deletedTransaction[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					done();
				});
			});

			describe('Transaction type: 4 - Multisignature registration', function () {
				var notEnoughSignatures;
				var completedSignatures;

				it('should be ok when add normal transaction to unverified', function (done) {
					completedSignatures = _.cloneDeep(transactions[4][0]);

					transactionPool.add(completedSignatures, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with not register signer in database', function (done) {
					transactionPool.add(transactions[4][1], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified without enough signatures', function (done) {
					notEnoughSignatures = _.cloneDeep(transactions[4][2]);

					transactionPool.add(notEnoughSignatures, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					transactionPool.add(invalidsTransactions[4][0], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with invalid signeer', function (done) {
					transactionPool.add(invalidsTransactions[4][1], function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when process pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTransactions[4][0].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTransactions[4][0].senderId, 'balance: 0'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTransactions[4][1].id);
						expect(error.args[1][1]).to.equal('Failed to verify multisignature');
						poolTotals.invalid += 1;
						poolTotals.pending += 1;
						poolTotals.ready += 2;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					transactionPool.add(completedSignatures, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + completedSignatures.id);
						done();
					});
				});

				it('should fail when add same transaction with unregister signer to unverified', function (done) {
					transactionPool.add(transactions[4][1], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[4][1].id);
						done();
					});
				});

				it('should fail when add same transaction without enough signatures to unverified', function (done) {
					transactionPool.add(invalidsTransactions[4][1], function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[4][1].id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(completedSignatures);

					expect(deletedTransaction.length).to.equal(1);
					expect(deletedTransaction[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when delete normal transaction without enough signatures to unverified', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[4][1]);

					expect(deletedTransaction.length).to.equal(1);
					expect(deletedTransaction[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					done();
				});

				describe('Sign multisignature', function () {

					it('should fail when sign transaction with invalid signeer', function (done) {
						transactionPool.addSignature(transactions[4][2].id, testAccounts[0].secret, function (err, cbtransaction) {
							expect(err).to.equal('Permission to sign transaction denied');
							done();
						});
					});

					it('should be ok when sign pending transaction', function (done) {
						transactionPool.addSignature(transactions[4][2].id, testAccounts[1].secret, function (err, cbtransaction) {
							expect(err).to.be.undefined;
							expect(cbtransaction).to.be.undefined;
							done();
						});
					});

					it('should fail when sign same pending transaction again', function (done) {
						transactionPool.addSignature(transactions[4][2].id, testAccounts[1].secret, function (err, cbtransaction) {
							expect(err).to.equal('Transaction already signed');
							done();
						});
					});

					it('should be ok when process pool transactions', function (done) {
						transactionPool.processPool(function (err, cbprPool) {
							expect(error.args.length).to.equal(0);
							poolTotals.pending -= 1;
							poolTotals.ready += 1;
							done();
						});
					});

					it('should fail when sign transaction that is not in the pool', function (done) {
						transactionPool.addSignature(transactions[4][2].id, testAccounts[1].secret, function (err, cbtransaction) {
							expect(err).to.equal('Transaction not in pool');
							done();
						});
					});

					it('should be ok when delete transaction from ready', function (done) {
						var deletedTransaction = transactionPool.delete(transactions[4][2]);

						expect(deletedTransaction.length).to.equal(1);
						expect(deletedTransaction[0]).to.equal('ready');
						poolTotals.ready -= 1;
						done();
					});

					it('should be ok when get pool totals', function (done) {
						var totals = transactionPool.getUsage();

						expect(totals).to.be.an('object');
						expect(totals.unverified).to.be.equal(poolTotals.unverified);
						expect(totals.pending).to.be.equal(poolTotals.pending);
						expect(totals.ready).to.be.equal(poolTotals.ready);
						expect(totals.invalid).to.be.equal(poolTotals.invalid);
						done();
					});
				});
			});
		});

		describe('expireTransactions', function () {
			var invalidSignature;
			var completedSignatures;
			var notEnoughSignatures;
			var normalTransaction;

			it('should be ok when add transaction to unverified with invalid signature', function (done) {
				invalidSignature = _.cloneDeep(hackedTransactions[0]);

				transactionPool.add(invalidSignature, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when add normal transaction type 4 to unverified', function (done) {
				completedSignatures = _.cloneDeep(transactions[4][0]);

				transactionPool.add(completedSignatures, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when add transaction type 4 to unverified without enough signatures', function (done) {
				notEnoughSignatures = _.cloneDeep(transactions[4][2]);

				transactionPool.add(notEnoughSignatures, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when process pool transactions', function (done) {
				transactionPool.processPool(function (err, cbprPool) {
					expect(error.args[0][0]).to.equal('Failed to process unverified transaction: ' + invalidSignature.id);
					expect(error.args[0][1]).to.equal('Failed to verify signature');
					poolTotals.invalid += 1;
					poolTotals.ready += 1; 
					poolTotals.pending += 1;
					done();
				});
			});

			it('should be ok when add normal transaction type 2 to unverified', function (done) {
				normalTransaction = _.cloneDeep(transactions[2]);

				transactionPool.add(normalTransaction, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					poolTotals.unverified += 1;
					done();
				});
			});

			it('should be ok when get pool totals', function (done) {
				var totals = transactionPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.be.equal(poolTotals.unverified);
				expect(totals.pending).to.be.equal(poolTotals.pending);
				expect(totals.ready).to.be.equal(poolTotals.ready);
				expect(totals.invalid).to.be.equal(poolTotals.invalid);
				done();
			});

			it('should be ok when get transaction from unverified list', function (done) {
				var transaction = transactionPool.get(normalTransaction.id);

				expect(transaction.transaction).to.deep.equal(normalTransaction);
				expect(transaction.status).to.equal('unverified');
				normalTransaction.receivedAt = transaction.transaction.receivedAt;
				done();
			});

			it('should be ok when get transaction from pending list', function (done) {
				var transaction = transactionPool.get(notEnoughSignatures.id);

				expect(transaction.transaction).to.deep.equal(notEnoughSignatures);
				expect(transaction.status).to.equal('pending');
				notEnoughSignatures.receivedAt = transaction.transaction.receivedAt;
				done();
			});

			it('should be ok when get transaction from ready list', function (done) {
				var transaction = transactionPool.get(completedSignatures.id);

				expect(transaction.transaction).to.deep.equal(completedSignatures);
				expect(transaction.status).to.equal('ready');
				completedSignatures.receivedAt = transaction.transaction.receivedAt;
				done();
			});

			it('should be ok when exprire transactions', function (done) {
				setTimeout(function () {
					transactionPool.expireTransactions(function (err, cbprPool) {
						expect(info.args.length).to.equal(3);
						expect(info.args[0][0]).to.equal(['Expired transaction:', normalTransaction.id, 'received at:', normalTransaction.receivedAt.toUTCString()].join(' '));
						expect(info.args[1][0]).to.equal(['Expired transaction:', notEnoughSignatures.id, 'received at:', notEnoughSignatures.receivedAt.toUTCString()].join(' '));
						expect(info.args[2][0]).to.equal(['Expired transaction:', completedSignatures.id, 'received at:', completedSignatures.receivedAt.toUTCString()].join(' '));
						poolTotals.pending -= 1;
						poolTotals.ready -= 1;
						poolTotals.unverified -= 1;
						done();
					});
				}, 2000);

			});

			it('should be ok when reset invalid transactions list', function (done) {
				var invalidTransactions = transactionPool.resetInvalidTransactions();

				expect(invalidTransactions).to.equal(1);
				poolTotals.invalid -= 1;
				done();
			});

			it('should be ok when get pool totals', function (done) {
				var totals = transactionPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.be.equal(poolTotals.unverified);
				expect(totals.pending).to.be.equal(poolTotals.pending);
				expect(totals.ready).to.be.equal(poolTotals.ready);
				expect(totals.invalid).to.be.equal(poolTotals.invalid);
				done();
			});
		});
	});

	describe('getters', function () {
		var invalidSignature;
		var completedSignatures;
		var notEnoughSignatures;
		var normalTransaction;

		describe('load transactions to pool', function () {

			it('should be ok when add transaction to unverified with invalid signature', function (done) {
				invalidSignature = _.cloneDeep(hackedTransactions[0]);

				transactionPool.add(invalidSignature, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when add normal transaction type 4 to unverified', function (done) {
				completedSignatures = _.cloneDeep(transactions[4][0]);

				transactionPool.add(completedSignatures, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when add transaction type 4 to unverified without enough signatures', function (done) {
				notEnoughSignatures = _.cloneDeep(transactions[4][2]);

				transactionPool.add(notEnoughSignatures, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when process pool transactions', function (done) {
				transactionPool.processPool(function (err, cbprPool) {
					expect(error.args[0][0]).to.equal('Failed to process unverified transaction: ' + invalidSignature.id);
					expect(error.args[0][1]).to.equal('Failed to verify signature');
					poolTotals.invalid += 1;
					poolTotals.ready += 1; 
					poolTotals.pending += 1;
					done();
				});
			});

			it('should be ok when add normal transaction type 2 to unverified', function (done) {
				normalTransaction = _.cloneDeep(transactions[2]);

				transactionPool.add(normalTransaction, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					poolTotals.unverified += 1;
					done();
				});
			});

			it('should be ok when add normal transaction type 3 to unverified', function (done) {
				var normalTransactionT3 = _.cloneDeep(transactions[3]);
				normalTransactionT3.requesterPublicKey = '849b37aaeb6038aebbe7e7341735d7a9d207da1851b701d87db5426651ed3fe8';
				transactionPool.add(normalTransactionT3, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					poolTotals.unverified += 1;
					done();
				});
			});
		});

		describe('get transaction by id', function () {

			it('should be ok when transaction is in unverified list', function (done) {
				var transaction = transactionPool.get(normalTransaction.id);

				expect(transaction.transaction).to.deep.equal(normalTransaction);
				expect(transaction.status).to.equal('unverified');
				done();
			});

			it('should be ok when transaction is in pending list', function (done) {
				var transaction = transactionPool.get(notEnoughSignatures.id);

				expect(transaction.transaction).to.deep.equal(notEnoughSignatures);
				expect(transaction.status).to.equal('pending');
				done();
			});

			it('should be ok when transaction is in ready list', function (done) {
				var transaction = transactionPool.get(completedSignatures.id);

				expect(transaction.transaction).to.deep.equal(completedSignatures);
				expect(transaction.status).to.equal('ready');
				done();
			});

			it('should fail when transaction is not in the pool', function (done) {
				var transaction = transactionPool.get(transactions[0].id);

				expect(transaction.transaction).to.be.undefined;
				expect(transaction.status).to.equal('Transaction not in pool');
				done();
			});
		});

		describe('getAll', function () {

			describe('by pool list', function () {

				it('should be ok when check pool list unverified', function (done) {
					var transactions = transactionPool.getAll('unverified', { limit: null });

					expect(Object.keys(transactions).length).to.equal(2);
					done();
				});

				it('should be ok when check pool list unverified with limit', function (done) {
					var transactions = transactionPool.getAll('unverified', { limit: 1 });

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should be ok when check pool list pending', function (done) {
					var transactions = transactionPool.getAll('pending', { limit: null });

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should be ok when check pool list pending with limit', function (done) {
					var transactions = transactionPool.getAll('pending', { limit: 1 });

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should be ok when check pool list ready', function (done) {
					var transactions = transactionPool.getAll('ready', { limit: null });

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should be ok when check pool list ready with limit', function (done) {
					var transactions = transactionPool.getAll('ready', { limit: 1 });

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should fail when filter is invalid', function (done) {
					var transactions = transactionPool.getAll('unknown', { limit: null });

					expect(transactions).to.equal('Invalid filter');
					done();
				});
			});

			describe('by id (address) and publicKey', function () {

				it('should be ok when sender account is valid', function (done) {
					var transactions = transactionPool.getAll('sender_id', { id: '2737453412992791987L' });

					expect(transactions.unverified.length).to.equal(1);
					expect(transactions.pending.length).to.equal(0);
					expect(transactions.ready.length).to.equal(1);
					done();
				});

				it('should be ok when recipient account is valid', function (done) {
					var transactions = transactionPool.getAll('recipient_id', { id: '2737453412992791987L' });

					expect(transactions.unverified.length).to.equal(1);
					expect(transactions.pending.length).to.equal(0);
					expect(transactions.ready.length).to.equal(0);
					done();
				});

				it('should be ok when sender publicKey is valid', function (done) {
					var transactions = transactionPool.getAll('sender_pk', { publicKey: '849b37aaeb6038aebbe7e7341735d7a9d207da1851b701d87db5426651ed3fe8' });

					expect(transactions.unverified.length).to.equal(1);
					expect(transactions.pending.length).to.equal(1);
					expect(transactions.ready.length).to.equal(0);
					done();
				});

				it('should be ok when requester publicKey is valid', function (done) {
					var transactions = transactionPool.getAll('recipient_pk', { publicKey: '849b37aaeb6038aebbe7e7341735d7a9d207da1851b701d87db5426651ed3fe8' });

					expect(transactions.unverified.length).to.equal(1);
					expect(transactions.pending.length).to.equal(0);
					expect(transactions.ready.length).to.equal(0);
					done();
				});
			});
		});
	});

	describe('unverified', function () {

		describe('method add', function () {

			it('should be ok when add transactions to fill pool storage', function (done) {
				var transactions = [];
				invalidsTransactions.forEach(function (e) {
					if (Array.isArray(e)) {
						transactions = transactions.concat(e);
					} else {
						transactions.push(e);
					}
				});
				transactionPool.add(transactions, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					expect(err).to.equal('Transaction pool is full');
					done();
				});
			});

			it('should be ok when pool totals are equal to pool storage limit', function (done) {
				var totals = transactionPool.getUsage();
				var currentStorage = totals.unverified + totals.pending + totals.ready;
				expect(totals).to.be.an('object');
				expect(currentStorage).to.equal(poolStorageTransactionsLimit);
				poolTotals = totals;
				done();
			});

			it('should fail when add transaction and pool storage is full', function (done) {
				var extraTransaction = node.lisk.transaction.createTransaction(testAccounts[1].account.address, 300000000, testAccounts[0].secret);
				transactionPool.add(extraTransaction, function (err, cbtransaction) {
					expect(err).to.equal('Transaction pool is full');
					done();
				});
			});
		});

		describe('method delete', function () {

			it('should be ok when delete a transaction from unverified', function (done) {
				var deleteTransaction = transactionPool.delete(invalidsTransactions[0]);

				expect(deleteTransaction).to.be.an('array').that.is.not.empty;
				expect(deleteTransaction.length).to.equal(1);
				expect(deleteTransaction[0]).to.equal('unverified');
				done();
			});

			it('should be ok when check unverified value decreased in 1', function (done) {
				var totals = transactionPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.equal(poolTotals.unverified - 1);
				poolTotals = totals;
				done();
			});

			it('should fail when delete transaction that is not in pool', function (done) {
				var deleteTransaction = transactionPool.delete(transactions[0]);

				expect(deleteTransaction).to.be.an('array').that.is.empty;
				done();
			});
		});
	});

	describe('ready', function () {
		describe('method addReady/getReady', function () {
			var allTransactions = [];
			transactions.forEach(function (e) {
				if (Array.isArray(e)) {
					allTransactions = allTransactions.concat(e);
				} else {
					allTransactions.push(e);
				}
			});
			allTransactions.pop();

			it('should be ok when add transactions to ready', function (done) {
				transactionPool.addReady(allTransactions, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					poolTotals.ready += allTransactions.length -1;
					done();
				});
			});

			it('should be ok when get transactions from ready', function (done) {
				var readyTransactions = transactionPool.getReady();

				expect(readyTransactions[0].fee).to.be.at.least(readyTransactions[1].fee);
				expect(readyTransactions[1].fee).to.be.at.least(readyTransactions[2].fee);
				expect(readyTransactions[2].fee).to.be.at.least(readyTransactions[3].fee);
				expect(readyTransactions[3].fee).to.be.at.least(readyTransactions[4].fee);
				expect(readyTransactions[4].fee).to.be.at.least(readyTransactions[5].fee);
				done();
			});

			it('should be ok when add type 2 transaction again to ready', function (done) {
				transactionPool.addReady(transactions[2], function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when get transactions from ready', function (done) {
				var readyTransactions = transactionPool.getReady();

				expect(readyTransactions[0].receivedAt).to.not.equal(readyTransactions[1].receivedAt);
				expect(readyTransactions[1].receivedAt).to.equal(readyTransactions[2].receivedAt);
				expect(readyTransactions[2].receivedAt).to.equal(readyTransactions[3].receivedAt);
				expect(readyTransactions[3].receivedAt).to.equal(readyTransactions[4].receivedAt);
				done();
			});

			it('should be ok when delete transaction from ready', function (done) {
				var deleteTransaction = transactionPool.delete(transactions[0]);

				expect(deleteTransaction).to.be.an('array').that.is.not.empty;
				expect(deleteTransaction.length).to.equal(1);
				expect(deleteTransaction[0]).to.equal('ready');
				poolTotals.ready -= 1;
				done();
			});

			it('should be ok when check ready value decreased in 1', function (done) {
				var totals = transactionPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.ready).to.equal(poolTotals.ready);
				done();
			});
		});
	});

	describe('broadcast transactions', function () {
		var broadcastTransaction;

		it('should be ok when serialize transaction', function (done) {
			broadcastTransaction = bson.serialize(transactions[0]);

			expect(broadcastTransaction).that.is.an('Uint8Array');
			done();
		});

		it('should be ok when deserialized size is greater than serialized size', function (done) {
			var serializedLenght = Buffer.from(broadcastTransaction).length;
			var deserializedLenght = Buffer.from(JSON.stringify(transactions[0])).length;

			expect(deserializedLenght).to.be.at.least(serializedLenght);
			done();
		});

		it('should be ok when deserialize transaction', function (done) {
			broadcastTransaction = bson.deserialize(broadcastTransaction);

			expect(broadcastTransaction).to.deep.equal(transactions[0]);
			done();
		});
	});

	describe('checkBalance', function () {

		it('should be ok when checked account balance with enough LSK for transaction', function (done) {
			transactionPool.checkBalance(transactions[0], { address: transactions[0].senderId }, function (err, cbBalance) {
				expect(cbBalance).to.equal('balance: 52999994');
				done();
			});
		});

		it('should fail when checked account balance with not enough LSK for transaction', function (done) {
			transactionPool.checkBalance(invalidsTransactions[0], { address: invalidsTransactions[0].senderId }, function (err, cbBalance) {
				expect(err).to.equal('Account does not have enough LSK: 2896019180726908125L balance: 0');
				done();
			});
		});
	});
});
