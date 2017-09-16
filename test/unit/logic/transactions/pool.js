'use strict';

var expect = require('chai').expect;

var modulesLoader = require('../../../common/initModule').modulesLoader;
var TxPool = require('../../../../logic/transactions/pool.js');
var Transaction = require('../../../../logic/transaction.js');
var Account = require('../../../../logic/account.js');
var bson = require('../../../../helpers/bson.js');

var transactions = [
	/* type: 0 - Transmit funds */
	{
		'type': 0,
		'amount': 300000000,
		'fee': 10000000,
		'timestamp': 37943880,
		'recipientId': '2896019180726908125L',
		'senderId': '2737453412992791987L',
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '1'
	},
	/* type: 1 - Register a second signature */
	{
		'type': 1,
		'amount': 0,
		'timestamp': 37943881,
		'fee': 500000000,
		'asset': {
			'signature': {
				'publicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb'
			}
		},
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'senderId': '2737453412992791987L',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '2'
	},
	/* type: 2 - Register a delegate */
	{
		'type': 2,
		'amount': 0,
		'timestamp': 37943882,
		'fee': 2500000000,
		'asset': {
			'delegate': {
				'username': 'test_delegate_1',
				'publicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb'
			}
		},
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'senderId': '2737453412992791987L',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '3'
	},
	/* type: 3 - Submit votes */
	{
		'type': 3,
		'amount': 0,
		'timestamp': 37943883,
		'fee': 100000000,
    'asset': {
			'votes': []
		},
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'senderId': '2737453412992791987L',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '4'
	},
	/* type: 4 - Multisignature registration */
	{
    'type': 4,
    'timestamp': 37943884,
    'fee': 1000000000,
    'asset': {
        'multisignature': {
            'min': 2,
            'lifetime': 24,
						'keysgroup': [
							"+684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb",
							"+c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5"
						]
        }
		},
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'senderId': '2737453412992791987L',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '5'
	},
	/* type: 0 - Transmit funds */
	{
		'type': 0,
		'amount': 300000000,
		'fee': 10000000,
		'timestamp': 37943886,
		'recipientId': '2896019180726908125L',
		'senderId': '2737453412992791987L',
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '6'
	},
	/* type: 0 - Transmit funds Account does not have enough LSK*/
	{
		'type': 0,
		'amount': 800000000,
		'fee': 10000000,
		'timestamp': 37943885,
		'recipientId': '2737453412992791987L',
		'senderId': '2896019180726908125L',
		'senderPublicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '7'
	}
];

var extraTransaction = 	{
	'type': 0,
	'amount': 400000000,
	'fee': 10000000,
	'timestamp': 37943890,
	'recipientId': '2896019180726908125L',
	'senderId': '13898484363564790288L',
	'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
	'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
	'id': '8'
};

var testAccounts = [
	{
		account: {
			username: 'test_1',
			isDelegate: 1,
			address: '2737453412992791987L',
			publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
			balance: 5300000000000000,
		},
		secret: 'message crash glance horror pear opera hedgehog monitor connect vague chuckle advice',
	},{
		account: {
			username: 'test_2',
			isDelegate: 0,
			address: '2896019180726908125L',
			publicKey: '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
			balance: 0,
		},
		secret: 'joy ethics cruise churn ozone asset quote renew dutch erosion seed pioneer',
	},{
		account: {
			username: 'test_3',
			isDelegate: 0,
			address: '15240249857307028085L',
			publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
			balance: 3500000000000000,
		},
		secret: 'song gather until exercise explain utility walk choice garbage cross route develop',
	},{
		account: {
			username: 'test_4',
			isDelegate: 0,
			address: '13898484363564790288L',
			publicKey: '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
			balance: 3500000000000000,
		},
		secret: 'island pizza tilt scrap spend guilt one guitar range narrow rough hotel',
	}
];

describe('txPool', function () {
	
	var accounts;
	var txPool;
	var poolTotals;
	var txReady;
	var poolStorageTxsLimit;

	before(function (done) {
		
		modulesLoader.scope.config.transactions.poolStorageTxsLimit = 6;
		modulesLoader.scope.config.transactions.poolProcessInterval = 6000;
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
				], [
					{'transaction': require('../../../../logic/transaction')},
					{'account': require('../../../../logic/account')}
				], {}, function (err, __modules) {
					if (err) {
						return done(err);
					}
					txPool.bind(
						__modules.accounts,
						null,
						__modules.loader
					);
					__modules.accounts.onBind(__modules);
					accounts = __modules.accounts;
					done();
				});
			});
		}, modulesLoader.scope);
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

	describe('unverified', function () {

		describe('method add', function () {

			it('should be ok when get pool totals', function (done) {
				var totals = txPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.be.a('number');
				expect(totals.pending).to.be.a('number');
				expect(totals.ready).to.be.a('number');
				poolTotals = totals;
				done();
			});

			it('should be ok when add transaction type 0 to unverified', function (done) {
				txPool.add(transactions[0], function (err, cbtx) {
					if (err) {
						done(err);
					}
					expect(cbtx).to.be.undefined;
					done();
				});
			});

			it('should be ok when check unverified value increased in 1', function (done) {
				var totals = txPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.equal(poolTotals.unverified + 1);
				poolTotals = totals;
				done();
			});

			it('should fail when add same transaction type 0 to unverified', function (done) {
				txPool.add(transactions[0], function (err, cbtx) {
					expect(err).to.equal('Transaction is already in pool: ' + transactions[0].id);
					done();
				});
			});

			it('should be ok when add transactions to fill pool storage', function (done) {
				var trx = transactions.slice(1,transactions.length-1);
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

	describe('process worker', function () {

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
					var txs = txPool.getAll('unverified', { reverse: true, limit: null});
					expect(txs.length).to.equal(0);
					done();
				});
	
				it('should be ok when pool list is pending', function (done) {
					var txs = txPool.getAll('pending', { reverse: true, limit: null});
					expect(txs.length).to.equal(0);
					done();
				});
				
				it('should be ok when pool list is ready', function (done) {
					var txs = txPool.getAll('ready', { reverse: true, limit: null});
					expect(txs.length).to.equal(5);
					done();
				});
	
				it('should fail when filter is invalid', function (done) {
					var txs = txPool.getAll('unknown', { reverse: true, limit: null});
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

		describe('next', function () {

		});
	});
});