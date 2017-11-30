'use strict';

var expect = require('chai').expect;
var sinon  = require('sinon');
var _ = require('lodash');
var rewire = require('rewire');
var slots = require('../../../../helpers/slots.js');

var node = require('../../../node');
var DBSandbox = require('../../../common/globalBefore').DBSandbox;
var modulesLoader = require('../../../common/modulesLoader');
var bson = require('../../../../helpers/bson.js');
var constants = require('../../../../helpers/constants.js');
var TransactionPool = require('../../../../logic/transactions/pool.js');

describe('transactionPool', function () {

	var testAccounts = [
		{
			account: {
				username: 'tpool_test_1',
				address: '2737453412992791987L',
				publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
				balance: 500000000000000
			},
			secret: 'message crash glance horror pear opera hedgehog monitor connect vague chuckle advice',
			secret2: 'monitor connect vague chuckle advice message crash glance horror pear opera hedgehog'
		},{
			account: {
				username: 'tpool_test_2',
				address: '2896019180726908125L',
				publicKey: '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
				balance: 1000
			},
			secret: 'joy ethics cruise churn ozone asset quote renew dutch erosion seed pioneer',
		},{
			account: {
				username: 'tpool_test_3',
				address: '15240249857307028085L',
				publicKey: '181414336a6642307feda947a697c36f299093de35bf0fb263ccdeccb497962c',
				balance: 300000000000000
			},
			secret: 'song gather until exercise explain utility walk choice garbage cross route develop',
		},{
			account: {
				username: 'tpool_test_4',
				address: '13898484363564790288L',
				publicKey: '849b37aaeb6038aebbe7e7341735d7a9d207da1851b701d87db5426651ed3fe8',
				balance: 300000000000000
			},
			secret: 'island pizza tilt scrap spend guilt one guitar range narrow rough hotel',
		}
	];

	var transactions = [
		// Type: 0 - Transfer funds
		node.lisk.transaction.createTransaction(testAccounts[1].account.address, 300000000, testAccounts[0].secret),
		// Type: 1 - Register a second signature
		node.lisk.signature.createSignature(testAccounts[0].secret, testAccounts[0].secret2),
		// Type: 2 - Register a delegate
		node.lisk.delegate.createDelegate(testAccounts[3].secret, 'tpool_new_delegate'),
		// Type: 3 - Place votes
		node.lisk.vote.createVote(testAccounts[0].secret,
			['+c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5']),
		// Type: 4 - Multisignature registration
		[
			// Create normal multisignature, all accounts in database
			createMultisignatureSigned (testAccounts[0].secret, null,
				['+' + testAccounts[1].account.publicKey, '+' + testAccounts[2].account.publicKey],
				[testAccounts[1].secret, testAccounts[2].secret], 1, 2),
			// Create multisignature signed with signer account not registered in database
			createMultisignatureSigned (testAccounts[2].secret, null,
				['+6a23c387172fdf66654f27ccb451ceb4bed7507584c20ed5168f0e7a979f9c5e'],
				['horse endless tag awkward pact reveal kiss april crash interest prefer lunch'], 1, 1),
			// Create 'non-ready' multisignature signed, with pending signatures
			createMultisignatureSigned (testAccounts[3].secret, null,
				['+' + testAccounts[2].account.publicKey,'+' + testAccounts[1].account.publicKey], [testAccounts[2].secret], 1, 2)
		]
	];

	var invalidsTransactions = [
		// Type: 0 - Transfer from account without enough funds
		node.lisk.transaction.createTransaction(testAccounts[0].account.address, 4400000000000, testAccounts[1].secret),
		// Type: 1 - Register a second signature account without enough funds
		node.lisk.signature.createSignature(testAccounts[1].secret, testAccounts[0].secret2),
		// Type: 2
		[
			// - Register a delegate account without enough funds
			node.lisk.delegate.createDelegate('genre spare shed home aim achieve second garbage army erode rubber baby', 'no_credit'),
			// - Register a delegate that is already a delegate
			node.lisk.delegate.createDelegate(testAccounts[0].secret, testAccounts[0].account.username),
			// - Register a delegate account with an existing username
			node.lisk.delegate.createDelegate(testAccounts[1].secret, 'genesis_101')
		],
		// Type: 3
		[
			// - Place votes from an account without enough funds
			node.lisk.vote.createVote(testAccounts[1].secret,
				['+c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5']),
			// - Place votes to an account that is not a delegate
			node.lisk.vote.createVote(testAccounts[2].secret,
				['+181414336a6642307feda947a697c36f299093de35bf0fb263ccdeccb497962c'])
		],
		// Type: 4
		[
			// - Create multisignature group signed from an account without enough funds
			createMultisignatureSigned (testAccounts[1].secret, null,
				['+' + testAccounts[3].account.publicKey], [testAccounts[3].secret], 1, 1),
			// - Create multisignature group signed with invalid signature
			createMultisignatureSigned (testAccounts[3].secret, null,
				['+' + testAccounts[2].account.publicKey], [testAccounts[1].secret], 1, 1)
		]
	];

	var hackedTransactions = [
		// Invalid signature
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
	var logger;
	var library;
	var transactionPool;
	var poolTotals;
	var poolStorageTransactionsLimit;
	var dbSandbox;

	// Reset state of spies
	function resetSpiesState () {
		logger.info.reset();
		logger.warn.reset();
		logger.error.reset();
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

	function getNextForger (offset, cb) {
		offset = !offset ? 1 : offset;

		var lastBlock = library.modules.blocks.lastBlock.get();
		var slot = slots.getSlotNumber(lastBlock.timestamp);

		// TODO: Wait for 0.9.10 backport to 1.0.0 to get delegate list
		// library.modules.delegates.generateDelegateList(lastBlock.height, null, function (err, delegateList) {
		library.modules.delegates.generateDelegateList(function (err, delegateList) {
			if (err) { return cb (err); }
			var nextForger = delegateList[(slot + offset) % slots.delegates];
			return cb(nextForger);
		});
	}

	function forge (cb) {
		var loadDelegates = library.rewiredModules.delegates.__get__('__private.loadDelegates');

		node.async.waterfall([
			loadDelegates,
			transactionPool.processPool,
			function (cb) {
				getNextForger(null, function (delegatePublicKey) {
					cb(null, delegatePublicKey);
				});
			},
			function (delegate, seriesCb) {
				var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');
				var lastBlock = library.modules.blocks.lastBlock.get();
				var slot = slots.getSlotNumber(lastBlock.timestamp) + 1;
				var keypair = keypairs[delegate];
				library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot), function (err) {
					if (err) { return seriesCb(err); }
					lastBlock = library.modules.blocks.lastBlock.get();
					return seriesCb(err);
				});
			}
		], function (err) {
			cb(err);
		});
	}

	function saveBlock (transactions, cb) {
		var loadDelegates = library.rewiredModules.delegates.__get__('__private.loadDelegates');

		node.async.waterfall([ 
			loadDelegates,
			function (seriesCb) {
				getNextForger(null, function (delegatePublicKey) {
					seriesCb(null, delegatePublicKey);
				});
			},
			function createBlock (delegate, seriesCb) {
				var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');
				var lastBlock = library.modules.blocks.lastBlock.get();
				var slot = slots.getSlotNumber(lastBlock.timestamp) + 1;
				var keypair = keypairs[delegate];
				var timestamp = slots.getSlotTime(slot);
				var block = library.logic.block.create({
					keypair: keypair,
					timestamp: timestamp,
					previousBlock: lastBlock,
					transactions: transactions
				});
				block.id = library.logic.block.getId(block);
				block.height = lastBlock.height + 1;
				seriesCb(null, block);
			},
			function applyTransactions (block, seriesCb) {
				node.async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
					library.modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
						if (err) { return seriesCb(err); }
						if (!transaction.senderId) {
							transaction.senderId = library.modules.accounts.generateAddressByPublicKey(transaction.senderPublicKey);
						}				
						library.modules.transactions.apply(transaction, block, sender, function (err) {
							return setImmediate(eachSeriesCb, err);
						});
					});
				}, function (err) {
					return setImmediate(seriesCb, err, block);
				});
			},
			function saveBlock (block, seriesCb) {
				library.modules.blocks.chain.saveBlock(block, function (err) {
					if (err) { return seriesCb(err); }
					library.modules.blocks.lastBlock.set(block);
					var lastBlock = library.modules.blocks.lastBlock.get();
					return seriesCb(err);
				});
			}
		], function (err) {
			cb(err);
		});
	}

	before(function (done) {
		dbSandbox = new DBSandbox(node.config.db, 'lisk_test_logic_transactionPool');
		dbSandbox.create(function (err, __db) {
			if (err) {
				return done(err);
			}

			constants.unconfirmedTransactionTimeOut = 1;
			constants.signatureTransactionTimeOutMultiplier = 1;
			constants.secondsPerHour = 1;

			poolStorageTransactionsLimit =  modulesLoader.scope.config.transactions.pool.storageLimit = 6;

			modulesLoader.scope.config.transactions.pool.processInterval = 60000000;
			modulesLoader.scope.config.transactions.pool.expiryInterval = 80000000;

			// Wait for genesis block to be applied
			node.initApplication(function (err, scope) {
				transactionPool = scope.logic.transactionPool;
				library = scope;
				logger = scope.logger;
				done();
			}, {db: __db});
		});
	});

	beforeEach(function () {
		resetSpiesState();
	});

	after(function (done) {
		dbSandbox.destroy();
		node.appCleanup(done);
	});

	describe('setting up database', function () {

		var transaction;
		var totalDB;

		it('should be ok when adding account 1 transaction to unverified', function (done) {
			transaction = node.lisk.transaction.createTransaction(testAccounts[0].account.address, testAccounts[0].account.balance, node.gAccount.password);

			transactionPool.addFromPeer(transaction, false, function (err, cbtransaction) {
				expect(cbtransaction).to.be.undefined;
				done();
			});
		});

		it('should be ok when adding account 2 transaction to unverified', function (done) {
			transaction = node.lisk.transaction.createTransaction(testAccounts[1].account.address, testAccounts[1].account.balance, node.gAccount.password);

			transactionPool.addFromPeer(transaction, false, function (err, cbtransaction) {
				expect(cbtransaction).to.be.undefined;
				done();
			});
		});

		it('should be ok when adding account 3 transaction to unverified', function (done) {
			transaction = node.lisk.transaction.createTransaction(testAccounts[2].account.address, testAccounts[2].account.balance, node.gAccount.password);

			transactionPool.addFromPeer(transaction, false, function (err, cbtransaction) {
				expect(cbtransaction).to.be.undefined;
				done();
			});
		});

		it('should be ok when adding account 4 transaction to unverified', function (done) {
			transaction = node.lisk.transaction.createTransaction(testAccounts[3].account.address, testAccounts[3].account.balance, node.gAccount.password);

			transactionPool.addFromPeer(transaction, false, function (err, cbtransaction) {
				expect(cbtransaction).to.be.undefined;
				done();
			});
		});

		it('should be ok when adding delegate transaction to unverified', function (done) {
			transaction = node.lisk.delegate.createDelegate(testAccounts[0].secret, testAccounts[0].account.username);

			transactionPool.addFromPeer(transaction, false, function (err, cbtransaction) {
				expect(cbtransaction).to.be.undefined;
				done();
			});
		});

		it('should be ok when getting pool totals to initialize local counter', function (done) {
			var totals = transactionPool.getUsage();

			expect(totals).to.be.an('object');
			expect(totals.unverified).to.be.a('number');
			expect(totals.pending).to.be.a('number');
			expect(totals.ready).to.be.a('number');
			expect(totals.invalid).to.be.a('number');
			totalDB = totals;
			done();
		});

		it('should be ok when processing transactions and creating blocks', function (done) {
			setTimeout(function () {
				forge(function (err, cbForge) {
					expect(err).to.be.null;
					expect(cbForge).to.be.undefined;
					totalDB.unverified = 0;
					done();
				});
			}, 800);
		});

		it('should be ok when getting pool totals', function (done) {
			var totals = transactionPool.getUsage();

			expect(totals).to.be.an('object');
			expect(totals.unverified).to.be.equal(totalDB.unverified);
			expect(totals.pending).to.be.equal(totalDB.pending);
			expect(totals.ready).to.be.equal(totalDB.ready);
			expect(totals.invalid).to.be.equal(totalDB.invalid);
			done();
		});

		it('should be ok when adding delegate transaction to unverified', function (done) {
			transaction = node.lisk.delegate.createDelegate(testAccounts[0].secret, testAccounts[0].account.username);

			transactionPool.addFromPeer(transaction, false, function (err, cbtransaction) {
				expect(cbtransaction).to.be.undefined;
				done();
			});
		});

		it('should be ok when processing transactions and creating blocks', function (done) {
			setTimeout(function () {
				forge(function (err, cbForge) {
					expect(err).to.be.null;
					expect(cbForge).to.be.undefined;
					totalDB.unverified = 0;
					done();
				});
			}, 800);
		});
	});

	describe('process workers', function () {

		it('should be ok when getting pool totals to initialize local counter', function (done) {
			var totals = transactionPool.getUsage();

			expect(totals).to.be.an('object');
			expect(totals.unverified).to.be.a('number');
			expect(totals.pending).to.be.a('number');
			expect(totals.ready).to.be.a('number');
			expect(totals.invalid).to.be.a('number');
			poolTotals = totals;
			done();
		});

		describe('processPool - no broadcast - addFromPeer', function () {

			describe('transaction type: 0 - transferring funds', function () {

				var tmpTransactionInvalidId;

				it('should be ok when adding normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(transactions[0], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with not enough LSK', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[0], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with invalid transaction id', function (done) {
					tmpTransactionInvalidId = _.cloneDeep(invalidsTransactions[0]);
					tmpTransactionInvalidId.id = '01234567890123456789';

					transactionPool.addFromPeer(tmpTransactionInvalidId, false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						expect(err).to.equal('Invalid transaction id');
						poolTotals.invalid += 1;
						done();
					});
				});

				it('should be ok when processing pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(logger.error.args[0][0]).to.equal('Failed to check balance for account related with transaction: ' + invalidsTransactions[0].id);
						expect(logger.error.args[0][1]).to.equal(['Account does not have enough LSK:', testAccounts[1].account.address, 'balance: 3.00001'].join(' '));
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when adding same normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(transactions[0], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[0].id);
						done();
					});
				});

				it('should fail when adding same transaction with invalid id to unverified', function (done) {
					transactionPool.addFromPeer(tmpTransactionInvalidId, false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + tmpTransactionInvalidId.id);
						done();
					});
				});

				it('should be ok when deleting normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[0].id);

					expect(deletedTransaction).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when resetting invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when getting pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.equal(poolTotals.unverified);
					expect(totals.pending).to.equal(poolTotals.pending);
					expect(totals.ready).to.equal(poolTotals.ready);
					expect(totals.invalid).to.equal(poolTotals.invalid);
					expect(totals.total).to.be.equal(poolTotals.unverified + poolTotals.pending + poolTotals.ready);
					done();
				});
			});

			describe('transaction type: 1 - registering a second signature', function () {

				var invalidTransactionType;

				it('should be ok when adding normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(transactions[1], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with not enough LSK', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[1], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should fail when adding transaction to unverified with invalid transaction type', function (done) {
					invalidTransactionType = _.cloneDeep(invalidsTransactions[0]);
					invalidTransactionType.id = '12345678901234567890';
					invalidTransactionType.type = 99;

					transactionPool.addFromPeer(invalidTransactionType, false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						expect(err).to.equal(['Unknown transaction type', invalidTransactionType.type].join(' '));
						poolTotals.invalid += 1;
						done();
					});
				});

				it('should be ok when processing pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(logger.error.args[0][0]).to.equal('Failed to check balance for account related with transaction: ' + invalidsTransactions[1].id);
						expect(logger.error.args[0][1]).to.equal(['Account does not have enough LSK:', testAccounts[1].account.address, 'balance: 0.00001'].join(' '));
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when adding same normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(transactions[1], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[1].id);
						done();
					});
				});

				it('should fail when adding same transaction with invalid transaction type to unverified', function (done) {
					transactionPool.addFromPeer(invalidTransactionType, false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidTransactionType.id);
						done();
					});
				});

				it('should be ok when deleting normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[1].id);

					expect(deletedTransaction).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when resetting invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when getting pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					expect(totals.total).to.be.equal(poolTotals.unverified + poolTotals.pending + poolTotals.ready);
					done();
				});
			});

			describe('transaction type: 2 - registering a delegate', function () {

				var invalidSignature;

				it('should be ok when adding normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(transactions[2], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with not enough LSK', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[2][0], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified that already is a delegate', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[2][1], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with same username', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[2][2], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with invalid signature', function (done) {
					invalidSignature = _.cloneDeep(hackedTransactions[0]);

					transactionPool.addFromPeer(invalidSignature, false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when processing pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(logger.error.args[0][0]).to.equal('Failed to check balance for account related with transaction: ' + invalidsTransactions[2][0].id);
						expect(logger.error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTransactions[2][0].senderId, 'balance: 0'].join(' '));
						expect(logger.error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTransactions[2][1].id);
						expect(logger.error.args[1][1]).to.equal('Account is already a delegate');
						expect(logger.error.args[2][0]).to.equal('Failed to process unverified transaction: ' + invalidsTransactions[2][2].id);
						expect(logger.error.args[2][1]).to.equal('Username already exists');
						expect(logger.error.args[3][0]).to.equal('Failed to process unverified transaction: ' + invalidSignature.id);
						expect(logger.error.args[3][1]).to.equal('Failed to verify signature');
						poolTotals.invalid += 3;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when adding same normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(transactions[2], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[2].id);
						done();
					});
				});

				it('should fail when adding same transaction with registered delegate to unverified', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[2][1], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[2][1].id);
						done();
					});
				});

				it('should fail when adding same transaction with registered delegate to unverified', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[2][1], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[2][1].id);
						done();
					});
				});

				it('should fail when adding same transaction with same username to unverified', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[2][2], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[2][2].id);
						done();
					});
				});

				it('should fail when adding same transaction with invalid signature to unverified', function (done) {
					transactionPool.addFromPeer(invalidSignature, false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidSignature.id);
						done();
					});
				});

				it('should be ok when deleting normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[2].id);

					expect(deletedTransaction).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when resetting invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when getting pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					expect(totals.total).to.be.equal(poolTotals.unverified + poolTotals.pending + poolTotals.ready);
					done();
				});
			});

			describe('transaction type: 3 - placing votes', function () {

				it('should be ok when adding normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(transactions[3], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with not enough LSK', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[3][0], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified that votes for a non-delegate', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[3][1], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when processing pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(logger.error.args[0][0]).to.equal('Failed to check balance for account related with transaction: ' + invalidsTransactions[3][0].id);
						expect(logger.error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTransactions[3][0].senderId, 'balance: 0.00001'].join(' '));
						expect(logger.error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTransactions[3][1].id);
						expect(logger.error.args[1][1]).to.equal('Delegate not found');
						poolTotals.invalid += 1;
						poolTotals.ready += 1;
						done();
					});
				});

				it('should fail when adding same normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(transactions[3], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[3].id);
						done();
					});
				});

				it('should fail when adding same transaction that votes for a non-delegate to unverified', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[3][1], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[3][1].id);
						done();
					});
				});

				it('should be ok when deleting normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[3].id);

					expect(deletedTransaction).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when resetting invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when getting pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					expect(totals.total).to.be.equal(poolTotals.unverified + poolTotals.pending + poolTotals.ready);
					done();
				});
			});

			describe('transaction type: 4 - registering a multisignature group', function () {

				var notEnoughSignatures;
				var completedSignatures;

				it('should be ok when adding normal transaction to unverified', function (done) {
					completedSignatures = _.cloneDeep(transactions[4][0]);

					transactionPool.addFromPeer(completedSignatures, false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with unregistered signer in database', function (done) {
					transactionPool.addFromPeer(transactions[4][1], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified without enough signatures', function (done) {
					notEnoughSignatures = _.cloneDeep(transactions[4][2]);

					transactionPool.addFromPeer(notEnoughSignatures, false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with not enough LSK', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[4][0], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when adding transaction to unverified with invalid signeer', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[4][1], false, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});

				it('should be ok when processing pool transactions', function (done) {
					transactionPool.processPool(function (err, cbprPool) {
						expect(logger.error.args[0][0]).to.equal('Failed to check balance for account related with transaction: ' + invalidsTransactions[4][0].id);
						expect(logger.error.args[0][1]).to.equal(['Account does not have enough LSK:', invalidsTransactions[4][0].senderId, 'balance: 0.00001'].join(' '));
						expect(logger.error.args[1][0]).to.equal('Failed to process unverified transaction: ' + invalidsTransactions[4][1].id);
						expect(logger.error.args[1][1]).to.equal('Failed to verify multisignature');
						poolTotals.invalid += 1;
						poolTotals.pending += 1;
						poolTotals.ready += 2;
						done();
					});
				});

				it('should fail when adding same normal transaction to unverified', function (done) {
					transactionPool.addFromPeer(completedSignatures, false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + completedSignatures.id);
						done();
					});
				});

				it('should fail when adding same transaction with unregistered signer to unverified', function (done) {
					transactionPool.addFromPeer(transactions[4][1], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already in pool: ' + transactions[4][1].id);
						done();
					});
				});

				it('should fail when adding same transaction without enough signatures to unverified', function (done) {
					transactionPool.addFromPeer(invalidsTransactions[4][1], false, function (err, cbtransaction) {
						expect(err).to.equal('Transaction is already processed as invalid: ' + invalidsTransactions[4][1].id);
						done();
					});
				});

				it('should be ok when deleting normal transaction from ready', function (done) {
					var deletedTransaction = transactionPool.delete(completedSignatures.id);

					expect(deletedTransaction).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when deleting normal transaction without enough signatures to unverified', function (done) {
					var deletedTransaction = transactionPool.delete(transactions[4][1].id);

					expect(deletedTransaction).to.equal('ready');
					poolTotals.ready -= 1;
					done();
				});

				it('should be ok when resetting invalid transactions list', function (done) {
					var invalidTransactions = transactionPool.resetInvalidTransactions();

					expect(invalidTransactions).to.equal(poolTotals.invalid);
					poolTotals.invalid -= invalidTransactions;
					done();
				});

				it('should be ok when getting pool totals', function (done) {
					var totals = transactionPool.getUsage();

					expect(totals).to.be.an('object');
					expect(totals.unverified).to.be.equal(poolTotals.unverified);
					expect(totals.pending).to.be.equal(poolTotals.pending);
					expect(totals.ready).to.be.equal(poolTotals.ready);
					expect(totals.invalid).to.be.equal(poolTotals.invalid);
					expect(totals.total).to.be.equal(poolTotals.unverified + poolTotals.pending + poolTotals.ready);
					done();
				});

				describe('signing multisignature', function () {

					it('should fail when signing transaction with invalid signer', function (done) {
						transactionPool.addSignature(transactions[4][2].id, testAccounts[0].secret, function (err, cbtransaction) {
							expect(err).to.equal('Permission to sign transaction denied');
							done();
						});
					});

					it('should be ok when signing pending transaction', function (done) {
						transactionPool.addSignature(transactions[4][2].id, testAccounts[1].secret, function (err, cbtransaction) {
							expect(err).to.be.undefined;
							expect(cbtransaction).to.be.undefined;
							done();
						});
					});

					it('should fail when signing same pending transaction again', function (done) {
						transactionPool.addSignature(transactions[4][2].id, testAccounts[1].secret, function (err, cbtransaction) {
							expect(err).to.equal('Transaction already signed');
							done();
						});
					});

					it('should be ok when processing pool transactions', function (done) {
						transactionPool.processPool(function (err, cbprPool) {
							expect(logger.error.args.length).to.equal(0);
							poolTotals.pending -= 1;
							poolTotals.ready += 1;
							done();
						});
					});

					it('should fail when signing transaction that is not in the pool', function (done) {
						transactionPool.addSignature(transactions[4][2].id, testAccounts[1].secret, function (err, cbtransaction) {
							expect(err).to.equal('Transaction not in pool');
							done();
						});
					});

					it('should be ok when deleting transaction from ready', function (done) {
						var deletedTransaction = transactionPool.delete(transactions[4][2].id);

						expect(deletedTransaction).to.equal('ready');
						poolTotals.ready -= 1;
						done();
					});

					it('should be ok when getting pool totals', function (done) {
						var totals = transactionPool.getUsage();

						expect(totals).to.be.an('object');
						expect(totals.unverified).to.be.equal(poolTotals.unverified);
						expect(totals.pending).to.be.equal(poolTotals.pending);
						expect(totals.ready).to.be.equal(poolTotals.ready);
						expect(totals.invalid).to.be.equal(poolTotals.invalid);
						expect(totals.total).to.be.equal(poolTotals.unverified + poolTotals.pending + poolTotals.ready);
						done();
					});
				});
			});
		});

		describe('transaction expiry', function () {

			var invalidSignature;
			var completedSignatures;
			var notEnoughSignatures;
			var normalTransaction;

			it('should be ok when adding transaction to unverified with invalid signature', function (done) {
				invalidSignature = _.cloneDeep(hackedTransactions[0]);

				transactionPool.addFromPeer(invalidSignature, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when adding normal transaction type 4 to unverified', function (done) {
				completedSignatures = _.cloneDeep(transactions[4][0]);

				transactionPool.addFromPeer(completedSignatures, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when adding transaction type 4 to unverified without enough signatures', function (done) {
				notEnoughSignatures = _.cloneDeep(transactions[4][2]);

				transactionPool.addFromPeer(notEnoughSignatures, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when processing pool transactions', function (done) {
				transactionPool.processPool(function (err, cbprPool) {
					expect(logger.error.args[0][0]).to.equal('Failed to process unverified transaction: ' + invalidSignature.id);
					expect(logger.error.args[0][1]).to.equal('Failed to verify signature');
					poolTotals.invalid += 1;
					poolTotals.ready += 1;
					poolTotals.pending += 1;
					done();
				});
			});

			it('should be ok when adding normal transaction type 2 to unverified', function (done) {
				normalTransaction = _.cloneDeep(transactions[2]);

				transactionPool.addFromPeer(normalTransaction, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					poolTotals.unverified += 1;
					done();
				});
			});

			it('should be ok when getting pool totals', function (done) {
				var totals = transactionPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.be.equal(poolTotals.unverified);
				expect(totals.pending).to.be.equal(poolTotals.pending);
				expect(totals.ready).to.be.equal(poolTotals.ready);
				expect(totals.invalid).to.be.equal(poolTotals.invalid);
				expect(totals.total).to.be.equal(poolTotals.unverified + poolTotals.pending + poolTotals.ready);
				done();
			});

			it('should be ok when getting transaction from unverified list', function (done) {
				var transaction = transactionPool.get(normalTransaction.id);

				expect(transaction.transaction).to.deep.equal(normalTransaction);
				expect(transaction.status).to.equal('unverified');
				normalTransaction.receivedAt = transaction.transaction.receivedAt;
				done();
			});

			it('should be ok when getting transaction from pending list', function (done) {
				var transaction = transactionPool.get(notEnoughSignatures.id);

				expect(transaction.transaction).to.deep.equal(notEnoughSignatures);
				expect(transaction.status).to.equal('pending');
				notEnoughSignatures.receivedAt = transaction.transaction.receivedAt;
				done();
			});

			it('should be ok when getting transaction from ready list', function (done) {
				var transaction = transactionPool.get(completedSignatures.id);

				expect(transaction.transaction).to.deep.equal(completedSignatures);
				expect(transaction.status).to.equal('ready');
				completedSignatures.receivedAt = transaction.transaction.receivedAt;
				done();
			});

			it('should be ok when expriring transactions', function (done) {
				setTimeout(function () {
					transactionPool.expireTransactions(function (err, cbprPool) {
						expect(logger.info.args.length).to.equal(3);
						expect(logger.info.args[0][0]).to.equal(['Expired transaction:', normalTransaction.id, 'received at:', normalTransaction.receivedAt.toUTCString()].join(' '));
						expect(logger.info.args[1][0]).to.equal(['Expired transaction:', notEnoughSignatures.id, 'received at:', notEnoughSignatures.receivedAt.toUTCString()].join(' '));
						expect(logger.info.args[2][0]).to.equal(['Expired transaction:', completedSignatures.id, 'received at:', completedSignatures.receivedAt.toUTCString()].join(' '));
						poolTotals.pending -= 1;
						poolTotals.ready -= 1;
						poolTotals.unverified -= 1;
						done();
					});
				}, 2000);

			});

			it('should be ok when resetting invalid transactions list', function (done) {
				var invalidTransactions = transactionPool.resetInvalidTransactions();

				expect(invalidTransactions).to.equal(1);
				poolTotals.invalid -= 1;
				done();
			});

			it('should be ok when getting pool totals', function (done) {
				var totals = transactionPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.be.equal(poolTotals.unverified);
				expect(totals.pending).to.be.equal(poolTotals.pending);
				expect(totals.ready).to.be.equal(poolTotals.ready);
				expect(totals.invalid).to.be.equal(poolTotals.invalid);
				expect(totals.total).to.be.equal(poolTotals.unverified + poolTotals.pending + poolTotals.ready);
				done();
			});
		});
	});

	describe('getters', function () {

		var invalidSignature;
		var completedSignatures;
		var notEnoughSignatures;
		var normalTransaction;

		describe('adding transactions to pool', function () {

			it('should be ok when adding transaction to unverified with invalid signature', function (done) {
				invalidSignature = _.cloneDeep(hackedTransactions[0]);

				transactionPool.addFromPeer(invalidSignature, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when adding normal transaction type 4 to unverified', function (done) {
				completedSignatures = _.cloneDeep(transactions[4][0]);

				transactionPool.addFromPeer(completedSignatures, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when adding transaction type 4 to unverified without enough signatures', function (done) {
				notEnoughSignatures = _.cloneDeep(transactions[4][2]);

				transactionPool.addFromPeer(notEnoughSignatures, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when processing pool transactions', function (done) {
				transactionPool.processPool(function (err, cbprPool) {
					expect(logger.error.args[0][0]).to.equal('Failed to process unverified transaction: ' + invalidSignature.id);
					expect(logger.error.args[0][1]).to.equal('Failed to verify signature');
					poolTotals.invalid += 1;
					poolTotals.ready += 1;
					poolTotals.pending += 1;
					done();
				});
			});

			it('should be ok when adding normal transaction type 2 to unverified', function (done) {
				normalTransaction = _.cloneDeep(transactions[2]);

				transactionPool.addFromPeer(normalTransaction, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					poolTotals.unverified += 1;
					done();
				});
			});

			it('should be ok when adding valid transaction type 3 to unverified', function (done) {
				var normalTransactionT3 = _.cloneDeep(transactions[3]);
				transactionPool.addFromPeer(normalTransactionT3, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					poolTotals.unverified += 1;
					done();
				});
			});
		});

		describe('getting a transaction by id', function () {

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

		describe('getting all transactions', function () {

			describe('by pool list', function () {

				it('should be ok when checking pool list unverified', function (done) {
					var transactions = transactionPool.getAll('unverified', {limit: null});

					expect(Object.keys(transactions).length).to.equal(poolTotals.unverified);
					done();
				});

				it('should be ok when checking pool list unverified with limit', function (done) {
					var transactions = transactionPool.getAll('unverified', { limit: 1 });

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should be ok when checking pool list pending', function (done) {
					var transactions = transactionPool.getAll('pending', {limit: null});

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should be ok when checking pool list pending with limit', function (done) {
					var transactions = transactionPool.getAll('pending', {limit: 1});

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should be ok when checking pool list ready', function (done) {
					var transactions = transactionPool.getAll('ready', {limit: null});

					expect(Object.keys(transactions).length).to.equal(poolTotals.ready);
					done();
				});

				it('should be ok when checking pool list ready with limit', function (done) {
					var transactions = transactionPool.getAll('ready', {limit: 1});

					expect(Object.keys(transactions).length).to.equal(1);
					done();
				});

				it('should fail when filter is invalid', function (done) {
					var transactions = transactionPool.getAll('unknown', {limit: null});

					expect(transactions).to.equal('Invalid filter');
					done();
				});
			});

			describe('by id (address) and publicKey', function () {

				it('should be ok when sender account is valid', function (done) {
					var transactions = transactionPool.getAll('sender_id', {id: '2737453412992791987L'});

					expect(transactions.unverified.length).to.equal(1);
					expect(transactions.pending.length).to.equal(0);
					expect(transactions.ready.length).to.equal(1);
					done();
				});

				it('should be ok when recipient account is valid', function (done) {
					var transactions = transactionPool.getAll('recipient_id', {id: '2737453412992791987L'});

					expect(transactions.unverified.length).to.equal(1);
					expect(transactions.pending.length).to.equal(0);
					expect(transactions.ready.length).to.equal(0);
					done();
				});

				it('should be ok when sender publicKey is valid', function (done) {
					var transactions = transactionPool.getAll('sender_pk', {publicKey: '849b37aaeb6038aebbe7e7341735d7a9d207da1851b701d87db5426651ed3fe8'});

					expect(transactions.unverified.length).to.equal(1);
					expect(transactions.pending.length).to.equal(1);
					expect(transactions.ready.length).to.equal(0);
					done();
				});

				// TODO: Enable this test after moving to new db schema
				it.skip('should be ok when recipient publicKey is valid', function (done) {
					var transactions = transactionPool.getAll('recipient_pk', {publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5'});

					expect(transactions.unverified.length).to.equal(1);
					expect(transactions.pending.length).to.equal(0);
					expect(transactions.ready.length).to.equal(0);
					done();
				});
			});
		});
	});

	describe('unverified', function () {

		describe('add', function () {

			it('should be ok when adding transactions to fill pool storage', function (done) {
				var transactions = [];

				invalidsTransactions.forEach(function (e) {
					if (Array.isArray(e)) {
						transactions = transactions.concat(e);
					} else {
						transactions.push(e);
					}
				});

				transactionPool.addFromPeer(transactions, false, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					expect(err).to.equal('Transaction pool is full');
					done();
				});
			});

			it('should be ok when pool totals are equal to pool storage limit', function (done) {
				var totals = transactionPool.getUsage();
				expect(totals).to.be.an('object');
				expect(totals.total).to.equal(poolStorageTransactionsLimit);
				poolTotals = totals;
				done();
			});

			it('should fail when adding transaction and pool storage is full', function (done) {
				var extraTransaction = node.lisk.transaction.createTransaction(testAccounts[1].account.address, 300000000, testAccounts[0].secret);

				transactionPool.addFromPeer(extraTransaction, false, function (err, cbtransaction) {
					expect(err).to.equal('Transaction pool is full');
					done();
				});
			});
		});

		describe('delete', function () {

			it('should be ok when deleting a transaction from unverified', function (done) {
				var deleteTransaction = transactionPool.delete(invalidsTransactions[0].id);

				expect(deleteTransaction).to.equal('unverified');
				done();
			});

			it('should be ok when checking unverified value has decreased by 1', function (done) {
				var totals = transactionPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.unverified).to.equal(poolTotals.unverified - 1);
				poolTotals = totals;
				done();
			});

			it('should fail when deleting transaction that is not in pool', function (done) {
				var deleteTransaction = transactionPool.delete(transactions[0].id);

				expect(deleteTransaction).to.be.undefined;
				done();
			});
		});
	});

	describe('ready', function () {

		describe('addReady/getReady', function () {

			var allTransactions = [];

			transactions.forEach(function (e) {
				if (Array.isArray(e)) {
					allTransactions = allTransactions.concat(e);
				} else {
					allTransactions.push(e);
				}
			});
			allTransactions.pop();

			it('should be ok when adding transactions to ready', function (done) {
				transactionPool.addReady(allTransactions, function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					poolTotals.ready = allTransactions.length;
					done();
				});
			});

			it('should be ok when getting transactions from ready', function (done) {
				var readyTransactions = transactionPool.getReady();

				expect(readyTransactions[0].fee).to.be.at.least(readyTransactions[1].fee);
				expect(readyTransactions[1].fee).to.be.at.least(readyTransactions[2].fee);
				expect(readyTransactions[2].fee).to.be.at.least(readyTransactions[3].fee);
				expect(readyTransactions[3].fee).to.be.at.least(readyTransactions[4].fee);
				expect(readyTransactions[4].fee).to.be.at.least(readyTransactions[5].fee);
				done();
			});

			it('should be ok when adding type 2 transaction again to ready', function (done) {
				transactionPool.addReady([allTransactions[2]], function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when getting transactions from ready', function (done) {
				var readyTransactions = transactionPool.getReady();

				expect(readyTransactions[0].receivedAt).to.not.equal(readyTransactions[1].receivedAt);
				expect(readyTransactions[1].receivedAt).to.equal(readyTransactions[2].receivedAt);
				expect(readyTransactions[2].receivedAt).to.equal(readyTransactions[3].receivedAt);
				expect(readyTransactions[3].receivedAt).to.equal(readyTransactions[4].receivedAt);
				done();
			});

			it('should be ok when getting transactions from ready with limit', function (done) {
				var readyTransactions = transactionPool.getReady(2);

				expect(readyTransactions.length).to.equal(2);
				expect(readyTransactions[0].receivedAt).to.not.equal(readyTransactions[1].receivedAt);
				done();
			});

			it('should be ok when deleting transaction from ready', function (done) {
				var deleteTransaction = transactionPool.delete(transactions[0].id);

				expect(deleteTransaction).to.equal('ready');
				poolTotals.ready -= 1;
				done();
			});

			it('should be ok when checking ready value has decreased by 1', function (done) {
				var totals = transactionPool.getUsage();

				expect(totals).to.be.an('object');
				expect(totals.ready).to.equal(poolTotals.ready);
				done();
			});
		});
	});

	describe('broadcasting transactions', function () {

		var broadcastTransaction;

		it('should be ok when serializing transaction', function (done) {
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

		it('should be ok when deserializing transaction', function (done) {
			broadcastTransaction = bson.deserialize(broadcastTransaction);

			expect(broadcastTransaction).to.deep.equal(transactions[0]);
			done();
		});
	});

	describe('checking balances', function () {

		it('should be ok when checking account balance with enough LSK for transaction', function (done) {
			transactionPool.checkBalance(transactions[0], {address: transactions[0].senderId}, function (err, cbBalance) {
				expect(cbBalance).to.deep.equal(new node.bignum('499995400000000'));
				done();
			});
		});

		it('should fail when checking account balance with not enough LSK for transaction', function (done) {
			transactionPool.checkBalance(invalidsTransactions[0], { address: invalidsTransactions[0].senderId }, function (err, cbBalance) {
				expect(err).to.equal('Account does not have enough LSK: 2896019180726908125L balance: 0.00001');
				done();
			});
		});
	});

	describe('sanitize transactions', function () {

		var receivedTransactions;
		var readyTransactionsBefore;
		var readyTransactionsAfter;

		describe('calculated balance positive (database balance - incoming block balance - transaction pool balance > 0)', function () {

			it('should be ok when adding a new block', function (done) {
				setTimeout(function () {
					receivedTransactions = [node.lisk.transaction.createTransaction(testAccounts[1].account.address, 499990000000000, testAccounts[0].secret)];
					saveBlock(receivedTransactions, function (err, cbSaveBlock) {
						expect(err).to.be.null;
						expect(cbSaveBlock).to.be.undefined;
						done();
					});
				}, 800);
			});

			it('should be ok when rechecking balance, pool remains the same', function (done) {
				readyTransactionsBefore = transactionPool.getReady();
				transactionPool.sanitizeTransactions(receivedTransactions, function () {
					readyTransactionsAfter = transactionPool.getReady();
					expect(readyTransactionsAfter.length).equal(readyTransactionsBefore.length);
					done();
				});
			});

			it('should be ok when checking that account balance is positive', function (done) {
				transactionPool.checkBalance({amount: 0, fee: 0}, {address: testAccounts[0].account.address}, function (err, cbBalance) {
					expect(cbBalance.greaterThan('0'));
					done();
				});
			});
		});

		describe('calculated balance zero (database balance - incoming block balance - transaction pool balance = 0)', function () {

			it('should be ok when transferring funds', function (done) {
				transactionPool.addReady([node.lisk.transaction.createTransaction(testAccounts[2].account.address, 5360000000, testAccounts[0].secret)], function (err, cbtransaction) {
					expect(cbtransaction).to.be.undefined;
					done();
				});
			});

			it('should be ok when adding a new block', function (done) {
				setTimeout(function () {
					receivedTransactions = [node.lisk.transaction.createTransaction(testAccounts[2].account.address, 10000000, testAccounts[0].secret)];
					saveBlock(receivedTransactions, function (err, cbSaveBlock) {
						expect(err).to.be.null;
						expect(cbSaveBlock).to.be.undefined;
						done();
					});
				}, 800);
			});

			it('should be ok when rechecking balance, pool remains the same', function (done) {
				readyTransactionsBefore = transactionPool.getReady();
				transactionPool.sanitizeTransactions(receivedTransactions, function () {
					readyTransactionsAfter = transactionPool.getReady();
					expect(readyTransactionsAfter.length).equal(readyTransactionsBefore.length);
					done();
				});
			});

			it('should be ok when checking that account balance is zero', function (done) {
				readyTransactionsAfter = transactionPool.getReady();
				transactionPool.checkBalance({amount: 0, fee: 0}, {address: testAccounts[0].account.address}, function (err, cbBalance) {
					expect(cbBalance.equals('0'));
					done();
				});
			});
		});

		describe('calculated balance negative (database balance - incoming block balance - transaction pool balance < 0)', function () {

			describe('one transaction deleted from pool', function () {

				it('should be ok when adding a new block', function (done) {
					setTimeout(function () {
						receivedTransactions = [node.lisk.transaction.createTransaction(testAccounts[2].account.address, 100000000, testAccounts[0].secret)];
						saveBlock(receivedTransactions, function (err, cbSaveBlock) {
							expect(err).to.be.null;
							expect(cbSaveBlock).to.be.undefined;
							done();
						});
					}, 800);
				});
				it('TEMP - should be ok when checking that account balance is positive', function (done) {
					transactionPool.checkBalance({amount: 0, fee: 0}, {address: testAccounts[0].account.address}, function (err, cbBalance) {
						expect(cbBalance.greaterThan('0'));
						done();
					});
				});

				it('should be ok when rechecking balance and deleting one transaction from pool', function (done) {
					readyTransactionsBefore = transactionPool.getReady();
					transactionPool.sanitizeTransactions(receivedTransactions, function () {
						readyTransactionsAfter = transactionPool.getReady();
						expect(readyTransactionsAfter.length).equal(readyTransactionsBefore.length - 1);
						done();
					});
				});

				it('should be ok when checking that account balance is positive', function (done) {
					transactionPool.checkBalance({amount: 0, fee: 0}, {address: testAccounts[0].account.address}, function (err, cbBalance) {
						expect(cbBalance.greaterThan('0'));
						done();
					});
				});
			});

			describe('several transactions deleted from pool', function () {

				it('should be ok when transferring funds in multiple transactions', function (done) {
					var multipleTransfers = [
						node.lisk.transaction.createTransaction(testAccounts[1].account.address, 100000000, testAccounts[0].secret),
						node.lisk.transaction.createTransaction(testAccounts[2].account.address, 200000000, testAccounts[0].secret),
						node.lisk.transaction.createTransaction(testAccounts[3].account.address, 300000000, testAccounts[0].secret)
					];
					transactionPool.addReady(multipleTransfers, function (err, cbtransaction) {
						expect(cbtransaction).to.be.undefined;
						done();
					});
				});
				it('TEMP - should be ok when checking that account balance is positive', function (done) {
					transactionPool.checkBalance({amount: 0, fee: 0}, {address: testAccounts[0].account.address}, function (err, cbBalance) {
						expect(cbBalance.greaterThan('0'));
						done();
					});
				});

				it('should be ok when adding a new block', function (done) {
					setTimeout(function () {
						receivedTransactions = [node.lisk.transaction.createTransaction(testAccounts[2].account.address, 500000000, testAccounts[0].secret)];
						saveBlock(receivedTransactions, function (err, cbSaveBlock) {
							expect(err).to.be.null;
							expect(cbSaveBlock).to.be.undefined;
							done();
						});
					}, 800);
				});
				it('TEMP - should be ok when checking that account balance is negative', function (done) {
					transactionPool.checkBalance({amount: 0, fee: 0}, {address: testAccounts[0].account.address}, function (err, cbBalance) {
						expect(cbBalance.lessThan('0'));
						done();
					});
				});

				it('should be ok when rechecking balance and deleting one transaction from pool', function (done) {
					readyTransactionsBefore = transactionPool.getReady();
					transactionPool.sanitizeTransactions(receivedTransactions, function () {
						readyTransactionsAfter = transactionPool.getReady();
						expect(readyTransactionsAfter.length).lessThanOrEqualTo(readyTransactionsBefore.length - 2);
						done();
					});
				});

				it('should be ok when checking that account balance is positive', function (done) {
					transactionPool.checkBalance({amount: 0, fee: 0}, {address: testAccounts[0].account.address}, function (err, cbBalance) {
						expect(cbBalance.greaterThan('0'));
						done();
					});
				});
			});
		});
	});
});
