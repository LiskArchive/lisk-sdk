/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

// Global imports
var Promise = require('bluebird');
var rewire = require('rewire');
var async = require('async');

var DBSandbox = require('./db_sandbox').DBSandbox;

var swagger = require('../../config/swagger');
var jobsQueue = require('../../helpers/jobs_queue');
var Sequence = require('../../helpers/sequence');
var dbRepos = require('require-all')(`${__dirname}/../../db/repos`);

var dbSandbox;
var currentAppScope;

function init(options, cb) {
	options = options || {};
	options.scope = options.scope ? options.scope : {};
	// Wait for genesisBlock only if false is provided
	options.scope.waitForGenesisBlock = options.waitForGenesisBlock !== false;

	if (options.sandbox) {
		dbSandbox = new DBSandbox(
			options.sandbox.config || __testContext.config.db,
			options.sandbox.name
		);
		dbSandbox.create((err, __db) => {
			options.scope.db = __db;
			__init(options.scope, cb);
		});
	} else {
		__init(options.scope, cb);
	}
}

// Init whole application inside tests
function __init(initScope, done) {
	__testContext.debug(
		'initApplication: Application initialization inside test environment started...'
	);

	jobsQueue.jobs = {};
	var modules = [];
	var rewiredModules = {};
	// Init dummy connection with database - valid, used for tests here
	var options = {
		promiseLib: Promise,

		pgNative: true,

		// Extending the database protocol with our custom repositories;
		// API: http://vitaly-t.github.io/pg-promise/global.html#event:extend
		extend: function(object) {
			Object.keys(dbRepos).forEach(repoName => {
				object[repoName] = new dbRepos[repoName](object, pgp);
			});
		},
	};
	var db = initScope.db;
	if (!db) {
		var pgp = require('pg-promise')(options);
		__testContext.config.db.user =
			__testContext.config.db.user || process.env.USER;
		db = pgp(__testContext.config.db);
	}

	__testContext.debug(
		`initApplication: Target database - ${__testContext.config.db.database}`
	);

	// Clear tables
	db
		.task(t => {
			return t.batch([
				t.none('DELETE FROM blocks WHERE height > 1'),
				t.none('DELETE FROM blocks'),
				t.none('DELETE FROM mem_accounts'),
			]);
		})
		.then(() => {
			var logger = initScope.logger || {
				trace: sinonSandbox.spy(),
				debug: sinonSandbox.spy(),
				info: sinonSandbox.spy(),
				log: sinonSandbox.spy(),
				warn: sinonSandbox.spy(),
				error: sinonSandbox.spy(),
			};

			var modulesInit = {
				accounts: '../../modules/accounts.js',
				blocks: '../../modules/blocks.js',
				dapps: '../../modules/dapps.js',
				delegates: '../../modules/delegates.js',
				loader: '../../modules/loader.js',
				multisignatures: '../../modules/multisignatures.js',
				node: '../../modules/node.js',
				peers: '../../modules/peers.js',
				rounds: '../../modules/rounds.js',
				signatures: '../../modules/signatures.js',
				system: '../../modules/system.js',
				transactions: '../../modules/transactions.js',
				transport: '../../modules/transport.js',
				voters: '../../modules/voters.js',
			};

			// Init limited application layer
			async.auto(
				{
					config: function(cb) {
						cb(null, __testContext.config);
					},
					genesisblock: function(cb) {
						var genesisblock = require('../data/genesis_block.json');
						cb(null, { block: genesisblock });
					},

					schema: function(cb) {
						var z_schema = require('../../helpers/z_schema.js');
						cb(null, new z_schema());
					},
					network: function(cb) {
						// Init with empty function
						cb(null, {
							io: { sockets: { emit: function() {} } },
							app: require('express')(),
						});
					},
					webSocket: [
						'config',
						'logger',
						'network',
						function(scope, cb) {
							// Init with empty functions
							var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

							var dummySocketCluster = { on: function() {} };
							var dummyWAMPServer = new MasterWAMPServer(
								dummySocketCluster,
								{}
							);
							var wsRPC = require('../../api/ws/rpc/ws_rpc.js').wsRPC;

							wsRPC.setServer(dummyWAMPServer);
							wsRPC.clientsConnectionsMap = {};
							cb();
						},
					],
					logger: function(cb) {
						cb(null, logger);
					},
					dbSequence: [
						'logger',
						function(scope, cb) {
							var sequence = new Sequence({
								onWarning: function(current) {
									scope.logger.warn('DB queue', current);
								},
							});
							cb(null, sequence);
						},
					],
					sequence: [
						'logger',
						function(scope, cb) {
							var sequence = new Sequence({
								onWarning: function(current) {
									scope.logger.warn('Main queue', current);
								},
							});
							cb(null, sequence);
						},
					],
					balancesSequence: [
						'logger',
						function(scope, cb) {
							var sequence = new Sequence({
								onWarning: function(current) {
									scope.logger.warn('Balance queue', current);
								},
							});
							cb(null, sequence);
						},
					],

					swagger: [
						'network',
						'modules',
						'logger',
						function(scope, cb) {
							swagger(scope.network.app, scope.config, scope.logger, scope, cb);
						},
					],

					ed: function(cb) {
						cb(null, require('../../helpers/ed.js'));
					},

					bus: [
						'ed',
						function(scope, cb) {
							var changeCase = require('change-case');

							var bus =
								initScope.bus ||
								new function() {
									this.message = function() {
										var args = [];
										Array.prototype.push.apply(args, arguments);
										var topic = args.shift();
										var eventName = `on${changeCase.pascalCase(topic)}`;

										// Iterate over modules and execute event functions (on*)
										modules.forEach(module => {
											if (typeof module[eventName] === 'function') {
												jobsQueue.jobs = {};
												module[eventName].apply(module[eventName], args);
											}
											if (module.submodules) {
												async.each(module.submodules, submodule => {
													if (
														submodule &&
														typeof submodule[eventName] === 'function'
													) {
														submodule[eventName].apply(
															submodule[eventName],
															args
														);
													}
												});
											}
										});
									};
								}();
							cb(null, bus);
						},
					],
					db: function(cb) {
						cb(null, db);
					},
					rpc: [
						'db',
						'bus',
						'logger',
						function(scope, cb) {
							var wsRPC = require('../../api/ws/rpc/ws_rpc').wsRPC;
							var transport = require('../../api/ws/transport');
							var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

							var socketClusterMock = {
								on: sinonSandbox.spy(),
							};
							wsRPC.setServer(new MasterWAMPServer(socketClusterMock));

							// Register RPC
							var transportModuleMock = { internal: {}, shared: {} };
							transport(transportModuleMock);
							cb();
						},
					],
					logic: [
						'db',
						'bus',
						'schema',
						'network',
						'genesisblock',
						function(scope, cb) {
							var Transaction = require('../../logic/transaction.js');
							var Block = require('../../logic/block.js');
							var Multisignature = require('../../logic/multisignature.js');
							var Account = require('../../logic/account.js');
							var Peers = require('../../logic/peers.js');

							async.auto(
								{
									bus: function(cb) {
										cb(null, scope.bus);
									},
									db: function(cb) {
										cb(null, scope.db);
									},
									ed: function(cb) {
										cb(null, scope.ed);
									},
									logger: function(cb) {
										cb(null, scope.logger);
									},
									schema: function(cb) {
										cb(null, scope.schema);
									},
									genesisblock: function(cb) {
										cb(null, {
											block: scope.genesisblock.block,
										});
									},
									account: [
										'db',
										'bus',
										'ed',
										'schema',
										'genesisblock',
										'logger',
										function(scope, cb) {
											new Account(scope.db, scope.schema, scope.logger, cb);
										},
									],
									transaction: [
										'db',
										'bus',
										'ed',
										'schema',
										'genesisblock',
										'account',
										'logger',
										function(scope, cb) {
											new Transaction(
												scope.db,
												scope.ed,
												scope.schema,
												scope.genesisblock,
												scope.account,
												scope.logger,
												cb
											);
										},
									],
									block: [
										'db',
										'bus',
										'ed',
										'schema',
										'genesisblock',
										'account',
										'transaction',
										function(scope, cb) {
											new Block(scope.ed, scope.schema, scope.transaction, cb);
										},
									],
									peers: [
										'logger',
										function(scope, cb) {
											new Peers(scope.logger, cb);
										},
									],
									multisignature: [
										'schema',
										'transaction',
										'logger',
										function(scope, cb) {
											cb(
												null,
												new Multisignature(
													scope.schema,
													scope.network,
													scope.transaction,
													scope.logger
												)
											);
										},
									],
								},
								cb
							);
						},
					],
					modules: [
						'network',
						'webSocket',
						'logger',
						'bus',
						'sequence',
						'dbSequence',
						'balancesSequence',
						'db',
						'logic',
						'rpc',
						function(scope, cb) {
							var tasks = {};
							scope.rewiredModules = {};

							Object.keys(modulesInit).forEach(name => {
								tasks[name] = function(cb) {
									var Instance = rewire(modulesInit[name]);
									rewiredModules[name] = Instance;
									var obj = new rewiredModules[name](cb, scope);
									modules.push(obj);
								};
							});

							async.parallel(tasks, (err, results) => {
								cb(err, results);
							});
						},
					],
					ready: [
						'swagger',
						'modules',
						'bus',
						'logic',
						function(scope, cb) {
							scope.modules.swagger = scope.swagger;

							// Fire onBind event in every module
							scope.bus.message('bind', scope.modules);
							scope.logic.peers.bindModules(scope.modules);
							cb();
						},
					],
				},
				(err, scope) => {
					scope.rewiredModules = rewiredModules;
					currentAppScope = scope;
					__testContext.debug('initApplication: Rewired modules available');

					// Overwrite syncing function to prevent interfere with tests
					scope.modules.loader.syncing = function() {
						return false;
					};

					// If bus is overridden, then we just return the scope, without waiting for genesisBlock
					if (!initScope.waitForGenesisBlock || initScope.bus) {
						scope.modules.delegates.onBlockchainReady = function() {};
						return done(err, scope);
					}

					// Overwrite onBlockchainReady function to prevent automatic forging
					scope.modules.delegates.onBlockchainReady = function() {
						__testContext.debug(
							'initApplication: Fake onBlockchainReady event called'
						);
						__testContext.debug('initApplication: Loading delegates...');

						var loadDelegates = scope.rewiredModules.delegates.__get__(
							'__private.loadDelegates'
						);
						loadDelegates(err => {
							var keypairs = scope.rewiredModules.delegates.__get__(
								'__private.keypairs'
							);
							var delegates_cnt = Object.keys(keypairs).length;
							expect(delegates_cnt).to.equal(
								__testContext.config.forging.secret.length
							);

							__testContext.debug(
								`initApplication: Delegates loaded from config file - ${delegates_cnt}`
							);
							__testContext.debug('initApplication: Done');

							if (initScope.waitForGenesisBlock) {
								return done(err, scope);
							}
						});
					};
				}
			);
		});
}

function cleanup(done) {
	async.eachSeries(
		currentAppScope.modules,
		(module, cb) => {
			if (typeof module.cleanup === 'function') {
				module.cleanup(cb);
			} else {
				cb();
			}
		},
		err => {
			if (err) {
				currentAppScope.logger.error(err);
			} else {
				currentAppScope.logger.info('Cleaned up successfully');
			}
			// Disconnect from database instance if sandbox was used
			if (dbSandbox) {
				dbSandbox.destroy();
			}
			done(err);
		}
	);
}

module.exports = {
	init: init,
	cleanup: cleanup,
};
