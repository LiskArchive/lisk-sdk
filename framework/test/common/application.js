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
const httpApi = require('../../src/modules/chain/helpers/http_api');
const jobsQueue = require('../../src/modules/chain/helpers/jobs_queue');
const Sequence = require('../../src/modules/chain/helpers/sequence');
const { createCacheComponent } = require('../../src/components/cache');
const { createSystemComponent } = require('../../src/components/system');
const StorageSandbox = require('./storage_sandbox').StorageSandbox;

let currentAppScope;

function init(options, cb) {
	options = options || {};
	options.scope = options.scope ? options.scope : {};
	// Wait for genesisBlock only if false is provided
	options.scope.waitForGenesisBlock = options.waitForGenesisBlock !== false;

	if (options.sandbox) {
		const storage = new StorageSandbox(
			options.sandbox.config || __testContext.config.db,
			options.sandbox.name
		);
		storage.bootstrap().then(() => {
			options.scope.storage = storage;
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
	const components = [];
	const rewiredModules = {};
	let storage = initScope.storage;

	if (!storage) {
		__testContext.config.db.user =
			__testContext.config.db.user || process.env.USER;
		storage = new StorageSandbox(__testContext.config.db);
	}

	__testContext.debug(
		`initApplication: Target database - ${__testContext.config.db.database}`
	);

	const startStorage = async () =>
		(storage.isReady ? Promise.resolve() : storage.bootstrap())
			.then(() => {
				storage.entities.Account.extendDefaultOptions({
					limit: global.constants.ACTIVE_DELEGATES,
				});

				return storage.adapter.task('clear-tables', t =>
					t.batch([
						storage.adapter.execute(
							'DELETE FROM blocks WHERE height > 1',
							{},
							{},
							t
						),
						storage.adapter.execute('DELETE FROM blocks', {}, {}, t),
						storage.adapter.execute('DELETE FROM mem_accounts', {}, {}, t),
					])
				);
			})
			.then(async status => {
				if (status) {
					await storage.entities.Migration.applyAll();
					await storage.entities.Migration.applyRunTime();
				}
			});

	// Clear tables
	startStorage().then(() => {
		const logger = initScope.logger || {
			trace: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			log: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
		};

		const modulesInit = {
			accounts: '../../src/modules/chain/modules/accounts.js',
			blocks: '../../src/modules/chain/modules/blocks.js',
			dapps: '../../src/modules/chain/modules/dapps.js',
			delegates: '../../src/modules/chain/modules/delegates.js',
			loader: '../../src/modules/chain/modules/loader.js',
			multisignatures: '../../src/modules/chain/modules/multisignatures.js',
			node: '../../src/modules/chain/modules/node.js',
			peers: '../../src/modules/chain/modules/peers.js',
			rounds: '../../src/modules/chain/modules/rounds.js',
			signatures: '../../src/modules/chain/modules/signatures.js',
			transactions: '../../src/modules/chain/modules/transactions.js',
			transport: '../../src/modules/chain/modules/transport.js',
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
								return callback(null, Object.assign({}, peer, { ip: address }));
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
					const Z_schema = require('../../src/modules/chain/helpers/z_schema.js');
					cb(null, new Z_schema());
				},

				network(cb) {
					// Init with empty function
					cb(null, {
						io: { sockets: { emit() {} } },
						app: require('express')(),
					});
				},

				components(cb) {
					const cache = createCacheComponent(
						__testContext.config.redis,
						logger
					);
					const system = createSystemComponent(
						__testContext.config,
						logger,
						storage
					);
					return cache.bootstrap().then(err => {
						if (err) {
							return cb(err);
						}
						components.push(cache);
						components.push(system);
						return cb(null, {
							cache,
							system,
						});
					});
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
						const wsRPC = require('../../src/modules/chain/api/ws/rpc/ws_rpc.js')
							.wsRPC;

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
					'components',
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
					cb(null, require('../../src/modules/chain/helpers/ed.js'));
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

				storage: [
					'config',
					function(scope, cb) {
						cb(!storage.isReady, storage);
					},
				],

				rpc: [
					'storage',
					'bus',
					'logger',
					function(scope, cb) {
						const wsRPC = require('../../src/modules/chain/api/ws/rpc/ws_rpc')
							.wsRPC;
						const transport = require('../../src/modules/chain/api/ws/transport');
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
					'components',
					'storage',
					'bus',
					'schema',
					'network',
					'genesisBlock',
					function(scope, cb) {
						const Transaction = require('../../src/modules/chain/logic/transaction.js');
						const Block = require('../../src/modules/chain/logic/block.js');
						const Multisignature = require('../../src/modules/chain/logic/multisignature.js');
						const Account = require('../../src/modules/chain/logic/account.js');
						const Peers = require('../../src/modules/chain/logic/peers.js');

						async.auto(
							{
								bus(busCb) {
									busCb(null, scope.bus);
								},
								config(configCb) {
									configCb(null, scope.config);
								},
								storage(dbCb) {
									dbCb(null, scope.storage);
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
									'storage',
									'bus',
									'ed',
									'schema',
									'genesisBlock',
									'logger',
									function(accountScope, accountCb) {
										new Account(
											accountScope.storage,
											accountScope.schema,
											accountScope.logger,
											accountCb
										);
									},
								],
								transaction: [
									'storage',
									'bus',
									'ed',
									'schema',
									'genesisBlock',
									'account',
									'logger',
									function(transactionScope, transactionCb) {
										new Transaction(
											transactionScope.storage,
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
									'storage',
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
									'storage',
									function(peersScope, peerscb) {
										new Peers(
											peersScope.config,
											peersScope.logger,
											scope.components.system,
											peerscb
										);
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
					'storage',
					'logic',
					'rpc',
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
					'components',
					'swagger',
					'modules',
					'bus',
					'logic',
					function(scope, cb) {
						scope.modules.swagger = scope.swagger;

						// Fire onBind event in every module
						scope.bus.message('bind', scope);
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
	if (currentAppScope.components !== undefined) {
		Object.keys(currentAppScope.components)
			.filter(
				key => typeof currentAppScope.components[key].cleanup === 'function'
			)
			.map(key => currentAppScope.components[key].cleanup());
	}
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
			if (currentAppScope.storage) {
				currentAppScope.storage.cleanup();
			}
			done(err);
		}
	);
}

module.exports = {
	init,
	cleanup,
};
