'use strict';

var _      = require('lodash');
var async  = require('async');
var chai   = require('chai');
var expect = require('chai').expect;
var rewire = require('rewire');
var sinon  = require('sinon');

var config = require('../../../config.json');
var Sequence = require('../../../helpers/sequence.js');

describe('Rounds-related SQL triggers', function () {
	var db, logger, library, rewiredModules = {}, modules = [];

	before(function (done) {
		// Init dummy connection with database - valid, used for tests here
		var pgp = require('pg-promise')();
		config.db.user = config.db.user || process.env.USER;
		db = pgp(config.db);

		// Clear tables
		db.none('DELETE FROM blocks; DELETE FROM mem_accounts;').then(done).catch(done);
	});

	before(function (done) {
		logger = {
			trace: sinon.spy(),
			debug: sinon.spy(),
			info:  sinon.spy(),
			warn:  sinon.spy(),
			error: sinon.spy()
		};

		var modulesInit = {
			accounts: '../../../modules/accounts.js',
			transactions: '../../../modules/transactions.js',
			blocks: '../../../modules/blocks.js',
			signatures: '../../../modules/signatures.js',
			// transport: '../../../modules/transport.js',
			// loader: '../../../modules/loader.js',
			// system: '../../../modules/system.js',
			// peers: '../../../modules/peers.js',
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
						var obj = new Instance(cb, scope);
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
					// Number of returned accounts should be equal to number of unique accounts in genesis block
					expect(rows.length).to.equal(accounts.length);

					_.each(rows, function (account) {
						account.balance = Number(account.balance);
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

});