'use strict';

var expect = require('chai').expect;
var sinon  = require('sinon');
var _ = require('lodash');
var node = require('../../../node');

var modulesLoader = require('../../../common/initModule').modulesLoader;
var TxPool = require('../../../../logic/transactions/pool.js');
var Transaction = require('../../../../logic/transaction.js');
var Account = require('../../../../logic/account.js');
var bson = require('../../../../helpers/bson.js');

var transactionTypes = require('../../../../helpers/transactionTypes');
var Vote = require('../../../../logic/vote.js');
var Transfer = require('../../../../logic/transfer.js');
var Delegate = require('../../../../logic/delegate.js');
var Signature = require('../../../../logic/signature.js');
var Multisignature = require('../../../../logic/multisignature.js');

var testAccounts = [
	{
		account: {
			username: 'txp_test_1',
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
			username: 'txp_test_2',
			isDelegate: 0,
			address: '2896019180726908125L',
			publicKey: '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
			balance: 0,
			u_balance: 0
		},
		secret: 'joy ethics cruise churn ozone asset quote renew dutch erosion seed pioneer',
	},{
		account: {
			username: 'txp_test_3',
			isDelegate: 0,
			address: '15240249857307028085L',
			publicKey: '181414336a6642307feda947a697c36f299093de35bf0fb263ccdeccb497962c',
			balance: 3500000000000000,
			u_balance: 3500000000000000
		},
		secret: 'song gather until exercise explain utility walk choice garbage cross route develop',
	},{
		account: {
			username: 'txp_test_4',
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
	node.lisk.delegate.createDelegate(testAccounts[3].secret, 'txp_new_delegate'),
	/* Type: 3 - Submit votes.*/
	node.lisk.vote.createVote(testAccounts[0].secret, 
		['+c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5']),
	/* Type: 4 - Multisignature registration.*/
];

var invalidsTxs = [
	/* Type: 0 - Transmit funds account without enough credit.*/
	node.lisk.transaction.createTransaction(testAccounts[0].account.address, 4400000000, testAccounts[1].secret),
	/* Type: 1 - Register a second signature account without enough credit.*/
	node.lisk.signature.createSignature(testAccounts[1].secret, testAccounts[0].secret2),
	/* Type: 2.*/
	[
		/* - Register a delegate account without enough credit.*/
		node.lisk.delegate.createDelegate('genre spare shed home aim achieve second garbage army erode rubber baby', 'txp_new_delegate'),
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
		/* - Submit votes to an account taht is not a delegate.*/
		node.lisk.vote.createVote(testAccounts[2].secret, 
			['+181414336a6642307feda947a697c36f299093de35bf0fb263ccdeccb497962c'])
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

describe('txPool', function () {
	
	var accounts;
	var txPool;
	var poolTotals;
	var txReady;
	var poolStorageTxsLimit;

	before(function (done) {
		
		modulesLoader.scope.config.transactions.poolStorageTxsLimit = 6;
		modulesLoader.scope.config.transactions.poolProcessInterval = 60000000;
		modulesLoader.scope.config.transactions.poolExpiryInterval = 300000000;

		modulesLoader.initLogicWithDb(Account, function (err, __accountLogic) {
			if (err) {
				return done(err);
			}
			modulesLoader.initLogic(Transaction, modulesLoader.scope, function (err, __trsLogic) {
				if (err) {
					return done(err);
				}
				poolStorageTxsLimit = modulesLoader.scope.config.transactions.poolStorageTxsLimit;
				txPool = new TxPool(
					modulesLoader.scope.config.broadcasts.broadcastInterval,
					modulesLoader.scope.config.broadcasts.releaseLimit,
					modulesLoader.scope.config.transactions.poolStorageTxsLimit,
					modulesLoader.scope.config.transactions.poolProcessInterval,
					modulesLoader.scope.config.transactions.poolExpiryInterval,
					__trsLogic,
					__accountLogic,
					modulesLoader.scope.bus,
					modulesLoader.scope.logger
				);
	
				modulesLoader.initModules([
					{accounts: require('../../../../modules/accounts')},
					{delegates: require('../../../../modules/delegates')},
				], [
					{'transaction': require('../../../../logic/transaction')},
					{'account': require('../../../../logic/account')}
				], {}, function (err, __modules) {
					if (err) {
						return done(err);
					}
					var logicDelegates = new Delegate(modulesLoader.scope.schema);
					logicDelegates.bind(__modules.accounts);

					var logicVote = new Vote(modulesLoader.scope.logger, modulesLoader.scope.schema);
					logicVote.bind(__modules.delegates);

					__modules.accounts.onBind(__modules);
					accounts = __modules.accounts;
					
					__modules.delegates.onBind(__modules);

					txPool.bind(__modules.accounts);

					__trsLogic.attachAssetType(transactionTypes.VOTE, logicVote);
					__trsLogic.attachAssetType(transactionTypes.SEND, new Transfer(modulesLoader.scope.logger, modulesLoader.scope.schema));
					__trsLogic.attachAssetType(transactionTypes.DELEGATE, logicDelegates);
					__trsLogic.attachAssetType(transactionTypes.SIGNATURE, new Signature(modulesLoader.scope.schema, modulesLoader.scope.logger));
					__trsLogic.attachAssetType(transactionTypes.MULTI, new Multisignature());

					done();
				});
			});
		}, modulesLoader.scope);
	});

	beforeEach(function () {
		resetSpiesState();
	});

	after(function () {
		restoreSpiesState();
	});

	describe('setup database', function () {
		
		it('should be ok when generate account 1', function (done) {
			accounts.setAccountAndGet(testAccounts[0].account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(testAccounts[0].account.address);
				done();
			});
		});
		
		it('should be ok when generate account 2', function (done) {
			accounts.setAccountAndGet(testAccounts[1].account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(testAccounts[1].account.address);
				done();
			});
		});

		it('should be ok when generate account 3', function (done) {
			accounts.setAccountAndGet(testAccounts[2].account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(testAccounts[2].account.address);
				done();
			});
		});
		
		it('should be ok when generate account 4', function (done) {
			accounts.setAccountAndGet(testAccounts[3].account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(testAccounts[3].account.address);
				done();
			});
		});
	});

	describe('process workers', function () {
		
		it('should be ok when get pool totals to initialize local counter', function (done) {
			var totals = txPool.getUsage();

			expect(totals).to.be.an('object');
			expect(totals.unverified).to.be.a('number');
			expect(totals.pending).to.be.a('number');
			expect(totals.ready).to.be.a('number');
			expect(totals.invalid).to.be.a('number');
			poolTotals = totals;
			done();
		});

		describe('processPool', function () {

			describe('Tx type: 0 - Transmit funds', function () {
				var tmpTxInvalidId;

				it('should be ok when add normal transaction to unverified', function (done) {
					txPool.add(transactions[0], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					txPool.add(invalidsTxs[0], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with invalid transaction id', function (done) {
					tmpTxInvalidId = _.cloneDeep(invalidsTxs[0]);
					tmpTxInvalidId.id = '01234567890123456789';

					txPool.add(tmpTxInvalidId, function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when process pool txs', function (done) {
					txPool.processPool(function (err, cbprPool) {
						if (err) {
							done(err);
						}
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTxs[0].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', testAccounts[1].account.address, 'balance: 3'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + tmpTxInvalidId.id);
						expect(error.args[1][1]).to.equal('Invalid transaction id');
						poolTotals.invalid += 1;
						poolTotals.ready += 1;
						done();
					});
				});
	
				it('should fail when add same normal transaction to unverified', function (done) {
					txPool.add(transactions[0], function (err, cbtx) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[0].id);
						done();
					});
				});

				it('should fail when add same transaction with invalid id to unverified', function (done) {
					txPool.add(tmpTxInvalidId, function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + tmpTxInvalidId.id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTx = txPool.delete(transactions[0]);
					
					expect(deletedTx.length).to.equal(1);
					expect(deletedTx[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTxs = txPool.resetInvalidTransactions();
					
					expect(invalidTxs).to.equal(1);
					poolTotals.invalid -= 1;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = txPool.getUsage();
	
					expect(totals).to.be.an('object');
					expect(totals.unverified).to.equal(poolTotals.unverified);
					expect(totals.pending).to.equal(poolTotals.pending);
					expect(totals.ready).to.equal(poolTotals.ready);
					expect(totals.invalid).to.equal(poolTotals.invalid);
					done();
				});
			});
			
			describe('Tx type: 1 - Register a second signature', function () {
				var invalidTransactionType;

				it('should be ok when add normal transaction to unverified', function (done) {
					txPool.add(transactions[1], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					txPool.add(invalidsTxs[1], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when add transaction to unverified with invalid transaction type', function (done) {
					invalidTransactionType = _.cloneDeep(invalidsTxs[0]);
					invalidTransactionType.id = '12345678901234567890';
					invalidTransactionType.type = 99;

					txPool.add(invalidTransactionType, function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});

				it('should be ok when process pool txs', function (done) {
					txPool.processPool(function (err, cbprPool) {
						if (err) {
							done(err);
						}
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTxs[1].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', testAccounts[1].account.address, 'balance: 0'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidTransactionType.id);
						expect(error.args[1][1]).to.equal(['Unknown transaction type', invalidTransactionType.type].join(' '));
						poolTotals.invalid += 1;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					txPool.add(transactions[1], function (err, cbtx) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[1].id);
						done();
					});
				});

				it('should fail when add same transaction with invalid transaction type to unverified', function (done) {
					txPool.add(invalidTransactionType, function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidTransactionType.id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTx = txPool.delete(transactions[1]);
					
					expect(deletedTx.length).to.equal(1);
					expect(deletedTx[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTxs = txPool.resetInvalidTransactions();
					
					expect(invalidTxs).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTxs;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = txPool.getUsage();
	
					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					done();
				});
			});

			describe('Tx type: 2 - Register a delegate', function () {

				it('should be ok when add normal transaction to unverified', function (done) {
					txPool.add(transactions[2], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					txPool.add(invalidsTxs[2][0], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified that already is a delegate', function (done) {
					txPool.add(invalidsTxs[2][1], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified with same username', function (done) {
					txPool.add(invalidsTxs[2][2], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when add transaction to unverified with invalid signature', function (done) {

					txPool.add(hackedTransactions[0], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});

				it('should be ok when process pool txs', function (done) {
					txPool.processPool(function (err, cbprPool) {
						if (err) {
							done(err);
						}
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTxs[2][0].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTxs[2][0].senderId, 'balance: 0'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTxs[2][1].id);
						expect(error.args[1][1]).to.equal('Account is already a delegate');
						expect(error.args[2][0]).to.equal('Failed to process unverified transaction: ' + invalidsTxs[2][2].id);
						expect(error.args[2][1]).to.equal('Username already exists');
						expect(error.args[3][0]).to.equal('Failed to process unverified transaction: ' + hackedTransactions[0].id);
						expect(error.args[3][1]).to.equal('Failed to verify signature');
						poolTotals.invalid += 3;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					txPool.add(transactions[2], function (err, cbtx) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[2].id);
						done();
					});
				});

				it('should fail when add same transaction with registered delegate to unverified', function (done) {
					txPool.add(invalidsTxs[2][1], function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTxs[2][1].id);
						done();
					});
				});

				it('should fail when add same transaction with registered delegate to unverified', function (done) {
					txPool.add(invalidsTxs[2][1], function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTxs[2][1].id);
						done();
					});
				});

				it('should fail when add same transaction with same username to unverified', function (done) {
					txPool.add(invalidsTxs[2][2], function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTxs[2][2].id);
						done();
					});
				});

				it('should fail when add same transaction with invalid signature to unverified', function (done) {
					txPool.add(hackedTransactions[0], function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + hackedTransactions[0].id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTx = txPool.delete(transactions[2]);
					
					expect(deletedTx.length).to.equal(1);
					expect(deletedTx[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTxs = txPool.resetInvalidTransactions();
					
					expect(invalidTxs).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTxs;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = txPool.getUsage();
	
					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					done();
				});
			});

			describe('Tx type: 3 - Submit votes', function () {

				it('should be ok when add normal transaction to unverified', function (done) {
					txPool.add(transactions[3], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					txPool.add(invalidsTxs[3][0], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified that votes a non delegate', function (done) {
					txPool.add(invalidsTxs[3][1], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when process pool txs', function (done) {
					txPool.processPool(function (err, cbprPool) {
						if (err) {
							done(err);
						}
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTxs[3][0].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTxs[3][0].senderId, 'balance: 0'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTxs[3][1].id);
						expect(error.args[1][1]).to.equal('Delegate not found');
						poolTotals.invalid += 1;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					txPool.add(transactions[3], function (err, cbtx) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[3].id);
						done();
					});
				});

				it('should fail when add same transaction that votes a non delegate to unverified', function (done) {
					txPool.add(invalidsTxs[3][1], function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTxs[3][1].id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTx = txPool.delete(transactions[3]);
					
					expect(deletedTx.length).to.equal(1);
					expect(deletedTx[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTxs = txPool.resetInvalidTransactions();
					
					expect(invalidTxs).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTxs;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = txPool.getUsage();
	
					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					done();
				});
			});

			describe('Tx type: 4 - Multisignature registration', function () {

				it('should be ok when add normal transaction to unverified', function (done) {
					txPool.add(transactions[4], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when add transaction to unverified with not enough LSK', function (done) {
					txPool.add(invalidsTxs[4][0], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});

				it('should be ok when add transaction to unverified that votes a non delegate', function (done) {
					txPool.add(invalidsTxs[4][1], function (err, cbtx) {
						if (err) {
							done(err);
						}
						expect(cbtx).to.be.undefined;
						done();
					});
				});
	
				it('should be ok when process pool txs', function (done) {
					txPool.processPool(function (err, cbprPool) {
						if (err) {
							done(err);
						}
						expect(error.args[0][0]).to.equal('Failed to check balance transaction: ' + invalidsTxs[4][0].id);
						expect(error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTxs[4][0].senderId, 'balance: 0'].join(' '));
						expect(error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTxs[4][1].id);
						expect(error.args[1][1]).to.equal('Delegate not found');
						poolTotals.invalid += 1;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when add same normal transaction to unverified', function (done) {
					txPool.add(transactions[3], function (err, cbtx) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[3].id);
						done();
					});
				});

				it('should fail when add same transaction that votes a non delegate to unverified', function (done) {
					txPool.add(invalidsTxs[4][1], function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTxs[4][1].id);
						done();
					});
				});

				it('should be ok when delete normal transaction from ready', function (done) {
					var deletedTx = txPool.delete(transactions[4]);
					
					expect(deletedTx.length).to.equal(1);
					expect(deletedTx[0]).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when reset invalid transactions list', function (done) {
					var invalidTxs = txPool.resetInvalidTransactions();
					
					expect(invalidTxs).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTxs;
					done();
				});

				it('should be ok when get pool totals', function (done) {
					var totals = txPool.getUsage();
	
					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					done();
				});
			});
		});

		describe('expireTransactions', function () {
		});
	});

	describe('unverified', function () {

		describe('method add', function () {

			it('should be ok when add transactions to fill pool storage', function (done) {
				var trx = transactions.concat(invalidsTxs);
				txPool.add(trx, function (err, cbtx) {
					if (err) {
						done(err);
					}
					expect(cbtx).to.be.undefined;
					done();
				});
			});

			it('should be ok when pool totals are equal to pool storage limit', function (done) {
				var totals = txPool.getUsage();
				var currentStorage = totals.unverified + totals.pending + totals.ready;
				expect(totals).to.be.an('object');
				expect(currentStorage).to.equal(poolStorageTxsLimit);
				poolTotals = totals;
				done();
			});

			it('should fail when add transaction and pool storage is full', function (done) {
				var extraTransaction = node.lisk.transaction.createTransaction(testAccounts[1].account.address, 300000000, testAccounts[0].secret);
				txPool.add(extraTransaction, function (err, cbtx) {
					expect(err).to.equal('Transaction pool is full');
					done();
				});
			});
		});

		describe('method delete', function () {

			it('should be ok when delete a transaction from unverified', function (done) {
				var deleteTx = txPool.delete(transactions[0]);

				expect(deleteTx).to.be.an('array').that.is.not.empty;
				expect(deleteTx.length).to.equal(1);
				expect(deleteTx[0]).to.equal('unverified');
				done();
			});

			it('should be ok when check unverified value decreased in 1', function (done) {
				var totals = txPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.equal(poolTotals.unverified - 1);
				poolTotals = totals;
				done();
			});

			it('should fail when delete transaction that is not in pool', function (done) {
				var deleteTx = txPool.delete(transactions[0]);

				expect(deleteTx).to.be.an('array').that.is.empty;
				done();
			});
		});
	});
	
	describe('ready', function () {
		describe('method addReady/getReady', function () {

			it('should be ok when add transactions to ready', function (done) {
				txPool.addReady(transactions.slice(0,5), function (err, cbtx) {
					if (err) {
						done(err);
					}
					expect(cbtx).to.be.undefined;
					poolTotals.ready += transactions.slice(0,5).length;
					done();
				});
			});

			it('should be ok when get transactions from ready', function (done) {
				var readyTxs = txPool.getReady();
				expect(readyTxs[0].fee).to.be.at.least(readyTxs[1].fee);
				expect(readyTxs[1].fee).to.be.at.least(readyTxs[2].fee);
				expect(readyTxs[2].fee).to.be.at.least(readyTxs[3].fee);
				expect(readyTxs[3].fee).to.be.at.least(readyTxs[4].fee);
				done();
			});

			it('should be ok when add type 2 transaction again to ready', function (done) {
				txPool.addReady(transactions[2], function (err, cbtx) {
					if (err) {
						done(err);
					}
					expect(cbtx).to.be.undefined;
					done();
				});
			});

			it('should be ok when get transactions from ready', function (done) {
				var readyTxs = txPool.getReady();
				expect(readyTxs[0].receivedAt).to.not.equal(readyTxs[1].receivedAt);
				expect(readyTxs[1].receivedAt).to.equal(readyTxs[2].receivedAt);
				expect(readyTxs[2].receivedAt).to.equal(readyTxs[3].receivedAt);
				expect(readyTxs[3].receivedAt).to.equal(readyTxs[4].receivedAt);
				done();
			});

			it('should be ok when delete transaction from ready', function (done) {
				var deleteTx = txPool.delete(transactions[0]);

				expect(deleteTx).to.be.an('array').that.is.not.empty;
				expect(deleteTx.length).to.equal(1);
				expect(deleteTx[0]).to.equal('ready');
				done();
			});

			it('should be ok when check ready value decreased in 1', function (done) {
				var totals = txPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.ready).to.equal(poolTotals.ready - 1);
				poolTotals = totals;
				done();
			});
		});
	});

	describe('broadcast transactions', function () {
		var broadcastTx;

		it('should be ok when serialize transaction', function (done) {
			broadcastTx = bson.serialize(transactions[0]);
			expect(broadcastTx).that.is.an('Uint8Array');
			done();
		});

		it('should be ok when deserialized size is greater than serialized size', function (done) {
			var serializedLenght = Buffer.from(broadcastTx).length;
			var deserializedLenght = Buffer.from(JSON.stringify(transactions[0])).length;

			expect(deserializedLenght).to.be.at.least(serializedLenght);
			done();
		});

		it('should be ok when deserialize transaction', function (done) {
			broadcastTx = bson.deserialize(broadcastTx);
			expect(broadcastTx).to.deep.equal(transactions[0]);
			done();
		});
	});

	describe('checkBalance', function () {

		it('should be ok when checked account balance with enough LSK for transaction', function (done) {
			txPool.checkBalance(transactions[5], transactions[5].senderId, function (err, cbBalance) {
				if (err) {
					done(err);
				}
				expect(cbBalance).to.equal('balance: 52999955.9');
				done();
			});
		});

		it('should fail when checked account balance with not enough LSK for transaction', function (done) {
			txPool.checkBalance(transactions[6], transactions[6].senderId, function (err, cbBalance) {
				if (err) {
					expect(err).to.equal('Account does not have enough LSK: 2896019180726908125L balance: 0');
					done();
				}
			});
		});
	});

	describe('getters', function () {

		describe('get transaction by id', function () {

			it.skip('should be ok when transaction is in unverified list', function (done) {
				var transaction = txPool.get(transactions[5].id);
				expect(transaction.tx).to.deep.equal(transactions[5]);
				expect(transaction.status).to.equal('unverified');
				done();
			});

			it.skip('should be ok when transaction is in pending list', function (done) {
				var transaction = txPool.get(transactions[5].id);
				expect(transaction.tx).to.deep.equal(transactions[5]);
				expect(transaction.status).to.equal('pending');
				done();
			});

			it('should be ok when transaction is in ready list', function (done) {
				var transaction = txPool.get(transactions[5].id);
				expect(transaction.tx).to.deep.equal(transactions[5]);
				expect(transaction.status).to.equal('ready');
				done();
			});

			it('should fail when transaction is not in the pool', function (done) {
				var transaction = txPool.get(transactions[0].id);
				expect(transaction.tx).to.be.undefined;
				expect(transaction.status).to.equal('Transaction not in pool');
				done();
			});
		});

		describe('getAll', function () {

			describe('by pool list', function () {

				it('should be ok when pool list is unverified', function (done) {
					var txs = txPool.getAll('unverified', { limit: null});
					expect(txs.length).to.equal(0);
					done();
				});
	
				it('should be ok when pool list is pending', function (done) {
					var txs = txPool.getAll('pending', { limit: null});
					expect(txs.length).to.equal(0);
					done();
				});
				
				it('should be ok when pool list is ready', function (done) {
					var txs = txPool.getAll('ready', { limit: null});
					expect(txs.length).to.equal(5);
					done();
				});
	
				it('should fail when filter is invalid', function (done) {
					var txs = txPool.getAll('unknown', { limit: null});
					expect(txs).to.equal('Invalid filter');
					done();
				});
			});

			describe('by id (address) and publicKey', function () {
				
				it('should be ok when sender account is valid', function (done) {
					var txs = txPool.getAll('sender_id', { id: '2737453412992791987L' });
	
					expect(txs.unverified.length).to.equal(0);
					expect(txs.pending.length).to.equal(0);
					expect(txs.ready.length).to.equal(3);
					done();
				});
	
				it('should be ok when recipient account is valid', function (done) {
					var txs = txPool.getAll('recipient_id', { id: '16313739661670634666L' });
	
					expect(txs.unverified.length).to.equal(0);
					expect(txs.pending.length).to.equal(0);
					expect(txs.ready.length).to.equal(1);
					done();
				});

				it('should be ok when sender publicKey is valid', function (done) {
					var txs = txPool.getAll('sender_pk', { publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5' });
	
					expect(txs.unverified.length).to.equal(0);
					expect(txs.pending.length).to.equal(0);
					expect(txs.ready.length).to.equal(3);
					done();
				});
	
				it('should be ok when requester publicKey is valid', function (done) {
					var txs = txPool.getAll('recipient_pk', { publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5' });
	
					expect(txs.unverified.length).to.equal(0);
					expect(txs.pending.length).to.equal(0);
					expect(txs.ready.length).to.equal(0);
					done();
				});
			});
		});
	});
});