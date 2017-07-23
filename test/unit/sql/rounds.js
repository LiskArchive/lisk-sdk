'use strict';

var _      = require('lodash');
var async  = require('async');
var chai   = require('chai');
var expect = require('chai').expect;
var rewire = require('rewire');
var sinon  = require('sinon');

var config    = require('../../../config.json');
var node      = require('../../node.js');
var Sequence  = require('../../../helpers/sequence.js');
var slots     = require('../../../helpers/slots.js');

describe('Rounds-related SQL triggers', function () {
	var db, logger, library, rewiredModules = {}, modules = [];
	var mem_state;

	function normalizeMemAccounts (mem_accounts) {
		var accounts = {};
		_.map(mem_accounts, function (acc) {
			acc.balance = Number(acc.balance);
			acc.u_balance = Number(acc.u_balance);
			acc.fees = Number(acc.fees);
			accounts[acc.address] = acc;
		});
		return accounts;
	}

	before(function (done) {
		// Init dummy connection with database - valid, used for tests here
		var pgp = require('pg-promise')();
		config.db.user = config.db.user || process.env.USER;
		db = pgp(config.db);

		// Clear tables
		db.none('DELETE FROM blocks; DELETE FROM mem_accounts;').then(done).catch(done);
	});

	before(function (done) {
		// Set block time to 1 second, so we can forge valid block every second
		slots.interval = 1;

		logger = {
			trace: sinon.spy(),
			debug: sinon.spy(),
			info:  sinon.spy(),
			log:   sinon.spy(),
			warn:  sinon.spy(),
			error: sinon.spy()
		};

		var modulesInit = {
			accounts: '../../../modules/accounts.js',
			transactions: '../../../modules/transactions.js',
			blocks: '../../../modules/blocks.js',
			signatures: '../../../modules/signatures.js',
			transport: '../../../modules/transport.js',
			loader: '../../../modules/loader.js',
			system: '../../../modules/system.js',
			peers: '../../../modules/peers.js',
			delegates: '../../../modules/delegates.js',
			multisignatures: '../../../modules/multisignatures.js',
			dapps: '../../../modules/dapps.js',
			crypto: '../../../modules/crypto.js',
			// cache: '../../../modules/cache.js'
		};

		// Init limited application layer
		async.auto({
			config: function (cb) {
				cb(null, config);
			},
			genesisblock: function (cb) {
				var genesisblock = require('../../../genesisBlock.json');
				cb(null, {block: genesisblock});
			},

			schema: function (cb) {
				var z_schema = require('../../../helpers/z_schema.js');
				cb(null, new z_schema());
			},
			network: function (cb) {
				// Init with empty function
				cb(null, {io: {sockets: {emit: function () {}}}});
			},
			logger: function (cb) {
				cb(null, logger);
			},
			dbSequence: ['logger', function (scope, cb) {
				var sequence = new Sequence({
					onWarning: function (current, limit) {
						scope.logger.warn('DB queue', current);
					}
				});
				cb(null, sequence);
			}],
			sequence: ['logger', function (scope, cb) {
				var sequence = new Sequence({
					onWarning: function (current, limit) {
						scope.logger.warn('Main queue', current);
					}
				});
				cb(null, sequence);
			}],
			balancesSequence: ['logger', function (scope, cb) {
				var sequence = new Sequence({
					onWarning: function (current, limit) {
						scope.logger.warn('Balance queue', current);
					}
				});
				cb(null, sequence);
			}],
			ed: function (cb) {
				cb(null, require('../../../helpers/ed.js'));
			},

			bus: ['ed', function (scope, cb) {
				var changeCase = require('change-case');
				var bus = function () {
					this.message = function () {
						var args = [];
						Array.prototype.push.apply(args, arguments);
						var topic = args.shift();
						var eventName = 'on' + changeCase.pascalCase(topic);

						// executes the each module onBind function
						modules.forEach(function (module) {
							if (typeof(module[eventName]) === 'function') {
								module[eventName].apply(module[eventName], args);
							}
							if (module.submodules) {
								async.each(module.submodules, function (submodule) {
									if (submodule && typeof(submodule[eventName]) === 'function') {
										submodule[eventName].apply(submodule[eventName], args);
									}
								});
							}
						});
					};
				};
				cb(null, new bus());
			}],
			db: function (cb) {
				cb(null, db);
			},
			pg_notify: ['db', 'bus', 'logger', function (scope, cb) {
				var pg_notify = require('../../../helpers/pg-notify.js');
				pg_notify.init(scope.db, scope.bus, scope.logger, cb);
			}],
			logic: ['db', 'bus', 'schema', 'genesisblock', function (scope, cb) {
				var Transaction = require('../../../logic/transaction.js');
				var Block = require('../../../logic/block.js');
				var Account = require('../../../logic/account.js');
				var Peers = require('../../../logic/peers.js');

				async.auto({
					bus: function (cb) {
						cb(null, scope.bus);
					},
					db: function (cb) {
						cb(null, scope.db);
					},
					ed: function (cb) {
						cb(null, scope.ed);
					},
					logger: function (cb) {
						cb(null, scope.logger);
					},
					schema: function (cb) {
						cb(null, scope.schema);
					},
					genesisblock: function (cb) {
						cb(null, {
							block: scope.genesisblock.block
						});
					},
					account: ['db', 'bus', 'ed', 'schema', 'genesisblock', 'logger', function (scope, cb) {
						new Account(scope.db, scope.schema, scope.logger, cb);
					}],
					transaction: ['db', 'bus', 'ed', 'schema', 'genesisblock', 'account', 'logger', function (scope, cb) {
						new Transaction(scope.db, scope.ed, scope.schema, scope.genesisblock, scope.account, scope.logger, cb);
					}],
					block: ['db', 'bus', 'ed', 'schema', 'genesisblock', 'account', 'transaction', function (scope, cb) {
						new Block(scope.ed, scope.schema, scope.transaction, cb);
					}],
					peers: ['logger', function (scope, cb) {
						new Peers(scope.logger, cb);
					}]
				}, cb);
			}],
			modules: ['network', 'logger', 'bus', 'sequence', 'dbSequence', 'balancesSequence', 'db', 'logic', function (scope, cb) {
				var tasks = {};
				Object.keys(modulesInit).forEach(function (name) {
					tasks[name] = function (cb) {
						var Instance = rewire(modulesInit[name]);
						rewiredModules[name] = Instance;
						var obj = new rewiredModules[name](cb, scope);
						modules.push(obj);
					};
				});

				async.parallel(tasks, function (err, results) {
					cb(err, results);
				});
			}],
			ready: ['modules', 'bus', 'logic', function (scope, cb) {
				scope.bus.message('bind', scope.modules);
				scope.logic.transaction.bindModules(scope.modules);
				scope.logic.peers.bindModules(scope.modules);
				cb();
			}]
		}, function (err, scope) {
			library = scope;
			// Overwrite onBlockchainReady function to prevent automatic forging
			library.modules.delegates.onBlockchainReady = function () {};
			done(err);
		});
	});

	describe('genesisBlock', function () {
		var genesisBlock, delegatesList;
		var genesisAccount;
		var accounts;

		before(function () {
			// Get genesis accounts address - should be senderId from first transaction
			genesisAccount = library.genesisblock.block.transactions[0].senderId;

			// Get unique accounts from genesis block
			accounts = _.reduce(library.genesisblock.block.transactions, function (accounts, tx) {
				if (tx.senderId && accounts.indexOf(tx.senderId) === -1) {
					accounts.push(tx.senderId);
				}
				if (tx.recipientId && accounts.indexOf(tx.recipientId) === -1) {
					accounts.push(tx.recipientId);
				}
				return accounts;
			}, []);
		})

		it('should not populate mem_accounts', function (done) {
			db.query('SELECT * FROM mem_accounts').then(function (rows) {
				mem_state = normalizeMemAccounts(rows);
				expect(rows.length).to.equal(0);
				done();
			}).catch(done);
		});

		it('should load genesis block with transactions into database (native)', function (done) {
			db.query('SELECT * FROM full_blocks_list WHERE b_height = 1').then(function (rows) {
				genesisBlock = library.modules.blocks.utils.readDbRows(rows)[0];
				expect(genesisBlock.id).to.equal(library.genesisblock.block.id);
				expect(genesisBlock.transactions.length).to.equal(library.genesisblock.block.transactions.length);
				done();
			}).catch(done);
		});

		it('should populate delegates table (native) and set data (trigger block_insert->delegates_update_on_block)', function (done) {
			db.query('SELECT * FROM delegates').then(function (rows) {
				_.each(rows, function (delegate) {
					expect(delegate.tx_id).that.is.an('string');

					// Search for that transaction in genesis block
					var found = _.find(library.genesisblock.block.transactions, {id: delegate.tx_id});
					expect(found).to.be.an('object');

					expect(delegate.name).to.equal(found.asset.delegate.username);
					expect(delegate.address).to.equal(found.senderId);
					expect(delegate.pk.toString('hex')).to.equal(found.senderPublicKey);
					
					// Data populated by trigger
					expect(delegate.rank).that.is.an('number');
					expect(Number(delegate.voters_balance)).to.equal(10000000000000000);
					expect(delegate.voters_cnt).to.equal(1);
					expect(delegate.blocks_forged_cnt).to.equal(0);
					expect(delegate.blocks_missed_cnt).to.equal(0);
				});
				done();
			}).catch(done);
		});

		it('should populate modules.delegates.__private.delegatesList with 101 public keys (pg-notify)', function () {
			delegatesList = rewiredModules.delegates.__get__('__private.delegatesList');
			expect(delegatesList.length).to.equal(101);
			_.each(delegatesList, function (pk) {
				// Search for that pk in genesis block
				var found = _.find(library.genesisblock.block.transactions, {senderPublicKey: pk});
				expect(found).to.be.an('object');
			})
		});

		it('should apply transactions of genesis block to mem_accounts (native)', function (done) {
			library.modules.blocks.chain.applyGenesisBlock(genesisBlock, function (err) {
				db.query('SELECT * FROM mem_accounts').then(function (rows) {
					mem_state = normalizeMemAccounts(rows);
					// Number of returned accounts should be equal to number of unique accounts in genesis block
					expect(rows.length).to.equal(accounts.length);

					_.each(mem_state, function (account) {
						if (account.address === genesisAccount) {
							// Genesis account should have negative balance
							expect(account.balance).to.be.below(0);
						} else if (account.isDelegate) {
							// Delegates accounts should have balances of 0
							expect(account.balance).to.be.equal(0);
						} else {
							// Other accounts (with funds) should have positive balance
							expect(account.balance).to.be.above(0);
						}
					});
					done();
				}).catch(done);
			})
		});
	});

	describe('round', function () {
		var transactions = [];

		function addTransaction (transaction, cb) {
			// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
			// See: modules.transport.__private.receiveTransaction
			transaction = library.logic.transaction.objectNormalize(transaction);
			library.balancesSequence.add(function (sequenceCb) {
				library.modules.transactions.processUnconfirmedTransaction(transaction, true, function (err) {
					if (err) {
						return setImmediate(sequenceCb, err.toString());
					} else {
						return setImmediate(sequenceCb, null, transaction.id);
					}
				});
			}, cb);
		}

		function forge (cb) {
			var transactionPool = rewiredModules.transactions.__get__('__private.transactionPool');
			var forge = rewiredModules.delegates.__get__('__private.forge');

			async.series([
				transactionPool.fillPool,
				forge,
			], function (err) {
				cb(err);
			});
		}

		function addTransactionsAndForge (transactions, cb) {
			async.waterfall([
				function addTransactions (waterCb) {
					async.eachSeries(transactions, function (transaction, eachSeriesCb) {
						addTransaction(transaction, eachSeriesCb);
					}, waterCb);
				},
				forge
			], function (err) {
				cb(err);
			});
		}

		function expectedMemState (transactions) {
			_.each(transactions, function (tx) {
				var block_id = library.modules.blocks.lastBlock.get().id;

				var address = tx.senderId
				if (mem_state[address]) {
					// Update sender
					mem_state[address].balance -= (tx.fee+tx.amount);
					mem_state[address].u_balance -= (tx.fee+tx.amount);
					mem_state[address].blockId = block_id;
					mem_state[address].virgin = 0;
				}

				address = tx.recipientId;
				if (mem_state[address]) {
					// Update recipient
					found = true;
					mem_state[address].balance += tx.amount;
					mem_state[address].u_balance += tx.amount;
					mem_state[address].blockId = block_id;
				} else {
					// Funds sent to new account
					mem_state[address] = {
						address: address,
						balance: tx.amount,
						blockId: block_id,
						delegates: null,
						fees: 0,
						isDelegate: 0,
						missedblocks: 0,
						multilifetime: 0,
						multimin: 0,
						multisignatures: null,
						nameexist: 0,
						producedblocks: 0,
						publicKey: null,
						rate: '0',
						rewards: '0',
						secondPublicKey: null,
						secondSignature: 0,
						u_balance: tx.amount,
						u_delegates: null,
						u_isDelegate: 0,
						u_multilifetime: 0,
						u_multimin: 0,
						u_multisignatures: null,
						u_nameexist: 0,
						u_secondSignature: 0,
						u_username: null,
						username: null,
						virgin: 1,
						vote: '0'
					}
				}
			});
			return mem_state;
		}

		before(function () {
			// Set delegates module as loaded to allow manual forging
			rewiredModules.delegates.__set__('__private.loaded', true);
		});

		it('should load all secrets of 101 delegates and set modules.delegates.__private.keypairs (native)', function (done) {
			var loadDelegates = rewiredModules.delegates.__get__('__private.loadDelegates');
			loadDelegates(function (err) {
				if (err) { done(err); }
				var keypairs = rewiredModules.delegates.__get__('__private.keypairs');
				expect(Object.keys(keypairs).length).to.equal(config.forging.secret.length);
				_.each(keypairs, function (keypair, pk) {
					expect(keypair.publicKey).to.be.instanceOf(Buffer);
					expect(keypair.privateKey).to.be.instanceOf(Buffer);
					expect(pk).to.equal(keypair.publicKey.toString('hex'));
				});
				done();
			});
		});

		it('should forge block with 1 TRANSFER transaction and update mem_accounts', function (done) {
			var tx = node.lisk.transaction.createTransaction(
				node.randomAccount().address,
				node.randomNumber(100000000, 1000000000),
				node.gAccount.password
			);
			transactions.push(tx);

			addTransactionsAndForge(transactions, function (err) {
				if (err) { done(err); }
				var expected_mem_state = expectedMemState(transactions);
				db.query('SELECT * FROM mem_accounts').then(function (rows) {
					mem_state = normalizeMemAccounts(rows);
					expect(mem_state).to.deep.equal(expected_mem_state);
					done();
				}).catch(done);
			});
		});

	});
});
