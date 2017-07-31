'use strict';

var _      = require('lodash');
var async  = require('async');
var chai   = require('chai');
var expect = require('chai').expect;
var rewire = require('rewire');
var sinon  = require('sinon');
var Promise = require('bluebird');

var config   = require('../../../config.json');
var node     = require('../../node.js');
var Sequence = require('../../../helpers/sequence.js');
var slots    = require('../../../helpers/slots.js');
var bignum   = require('../../../helpers/bignum.js');

describe('Rounds-related SQL triggers', function () {
	var db, logger, library, rewiredModules = {}, modules = [];
	var mem_state, delegates_state, round_blocks = [];

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

	function normalizeDelegates (db_delegates) {
		var delegates = {};
		_.map(db_delegates, function (d) {
			d.pk = d.pk.toString('hex');
			d.rank = Number(d.rank);
			d.fees = Number(d.fees);
			d.rewards = Number(d.rewards);
			d.voters_balance = Number(d.voters_balance);
			d.voters_cnt = Number(d.voters_cnt);
			d.blocks_forged_cnt = Number(d.blocks_forged_cnt);
			d.blocks_missed_cnt = Number(d.blocks_missed_cnt);
			delegates[d.pk] = d;
		});
		return delegates;
	}

	function getMemAccounts () {
		return db.query('SELECT * FROM mem_accounts').then(function (rows) {
			rows = normalizeMemAccounts(rows);
			mem_state = rows;
			return rows;
		});
	}

	function getDelegates (normalize) {
		return db.query('SELECT * FROM delegates').then(function (rows) {
			delegates_state = normalizeDelegates(rows);
			return rows;
		});
	}

	function getBlocks (round) {
		return db.query('SELECT * FROM blocks WHERE CEIL(height / 101::float)::int = ${round} AND height > 1 ORDER BY height ASC', {round: round}).then(function (rows) {
			return rows;
		});
	}

	function getRoundRewards (round) {
		return db.query('SELECT ENCODE(pk, \'hex\') AS pk, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = ${round} GROUP BY pk', {round: round}).then(function (rows) {
			var rewards = {};
			_.each(rows, function (row) {
				rewards[row.pk] = {
					pk: row.pk,
					fees: Number(row.fees),
					rewards: Number(row.rewards)
				};
			});
			return rewards;
		});
	}

	function getExpectedRoundRewards (blocks) {
		var rewards = {};

		var feesTotal = _.reduce(blocks, function (fees, block) {
			return new bignum(fees).plus(block.totalFee);
		}, 0);

		var feesPerDelegate = new bignum(feesTotal.toPrecision(15)).dividedBy(slots.delegates).floor();
		var feesRemaining   = new bignum(feesTotal.toPrecision(15)).minus(feesPerDelegate.times(slots.delegates));

		node.debug('	Total fees: ' + feesTotal.toString() + ' Fees per delegates: ' + feesPerDelegate.toString() + ' Remaining fees: ' + feesRemaining);
		
		_.each(blocks, function (block, index) {
			var pk = block.generatorPublicKey.toString('hex');
			if (rewards[pk]) {
				rewards[pk].fees = rewards[pk].fees.plus(feesPerDelegate);
				rewards[pk].rewards = rewards[pk].rewards.plus(block.reward);
			} else {
				rewards[pk] = {
					pk: pk,
					fees: new bignum(feesPerDelegate),
					rewards: new bignum(block.reward)
				};
			}

			if (index === blocks.length - 1) {
				// Apply remaining fees to last delegate
				rewards[pk].fees = rewards[pk].fees.plus(feesRemaining);
			}
		});

		_.each(rewards, function (delegate) {
			delegate.fees = Number(delegate.fees.toFixed());
			delegate.rewards = Number(delegate.rewards.toFixed());
		});

		return rewards;
	};

	before(function (done) {
		// Init dummy connection with database - valid, used for tests here
		var options = {
		    promiseLib: Promise
		};
		var pgp = require('pg-promise')(options);
		config.db.user = config.db.user || process.env.USER;
		db = pgp(config.db);

		// Clear tables
		db.task(function (t) {
			return t.batch([
				t.none('DELETE FROM blocks WHERE height > 1'),
				t.none('DELETE FROM blocks'),
				t.none('DELETE FROM mem_accounts')
			]);
		}).then(function () {
			done();
		}).catch(done);
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
			webSocket: ['config', 'logger', 'network', function (scope, cb) {
				// Init with empty functions
				var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

				var dummySocketCluster = {on: function () {}};
				var dummyWAMPServer = new MasterWAMPServer(dummySocketCluster, {});
				var wsRPC = require('../../../api/ws/rpc/wsRPC.js').wsRPC;

				wsRPC.setServer(dummyWAMPServer);
				wsRPC.getServer().registerRPCEndpoints({status: function () {}});

				cb();
			}],
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
		var genesisAccounts;

		before(function () {
			// Get genesis accounts address - should be senderId from first transaction
			genesisAccount = library.genesisblock.block.transactions[0].senderId;

			// Get unique accounts from genesis block
			genesisAccounts = _.reduce(library.genesisblock.block.transactions, function (accounts, tx) {
				if (tx.senderId && accounts.indexOf(tx.senderId) === -1) {
					accounts.push(tx.senderId);
				}
				if (tx.recipientId && accounts.indexOf(tx.recipientId) === -1) {
					accounts.push(tx.recipientId);
				}
				return accounts;
			}, []);
		})

		it('should not populate mem_accounts', function () {
			return getMemAccounts().then(function (accounts) {
				expect(Object.keys(accounts).length).to.equal(0);
			});
		});

		it('should load genesis block with transactions into database (native)', function (done) {
			db.query('SELECT * FROM full_blocks_list WHERE b_height = 1').then(function (rows) {
				genesisBlock = library.modules.blocks.utils.readDbRows(rows)[0];
				expect(genesisBlock.id).to.equal(library.genesisblock.block.id);
				expect(genesisBlock.transactions.length).to.equal(library.genesisblock.block.transactions.length);
				done();
			}).catch(done);
		});

		it('should populate delegates table (native) and set data (trigger block_insert)', function () {
			return getDelegates().then(function () {
				_.each(delegates_state, function (delegate) {
					expect(delegate.tx_id).that.is.an('string');

					// Search for that transaction in genesis block
					var found = _.find(library.genesisblock.block.transactions, {id: delegate.tx_id});
					expect(found).to.be.an('object');

					expect(delegate.name).to.equal(found.asset.delegate.username);
					expect(delegate.address).to.equal(found.senderId);
					expect(delegate.pk).to.equal(found.senderPublicKey);
					
					// Data populated by trigger
					expect(delegate.rank).that.is.an('number');
					expect(delegate.voters_balance).to.equal(10000000000000000);
					expect(delegate.voters_cnt).to.equal(1);
					expect(delegate.blocks_forged_cnt).to.equal(0);
					expect(delegate.blocks_missed_cnt).to.equal(0);
				});
			});
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
				if (err) { done(err); }

				getMemAccounts().then(function (accounts) {
					// Number of returned accounts should be equal to number of unique accounts in genesis block
					expect(Object.keys(accounts).length).to.equal(genesisAccounts.length);

					_.each(accounts, function (account) {
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
				}).then(done).catch(done);
			})
		});
	});

	describe('round', function () {
		function addTransaction (transaction, cb) {
			node.debug('	Add transaction ID: ' + transaction.id);
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

		function tickAndValidate (transactions) {
			var last_block = library.modules.blocks.lastBlock.get();

			return new Promise(function (resolve, reject) {
				addTransactionsAndForge(transactions, function(err) {
					if (err) { reject(err); }
					resolve();
				})
			})
				.then(function () {
					var new_block = library.modules.blocks.lastBlock.get();
					expect(new_block.id).to.not.equal(last_block.id);
					last_block = new_block;
					round_blocks.push(new_block);
				})
				.then(getMemAccounts)
				.then(function (accounts) {
					var expected_mem_state = expectedMemState(transactions);
					expect(accounts).to.deep.equal(expected_mem_state);
				})
				.then(getDelegates)
				.then(function () {
					var expected_delegates_state = expectedDelegatesState();
					expect(delegates_state).to.deep.equal(expected_delegates_state);
				})
		}

		function expectedMemState (transactions) {
			_.each(transactions, function (tx) {
				var last_block = library.modules.blocks.lastBlock.get();

				var address = tx.senderId
				if (mem_state[address]) {
					// Update sender
					mem_state[address].balance -= (tx.fee+tx.amount);
					mem_state[address].u_balance -= (tx.fee+tx.amount);
					mem_state[address].blockId = last_block.id;
					mem_state[address].virgin = 0;
				}

				address = tx.recipientId;
				if (mem_state[address]) {
					// Update recipient
					mem_state[address].balance += tx.amount;
					mem_state[address].u_balance += tx.amount;
					mem_state[address].blockId = last_block.id;
				} else {
					// Funds sent to new account
					mem_state[address] = {
						address: address,
						balance: tx.amount,
						blockId: last_block.id,
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

		function expectedDelegatesState () {
			var last_block = library.modules.blocks.lastBlock.get();
			_.each(delegates_state, function (delegate) {
				if (delegate.pk === last_block.generatorPublicKey) {
					delegate.blocks_forged_cnt += 1;
				}
			});
			return delegates_state;
		}

		before(function () {
			// Set delegates module as loaded to allow manual forging
			rewiredModules.delegates.__set__('__private.loaded', true);
		});

		it('should load all secrets of 101 delegates and set modules.delegates.__private.keypairs (native)', function (done) {
			var loadDelegates = rewiredModules.delegates.__get__('__private.loadDelegates');
			loadDelegates(function (err) {
				var keypairs = rewiredModules.delegates.__get__('__private.keypairs');
				expect(Object.keys(keypairs).length).to.equal(config.forging.secret.length);
				_.each(keypairs, function (keypair, pk) {
					expect(keypair.publicKey).to.be.instanceOf(Buffer);
					expect(keypair.privateKey).to.be.instanceOf(Buffer);
					expect(pk).to.equal(keypair.publicKey.toString('hex'));
				});
				done(err);
			});
		});

		it('should forge block with 1 TRANSFER transaction to random account, update mem_accounts (native) and delegates (trigger block_insert_delete) tables', function () {
			var transactions = [];
			var tx = node.lisk.transaction.createTransaction(
				node.randomAccount().address,
				node.randomNumber(100000000, 1000000000),
				node.gAccount.password
			);
			transactions.push(tx);

			return tickAndValidate(transactions);
		});

		it('should forge block with 25 TRANSFER transactions to random accounts, update mem_accounts (native) and delegates (trigger block_insert_delete) tables', function () {
			var tx_cnt = 25;
			var transactions = [];

			for (var i = tx_cnt - 1; i >= 0; i--) {
				var tx = node.lisk.transaction.createTransaction(
					node.randomAccount().address,
					node.randomNumber(100000000, 1000000000),
					node.gAccount.password
				);
				transactions.push(tx);
			}

			return tickAndValidate(transactions);
		});

		it('should forge 98 blocks with 1 TRANSFER transaction each to random account, update mem_accounts (native) and delegates (trigger block_insert_delete) tables', function (done) {
			var blocks_cnt = 98;
			var blocks_processed = 0;
			var tx_cnt = 1;

			async.doUntil(function (untilCb) {
				++blocks_processed;
				var transactions = [];
				for (var t = tx_cnt - 1; t >= 0; t--) {
					var tx = node.lisk.transaction.createTransaction(
						node.randomAccount().address,
						node.randomNumber(100000000, 1000000000),
						node.gAccount.password
					);
					transactions.push(tx);
				}
				node.debug('	Processing block ' + blocks_processed + ' of ' + blocks_cnt + ' with ' + transactions.length + ' transactions');

				// We need to wait 1 second between forge because of block time
				setTimeout(function () {
					tickAndValidate(transactions).then(untilCb).catch(untilCb);
				}, 1000);
				
			}, function (err) {
				return err || blocks_processed >= blocks_cnt;
			}, done);
		});

		it('should calculate rewards for round 1 correctly - all should be the same (native, rounds_rewards, delegates)', function () {
			var round = 1;
			var expectedRewards;

			return getBlocks(round)
				.then(function (blocks) {
					expectedRewards = getExpectedRoundRewards(blocks);
				})
				.then(function () {
					return getRoundRewards(round);
				})
				.then(function (rewards) {
					expect(rewards).to.deep.equal(expectedRewards);
				})
				.then(function () {
					return getDelegates();
				})
				.reduce(function (delegates, d) {
					if (d.fees > 0 || d.rewards > 0) {
						delegates[d.pk] = {
							pk: d.pk,
							fees: Number(d.fees),
							rewards: Number(d.rewards)
						}
					}
					return delegates;
				}, {})
				.then(function (delegates) {
					expect(delegates).to.deep.equal(expectedRewards);
				});
		});
	});
});
