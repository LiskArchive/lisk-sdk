'use strict';

// Root object
var node = {};

var Promise = require('bluebird');
var rewire  = require('rewire');
var sinon   = require('sinon');

// Application specific
var Sequence  = require('../helpers/sequence.js');
var slots     = require('../helpers/slots.js');
var swagger = require('../config/swagger');
var swaggerHelper = require('../helpers/swagger');
var http = require('./common/httpCommunication');

// Requires
node.bignum = require('../helpers/bignum.js');
node.config = require('../config.json');
node.constants = require('../helpers/constants.js');
node.dappCategories = require('../helpers/dappCategories.js');
node.dappTypes = require('../helpers/dappTypes.js');
node.transactionTypes = require('../helpers/transactionTypes.js');
node._ = require('lodash');
node.async = require('async');
node.popsicle = require('popsicle');
node.chai = require('chai');
node.chai.config.includeStack = true;
node.chai.use(require('chai-bignumber')(node.bignum));
node.expect = node.chai.expect;
node.should = node.chai.should();
node.lisk = require('lisk-js');
node.Promise = require('bluebird');
var randomstring = require('randomstring');

var jobsQueue = require('../helpers/jobsQueue.js');

node.config.root = process.cwd();

require('colors');

// Node configuration
node.normalizer = 100000000; // Use this to convert LISK amount to normal value
node.blockTime = 10000; // Block time in miliseconds
node.blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
node.version = node.config.version; // Node version
node.nonce = randomstring.generate(16);

node.swaggerDef = swaggerHelper.getSwaggerSpec();

// Optional logging
if (process.env.SILENT === 'true') {
	node.debug = function () {};
} else {
	node.debug = console.log;
}

var currentAppScope;

// Init whole application inside tests
node.initApplication = function (cb, initScope) {

	initScope.waitForGenesisBlock = initScope.waitForGenesisBlock !== false;

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
			accounts: '../modules/accounts.js',
			blocks: '../modules/blocks.js',
			dapps: '../modules/dapps.js',
			delegates: '../modules/delegates.js',
			loader: '../modules/loader.js',
			multisignatures: '../modules/multisignatures.js',
			node: '../modules/node.js',
			peers: '../modules/peers.js',
			signatures: '../modules/signatures.js',
			system: '../modules/system.js',
			transactions: '../modules/transactions.js',
			transport: '../modules/transport.js',
			voters: '../modules/voters.js'
		};

		// Init limited application layer
		node.async.auto({
			config: function (cb) {
				cb(null, node.config);
			},
			genesisblock: function (cb) {
				var genesisblock = require('../genesisBlock.json');
				cb(null, {block: genesisblock});
			},

			schema: function (cb) {
				var z_schema = require('../helpers/z_schema.js');
				cb(null, new z_schema());
			},
			network: function (cb) {
				// Init with empty function
				cb(null, {io: {sockets: {emit: function () {}}}, app: require('express')()});
			},
			webSocket: ['config', 'logger', 'network', function (scope, cb) {
				// Init with empty functions
				var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

				var dummySocketCluster = {on: function () {}};
				var dummyWAMPServer = new MasterWAMPServer(dummySocketCluster, {});
				var wsRPC = require('../api/ws/rpc/wsRPC.js').wsRPC;

				wsRPC.setServer(dummyWAMPServer);
				wsRPC.clientsConnectionsMap = {};
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

			swagger: ['network', 'modules', 'logger', function (scope, cb) {
				swagger(scope.network.app, scope.config, scope.logger, scope, cb);
			}],

			ed: function (cb) {
				cb(null, require('../helpers/ed.js'));
			},

			bus: ['ed', function (scope, cb) {
				var changeCase = require('change-case');

				var bus = initScope.bus || new (function () {
					this.message = function () {
						var args = [];
						Array.prototype.push.apply(args, arguments);
						var topic = args.shift();
						var eventName = 'on' + changeCase.pascalCase(topic);

						// Iterate over modules and execute event functions (on*)
						modules.forEach(function (module) {
							if (typeof(module[eventName]) === 'function') {
								jobsQueue.jobs = {};
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
				})();
				cb(null, bus);
			}],
			db: function (cb) {
				cb(null, db);
			},
			pg_notify: ['db', 'bus', 'logger', function (scope, cb) {
				var pg_notify = require('../helpers/pg-notify.js');
				pg_notify.init(scope.db, scope.bus, scope.logger, cb);
			}],
			rpc: ['db', 'bus', 'logger', function (scope, cb) {
				var wsRPC = require('../api/ws/rpc/wsRPC').wsRPC;
				var transport = require('../api/ws/transport');
				var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

				var socketClusterMock = {
					on: sinon.spy()
				};
				wsRPC.setServer(new MasterWAMPServer(socketClusterMock));

				// Register RPC
				var transportModuleMock = {internal: {}, shared: {}};
				transport(transportModuleMock);
				cb();
			}],
			logic: ['db', 'bus', 'schema', 'network', 'genesisblock', function (scope, cb) {
				var Transaction = require('../logic/transaction.js');
				var Block = require('../logic/block.js');
				var Multisignature = require('../logic/multisignature.js');
				var Account = require('../logic/account.js');
				var Peers = require('../logic/peers.js');

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
					}],
					multisignature: ['schema', 'transaction', 'logger', function (scope, cb) {
						cb(null, new Multisignature(scope.schema, scope.network, scope.transaction, scope.logger));
					}]
				}, cb);
			}],
			modules: ['network', 'webSocket', 'logger', 'bus', 'sequence', 'dbSequence', 'balancesSequence', 'db', 'logic', 'rpc', function (scope, cb) {
				var tasks = {};
				scope.rewiredModules = {};

				Object.keys(modulesInit).forEach(function (name) {
					tasks[name] = function (cb) {
						var Instance = rewire(modulesInit[name]);
						rewiredModules[name] = Instance;
						var obj = new rewiredModules[name](cb, scope);
						modules.push(obj);
					};
				});

				node.async.parallel(tasks, function (err, results) {
					cb(err, results);
				});
			}],
			ready: ['modules', 'bus', 'logic', function (scope, cb) {
				// Fire onBind event in every module
				scope.bus.message('bind', scope.modules);
				scope.logic.peers.bindModules(scope.modules);
				cb();
			}]
		}, function (err, scope) {
			// Overwrite onBlockchainReady function to prevent automatic forging
			scope.rewiredModules = rewiredModules;

			scope.modules.delegates.onBlockchainReady = function () {
				// Wait for genesis block's transactions to be applied into mem_accounts
				if (initScope.waitForGenesisBlock) {
					return cb(err, scope);
				}
			};
			currentAppScope = scope;
			if (!initScope.waitForGenesisBlock || initScope.bus) {
				return cb(err, scope);
			}
		});
	});
};

node.appCleanup = function (done) {
	node.async.eachSeries(currentAppScope.modules, function (module, cb) {
		if (typeof(module.cleanup) === 'function') {
			module.cleanup(cb);
		} else {
			cb();
		}
	}, function (err) {
		if (err) {
			currentAppScope.logger.error(err);
		} else {
			currentAppScope.logger.info('Cleaned up successfully');
		}
		done();
	});
};

before(function (done) {
	require('./common/globalBefore').waitUntilBlockchainReady(done);
});

// Exports
module.exports = node;
