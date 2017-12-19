'use strict';

// Global imports
var child_process = require('child_process');
var Promise       = require('bluebird');
var rewire        = require('rewire');
var sinon         = require('sinon');

// Application-specific imports
var node      = require('./../node.js');
var database  = require('../../helpers/database.js');
var jobsQueue = require('../../helpers/jobsQueue.js');
var Sequence  = require('../../helpers/sequence.js');

var dbSandbox;
var currentAppScope;
var testDatabaseNames = [];

function DBSandbox (dbConfig, testDatabaseName) {
	this.dbConfig = dbConfig;
	this.originalDatabaseName = dbConfig.database;
	this.testDatabaseName = testDatabaseName || this.originalDatabaseName;
	this.dbConfig.database = this.testDatabaseName;
	testDatabaseNames.push(this.testDatabaseName);

	var dropCreatedDatabases = function () {
		testDatabaseNames.forEach(function (testDatabaseName) {
			child_process.exec('dropdb ' + testDatabaseName);
		});
	};

	process.on('exit', function () {
		dropCreatedDatabases();
	});
}

DBSandbox.prototype.create = function (cb) {
	child_process.exec('dropdb ' + this.dbConfig.database, function () {
		child_process.exec('createdb ' + this.dbConfig.database, function () {
			database.connect(this.dbConfig, console, cb);
		}.bind(this));
	}.bind(this));
};

DBSandbox.prototype.destroy = function (logger) {
	database.disconnect(logger);
	this.dbConfig.database = this.originalDatabaseName;
};

// Init whole application inside tests - public
function init (options, cb) {
	options = options ? options : {};
	options.scope = options.scope ? options.scope : {};

	if (options.sandbox) {
		dbSandbox = new DBSandbox(options.sandbox.config || node.config.db, options.sandbox.name);
		dbSandbox.create(function (err, __db) {
			options.scope.db = __db;
			__init(options.scope, cb);
		});
	} else {
		__init(options.scope, cb);
	}
}

// Init whole application inside tests - private
function __init (initScope, done) {
	node.debug('initApplication: Application initialization inside test environment started...');

	// Reset jobsQueue
	jobsQueue.jobs = {};

	var modules = [], rewiredModules = {};
	// Init dummy connection with database - valid, used for tests here
	var options = {
		promiseLib: Promise
	};
	var db = initScope.db;
	if (!db) {
		var pgp = require('pg-promise')(options);
		node.config.db.user = node.config.db.user || process.env.USER;
		db = pgp(node.config.db);
	}

	node.debug('initApplication: Target database - ' + node.config.db.database);

	// Clear tables
	db.task(function (t) {
		return t.batch([
			t.none('DELETE FROM blocks WHERE height > 1'),
			t.none('DELETE FROM blocks'),
			t.none('DELETE FROM mem_accounts')
		]);
	}).then(function () {
		var logger = initScope.logger || {
			trace: sinon.spy(),
			debug: sinon.spy(),
			info:  sinon.spy(),
			log:   sinon.spy(),
			warn:  sinon.spy(),
			error: sinon.spy()
		};

		var modulesInit = {
			accounts: '../../modules/accounts.js',
			rounds: '../../modules/rounds.js',
			transactions: '../../modules/transactions.js',
			blocks: '../../modules/blocks.js',
			signatures: '../../modules/signatures.js',
			transport: '../../modules/transport.js',
			loader: '../../modules/loader.js',
			system: '../../modules/system.js',
			peers: '../../modules/peers.js',
			delegates: '../../modules/delegates.js',
			multisignatures: '../../modules/multisignatures.js'
		};

		// Init limited application layer
		node.async.auto({
			config: function (cb) {
				cb(null, node.config);
			},
			genesisblock: function (cb) {
				var genesisblock = require('../../genesisBlock.json');
				cb(null, {block: genesisblock});
			},

			schema: function (cb) {
				var z_schema = require('../../helpers/z_schema.js');
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
				cb(null, require('../../helpers/ed.js'));
			},
			bus: ['ed', function (scope, cb) {
				var changeCase = require('change-case');
				var bus = function () {
					this.message = function () {
						var args = [];
						Array.prototype.push.apply(args, arguments);
						var topic = args.shift();
						var eventName = 'on' + changeCase.pascalCase(topic);

						// Iterate over modules and execute event functions (on*)
						modules.forEach(function (module) {
							if (typeof(module[eventName]) === 'function') {
								module[eventName].apply(module[eventName], args);
							}
							if (module.submodules) {
								node.async.each(module.submodules, function (submodule) {
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
			logic: ['db', 'bus', 'schema', 'genesisblock', function (scope, cb) {
				var Transaction = require('../../logic/transaction.js');
				var Block = require('../../logic/block.js');
				var Account = require('../../logic/account.js');
				var Peers = require('../../logic/peers.js');

				node.async.auto({
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
				scope.rewiredModules = {};

				Object.keys(modulesInit).forEach(function (name) {
					tasks[name] = function (cb) {
						var Instance = rewire(modulesInit[name]);

						rewiredModules[name] = Instance;
						var obj = new rewiredModules[name](cb, scope);
						modules.push(obj);
						node.debug('initApplication: Module ' + name + ' loaded');
					};
				});

				node.async.parallel(tasks, function (err, results) {
					cb(err, results);
				});
			}],
			ready: ['modules', 'bus', 'logic', function (scope, cb) {
				// Fire onBind event in every module
				scope.bus.message('bind', scope.modules);
				scope.logic.transaction.bindModules(scope.modules);
				scope.logic.peers.bindModules(scope.modules);
				node.debug('initApplication: Modules binding done');
				cb();
			}]
		}, function (err, scope) {
			node.expect(err).to.be.null;

			scope.rewiredModules = rewiredModules;
			currentAppScope = scope;
			node.debug('initApplication: Rewired modules available');

			// Overwrite onBlockchainReady function to prevent automatic forging
			scope.modules.delegates.onBlockchainReady = function () {
				node.debug('initApplication: Fake onBlockchainReady event called');
				node.debug('initApplication: Loading delegates...');

				var loadDelegates = scope.rewiredModules.delegates.__get__('__private.loadDelegates');
				loadDelegates(function (err) {
					node.expect(err).to.be.null;

					var keypairs = scope.rewiredModules.delegates.__get__('__private.keypairs');
					var delegates_cnt = Object.keys(keypairs).length;
					node.expect(delegates_cnt).to.equal(node.config.forging.secret.length);

					node.debug('initApplication: Delegates loaded from config file - ' + delegates_cnt);
					node.debug('initApplication: Done');
					return done(scope);
				});
			};
		});
	}).catch(function (err) {
		node.debug(err.stack);
	});
};

function cleanup (cb) {
	node.async.eachSeries(currentAppScope.modules, function (module, seriesCb) {
		if (typeof(module.cleanup) === 'function') {
			module.cleanup(seriesCb);
		} else {
			seriesCb();
		}
	}, function (err) {
		if (err) {
			currentAppScope.logger.error(err);
		} else {
			currentAppScope.logger.info('Cleaned up successfully');
		}
		// Disconnect from database instance if sandbox was used
		if (dbSandbox) {
			dbSandbox.destroy();
		}
		cb();
	});
};

module.exports = {
	init: init,
	cleanup: cleanup
};
