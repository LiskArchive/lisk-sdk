'use strict';

var expect = require('chai').expect;
var sinon  = require('sinon');
var _ = require('lodash');
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


var transactions = [
	/* type: 0 - Transmit funds */
	{
		'type': 0,
		'amount': 300000000,
		'fee': 10000000,
		'recipientId': '2896019180726908125L',
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'timestamp': 41721274,
		'asset': {},
		'signature': '07c2c8622000bdfb97e1321d889cef40d7ca7faee4493f220edafd3e56fd15c425a1549b50faa91affbccaf54de406fbe047c70407d1e9f7ef637941539fb30e',
		'id': '14274723388740956065'
	},
	/* type: 1 - Register a second signature */
	{
		'type': 1,
		'amount': 0,
		'fee': 500000000,
		'recipientId': null,
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'timestamp': 41808966,
		'asset': {
			'signature': {
				'publicKey': '8ccfeb0e05a84124fb8e9932ea5d1744617907ef5b51ffde12e24a805ae992fa'
			}
		},
		'signature': '82dc975a49b5fcb19d05b736f7c53978c9973619ef2822e0dfaf0160e1d21a7c5ceb81abb62ebcacfa1c8c3a501035103e252d65fbd5518e38db71f7acc3c20d',
		'id': '16927110199431968159'
	},
	/* type: 2 - Register a delegate */
	{
		'type': 2,
		'amount': 0,
		'fee': 2500000000,
		'recipientId': null,
		'senderPublicKey': '849b37aaeb6038aebbe7e7341735d7a9d207da1851b701d87db5426651ed3fe8',
		'timestamp': 43776413,
		'asset': {
			'delegate': {
				'username': 'txp_new_delegate',
				'publicKey': '849b37aaeb6038aebbe7e7341735d7a9d207da1851b701d87db5426651ed3fe8'
			}
		},
		'signature': '6db720cd875035de6d6e91cd6f48303c1f7baab3f85074e03029af857e71e8af96cf7be33fd2b7bf650c4bf01383dbccfaaba23a4020974fcb9d1912b84a4f0a',
		'id': '4169182049562816689'
	},
	/* type: 3 - Submit votes */
	{
		'type': 3,
		'amount': 0,
		'timestamp': 37943883,
		'fee': 100000000,
		'asset': {
			'votes': [
				'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
				'-141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a'
			]
		},
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'senderId': '2737453412992791987L',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '4'
	},
	/* type: 4 - Multisignature registration */
	{
		'type': 4,
		'amount': 0,
		'fee': 1500000000,
		'recipientId': null,
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'timestamp': 41724474,
		'asset': {
			'multisignature': {
				'min': 2,
				'lifetime': 1,
				'keysgroup': [
					'+684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
					'+c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5'
				]
			}
		},
		'signature': 'ee0eff648d2f48d72bdbc3f0b4dc57910cf5415a7dd70e8d4c1bfa3ab3cbbe7dd7bac730b0484be744edd6aa136569a37929d749ffe987f872dffa0bd7083d04',
		'id': '16356401289337657230'
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

var invalidsTxs = [
	/* type: 0 - Transmit funds account without enough credit*/
	{
		'type': 0,
		'amount': 4400000000,
		'fee': 10000000,
		'recipientId': '2737453412992791987L',
		'senderPublicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
		'timestamp': 42412477,
		'asset': {},
		'signature': '90e303cb9d547acb680852c8fd583b3c798011e9e01739cd4755f8b4a34607157a9629441e3a2093f46f441de3ed6609080be1e5a2bf13c46b8cfea68d4ada09',
		'id': '5123711709529859173'
	},
	/* type: 1 - Register a second signature account without enough credit*/
	{
		'type': 1,
		'amount': 0,
		'fee': 500000000,
		'recipientId': null,
		'senderPublicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
		'timestamp': 42999044,
		'asset': {
			'signature': {
				'publicKey': '8ccfeb0e05a84124fb8e9932ea5d1744617907ef5b51ffde12e24a805ae992fa'
			}
		},
		'signature': '30fb1a449dc132a30fa18ad0e905f4702b19dd5199767b8c3a1673173e8905c75a9163980d2c2a06d48faec6a778139cb1fa784a1cbbaa929395675a64231100',
		'id': '7078486003124131749'
	},
	[
		/* type: 2 - Register a delegate account without enough credit*/
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
			'signature': 'c67bb4f37a2aba0c3e67292ca61fd50064ef3fb32858cbe4b34fa1469ed3978db6b682df609117c1e227156d427bc24f0a3af8bd1ae6ec9194177ad417dd1500',
			'id': '7121061506817701772'
		},
		/* type: 2 - Register a delegate that already is delegate*/
		{
			'type': 2,
			'amount': 0,
			'fee': 2500000000,
			'recipientId': null,
			'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
			'timestamp': 43697153,
			'asset': {
				'delegate': {
					'username': 'txp_test_1',
					'publicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5'
				}
			},
			'signature': 'c9441e49228006e9ab9f5f676c49a56f8ec0eb23c539115912cd5b0d48f51c897d01ad2f5abd6bfac92cadbc3704bce076d1c104c63de1a28b247271c5d72601',
			'id': '358375690571860615'
		},
		/* type: 2 - Register a delegate account with existing username*/
		{
			'type': 2,
			'amount': 0,
			'fee': 2500000000,
			'recipientId': null,
			'senderPublicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
			'timestamp': 43697153,
			'asset': {
				'delegate': {
					'username': 'txp_test_2',
					'publicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb'
				}
			},
			'signature': '3522664cfbe9a5ca3ade309a0c96add1861e29c7f0b3b9aa77177492c69a47f9f7c718dbd415ad49682215826a01579f74d728c6e1bc1c8e808d9ca3a06b8b0c',
			'id': '11660632744648534794'
		}
	],
	{},
	{
		'type': 4,
		'amount': 0,
		'fee': 1500000000,
		'recipientId': null,
		'senderPublicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
		'timestamp': 41725704,
		'asset': {
			'multisignature': {
				'min': 2,
				'lifetime': 1,
				'keysgroup': [
					'+684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
					'+c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5'
				]
			}
		},
		'signature': '6f3e29e8e4d16f3e808133f6bf73858a3e2a932e19173260a4aaf78041399de67ef505186360a8f11a4b6b471f4f146bb9cbb388e3deb12e19540b8524a8760d',
		'id': '2761953166306398206'
	}
	/* type: 0 - Transmit funds invalid senderId and recipientId*/
];

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
				], [
					{'transaction': require('../../../../logic/transaction')},
					{'account': require('../../../../logic/account')}
				], {}, function (err, __modules) {
					if (err) {
						return done(err);
					}
					var logicDelegates = new Delegate(modulesLoader.scope.schema);
					logicDelegates.bind(__modules.accounts);

					__modules.accounts.onBind(__modules);
					accounts = __modules.accounts;
					
					txPool.bind(__modules.accounts);

					__trsLogic.attachAssetType(transactionTypes.VOTE, new Vote(modulesLoader.scope.logger, modulesLoader.scope.schema));
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
				var tmpTxInvalidSignature;

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
					tmpTxInvalidSignature = _.cloneDeep(invalidsTxs[2][0]);
					tmpTxInvalidSignature.signature = '6db720cd875035de6d6e91cd6f48303c1f7baab3f85074e03029af857e71e8af96cf7be33fd2b7bf650c4bf01383dbccfaaba23a4020974fcb9d1912b84a4f0a';
					tmpTxInvalidSignature.id = '16349767733713562311';

					txPool.add(tmpTxInvalidSignature, function (err, cbtx) {
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
						expect(error.args[3][0]).to.equal('Failed to process unverified transaction: ' + tmpTxInvalidSignature.id);
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
					txPool.add(tmpTxInvalidSignature, function (err, cbtx) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + tmpTxInvalidSignature.id);
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
		});

		describe('expireTransactions', function () {
		});
	});

	describe('unverified', function () {

		describe('method add', function () {

			it('should be ok when add transactions to fill pool storage', function (done) {
				var trx = transactions.slice(1,transactions.length-2);
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