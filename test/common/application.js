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
const dns = require('dns');
const net = require('net');
const Promise = require('bluebird');
const rewire = require('rewire');
const async = require('async');
const dbRepos = require('../../db/repos');
const httpApi = require('../../helpers/http_api');
const jobsQueue = require('../../helpers/jobs_queue');
const Sequence = require('../../helpers/sequence');
const DBSandbox = require('./db_sandbox').DBSandbox;

let dbSandbox;
let currentAppScope;

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
	const modules = [];
	const rewiredModules = {};
	let pgp;
	// Init dummy connection with database - valid, used for tests here
	const options = {
		capSQL: true,
		promiseLib: Promise,

		// Extending the database protocol with our custom repositories;
		// API: http://vitaly-t.github.io/pg-promise/global.html#event:extend
		extend(object) {
			Object.keys(dbRepos).forEach(repoName => {
				object[repoName] = new dbRepos[repoName](object, pgp);
			});
		},
		receive: (/* data, result, e */) => {},
	};
	let db = initScope.db;
	if (!db) {
		pgp = require('pg-promise')(options);
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
			const logger = initScope.logger || {
				trace: sinonSandbox.spy(),
				debug: sinonSandbox.spy(),
				info: sinonSandbox.spy(),
				log: sinonSandbox.spy(),
				warn: sinonSandbox.spy(),
				error: sinonSandbox.spy(),
			};

			const modulesInit = {
				accounts: '../../modules/accounts.js',
				blocks: '../../modules/blocks.js',
				cache: '../../modules/cache.js',
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
					config(cb) {
						// In case domain names are used, resolve those to IP addresses.
						const peerDomainLookupTasks = __testContext.config.peers.list.map(
							peer => callback => {
								if (net.isIPv4(peer.ip)) {
									return setImmediate(() => {
										callback(null, peer);
									});
								}
								return dns.lookup(peer.ip, { family: 4 }, (err, address) => {
									if (err) {
										console.error(
											`Failed to resolve peer domain name ${
												peer.ip
											} to an IP address`
										);
										return callback(err, peer);
									}
									return callback(
										null,
										Object.assign({}, peer, { ip: address })
									);
								});
							}
						);

						async.parallel(peerDomainLookupTasks, (err, results) => {
							if (err) {
								cb(err, __testContext.config);
								return;
							}
							__testContext.config.peers.list = results;
							cb(null, __testContext.config);
						});
					},
					genesisBlock(cb) {
						cb(null, { block: __testContext.config.genesisBlock });
					},

					schema(cb) {
						const Z_schema = require('../../helpers/z_schema.js');
						cb(null, new Z_schema());
					},
					network(cb) {
						// Init with empty function
						cb(null, {
							io: { sockets: { emit() {} } },
							app: require('express')(),
						});
					},
					cache(cb) {
						const RedisConnector = require('../../helpers/redis_connector.js');
						const redisConnector = new RedisConnector(
							__testContext.config.cacheEnabled,
							__testContext.config.redis,
							logger
						);
						redisConnector.connect((_, client) =>
							cb(null, {
								cacheEnabled: __testContext.config.cacheEnabled,
								client,
							})
						);
					},
					webSocket: [
						'config',
						'logger',
						'network',
						function(scope, cb) {
							// Init with empty functions
							const MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

							const dummySocketCluster = { on() {} };
							const dummyWAMPServer = new MasterWAMPServer(
								dummySocketCluster,
								{}
							);
							const wsRPC = require('../../api/ws/rpc/ws_rpc.js').wsRPC;

							wsRPC.setServer(dummyWAMPServer);
							wsRPC.clientsConnectionsMap = {};
							cb();
						},
					],
					logger(cb) {
						cb(null, logger);
					},

					sequence: [
						'logger',
						function(scope, cb) {
							const sequence = new Sequence({
								onWarning(current) {
									scope.logger.warn('Main queue', current);
								},
							});
							cb(null, sequence);
						},
					],
					balancesSequence: [
						'logger',
						function(scope, cb) {
							const sequence = new Sequence({
								onWarning(current) {
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
							httpApi.bootstrapSwagger(
								scope.network.app,
								scope.config,
								scope.logger,
								scope,
								cb
							);
						},
					],

					ed(cb) {
						cb(null, require('../../helpers/ed.js'));
					},

					bus: [
						'ed',
						function(scope, cb) {
							const changeCase = require('change-case');

							const bus =
								initScope.bus ||
								new function() {
									this.message = function(...args) {
										const topic = args.shift();
										const eventName = `on${changeCase.pascalCase(topic)}`;

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
					db: [
						'config',
						function(scope, cb) {
							cb(null, db);
						},
					],
					rpc: [
						'db',
						'bus',
						'logger',
						function(scope, cb) {
							const wsRPC = require('../../api/ws/rpc/ws_rpc').wsRPC;
							const transport = require('../../api/ws/transport');
							const MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

							const socketClusterMock = {
								on: sinonSandbox.spy(),
							};
							wsRPC.setServer(new MasterWAMPServer(socketClusterMock));

							// Register RPC
							const transportModuleMock = { internal: {}, shared: {} };
							transport(transportModuleMock);
							cb();
						},
					],
					logic: [
						'db',
						'bus',
						'schema',
						'network',
						'genesisBlock',
						function(scope, cb) {
							const Transaction = require('../../logic/transaction.js');
							const Block = require('../../logic/block.js');
							const Multisignature = require('../../logic/multisignature.js');
							const Account = require('../../logic/account.js');
							const Peers = require('../../logic/peers.js');

							async.auto(
								{
									bus(busCb) {
										busCb(null, scope.bus);
									},
									config(configCb) {
										configCb(null, scope.config);
									},
									db(dbCb) {
										dbCb(null, scope.db);
									},
									ed(edCb) {
										edCb(null, scope.ed);
									},
									logger(loggerCb) {
										loggerCb(null, scope.logger);
									},
									schema(schemaCb) {
										schemaCb(null, scope.schema);
									},
									genesisBlock(genesisBlockCb) {
										genesisBlockCb(null, scope.genesisBlock);
									},
									account: [
										'db',
										'bus',
										'ed',
										'schema',
										'genesisBlock',
										'logger',
										function(accountScope, accountCb) {
											new Account(
												accountScope.db,
												accountScope.schema,
												accountScope.logger,
												accountCb
											);
										},
									],
									transaction: [
										'db',
										'bus',
										'ed',
										'schema',
										'genesisBlock',
										'account',
										'logger',
										function(transactionScope, transactionCb) {
											new Transaction(
												transactionScope.db,
												transactionScope.ed,
												transactionScope.schema,
												transactionScope.genesisBlock,
												transactionScope.account,
												transactionScope.logger,
												transactionCb
											);
										},
									],
									block: [
										'db',
										'bus',
										'ed',
										'schema',
										'genesisBlock',
										'account',
										'transaction',
										function(blockScope, blockCb) {
											new Block(
												blockScope.ed,
												blockScope.schema,
												blockScope.transaction,
												blockCb
											);
										},
									],
									peers: [
										'logger',
										'config',
										function(peersScope, peerscb) {
											new Peers(peersScope.logger, peersScope.config, peerscb);
										},
									],
									multisignature: [
										'schema',
										'transaction',
										'logger',
										function(multisignatureScope, multisignaturecb) {
											multisignaturecb(
												null,
												new Multisignature(
													multisignatureScope.schema,
													multisignatureScope.network,
													multisignatureScope.transaction,
													multisignatureScope.logger
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
						'balancesSequence',
						'db',
						'logic',
						'rpc',
						'cache',
						function(scope, cb) {
							const tasks = {};
							scope.rewiredModules = {};

							Object.keys(modulesInit).forEach(name => {
								tasks[name] = function(tasksCb) {
									const Instance = rewire(modulesInit[name]);
									rewiredModules[name] = Instance;
									const obj = new rewiredModules[name](tasksCb, scope);
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

						const loadDelegates = scope.rewiredModules.delegates.__get__(
							'__private.loadDelegates'
						);
						loadDelegates(loadDelegatesErr => {
							const keypairs = scope.rewiredModules.delegates.__get__(
								'__private.keypairs'
							);
							const delegates_cnt = Object.keys(keypairs).length;
							expect(delegates_cnt).to.equal(
								__testContext.config.forging.delegates.length
							);

							__testContext.debug(
								`initApplication: Delegates loaded from config file - ${delegates_cnt}`
							);
							__testContext.debug('initApplication: Done');

							if (initScope.waitForGenesisBlock) {
								return done(loadDelegatesErr, scope);
							}

							return null;
						});
					};

					return null;
				}
			);
		});
}

function cleanup(done) {
	async.eachSeries(
		currentAppScope.modules,
		(module, cb) => {
			if (typeof module.cleanup === 'function') {
				return module.cleanup(cb);
			}
			return cb();
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
	init,
	cleanup,
};
