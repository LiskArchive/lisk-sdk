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
const util = require('util');
const rewire = require('rewire');
const async = require('async');
const ed = require('../../../src/modules/chain/helpers/ed');
const jobsQueue = require('../../../src/modules/chain/helpers/jobs_queue');
const Sequence = require('../../../src/modules/chain/helpers/sequence');
const { createCacheComponent } = require('../../../src/components/cache');
const { StorageSandbox } = require('./storage_sandbox');
const { ZSchema } = require('../../../src/controller/helpers/validator');
const initSteps = require('../../../src/modules/chain/init_steps');

const promisifyParallel = util.promisify(async.parallel);
let currentAppScope;

const modulesInit = {
	accounts: '../../../src/modules/chain/submodules/accounts',
	blocks: '../../../src/modules/chain/submodules/blocks',
	dapps: '../../../src/modules/chain/submodules/dapps',
	delegates: '../../../src/modules/chain/submodules/delegates',
	loader: '../../../src/modules/chain/submodules/loader',
	multisignatures: '../../../src/modules/chain/submodules/multisignatures',
	peers: '../../../src/modules/chain/submodules/peers',
	rounds: '../../../src/modules/chain/submodules/rounds',
	signatures: '../../../src/modules/chain/submodules/signatures',
	transactions: '../../../src/modules/chain/submodules/transactions',
	transport: '../../../src/modules/chain/submodules/transport',
};

function init(options, cb) {
	options = options || {};
	options.scope = options.scope ? options.scope : {};
	// Wait for genesisBlock only if false is provided
	options.scope.waitForGenesisBlock = options.waitForGenesisBlock !== false;

	__init(options.sandbox, options.scope)
		.then(scope => cb(null, scope))
		.catch(err => cb(err));
}

// Init whole application inside tests
async function __init(sandbox, initScope) {
	__testContext.debug(
		'initApplication: Application initialization inside test environment started...'
	);

	jobsQueue.jobs = {};

	__testContext.config.syncing.active = false;
	__testContext.config.broadcasts.active = false;
	__testContext.config = Object.assign(
		__testContext.config,
		initScope.config || {}
	);

	const config = __testContext.config;
	let storage;
	if (!initScope.components) {
		initScope.components = {};
	}

	try {
		if (sandbox && !initScope.components.storage) {
			storage = new StorageSandbox(sandbox.config || config.db, sandbox.name);
		} else {
			config.db.user = config.db.user || process.env.USER;
			storage = new StorageSandbox(config.db);
		}

		__testContext.debug(
			`initApplication: Target database - ${storage.options.database}`
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

		const logger = initScope.components.logger || {
			trace: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			log: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
		};

		const scope = Object.assign(
			{},
			{
				lastCommit: '',
				ed,
				build: '',
				config: __testContext.config,
				genesisBlock: { block: __testContext.config.genesisBlock },
				schema: new ZSchema(),
				sequence: new Sequence({
					onWarning(current) {
						logger.warn('Main queue', current);
					},
				}),
				balancesSequence: new Sequence({
					onWarning(current) {
						logger.warn('Balance queue', current);
					},
				}),
				channel: {
					invoke: sinonSandbox.stub(),
					publish: sinonSandbox.stub(),
					suscribe: sinonSandbox.stub(),
					once: sinonSandbox.stub().callsArg(1),
				},
				applicationState: {
					nethash: __testContext.nethash,
					version: __testContext.version,
					wsPort: __testContext.wsPort,
					httpPort: __testContext.httpPort,
					minVersion: __testContext.minVersion,
					protocolVersion: __testContext.protocolVersion,
					nonce: __testContext.nonce,
				},
			},
			initScope
		);

		const cache = createCacheComponent(scope.config.redis, logger);

		scope.components = {
			logger,
			storage,
			cache,
		};

		await startStorage();
		await cache.bootstrap();

		scope.config.peers.list = await initSteps.lookupPeerIPs(
			scope.config.peers.list,
			scope.config.peers.enabled
		);
		scope.bus = await initSteps.createBus();
		scope.webSocket = await initStepsForTest.createSocketCluster(scope);
		scope.logic = await initSteps.initLogicStructure(scope);
		scope.modules = await initStepsForTest.initModules(scope);

		// Ready to bind modules
		scope.logic.peers.bindModules(scope.modules);

		// Fire onBind event in every module
		scope.bus.message('bind', scope);

		// Listen to websockets
		// await scope.webSocket.listen();
		// Listen to http, https servers
		// await scope.network.listen();
		// logger.info('Modules ready and launched');

		currentAppScope = scope;
		__testContext.debug('initApplication: Rewired modules available');

		// Overwrite syncing function to prevent interfere with tests
		scope.modules.loader.syncing = function() {
			return false;
		};

		// If bus is overridden, then we just return the scope, without waiting for genesisBlock
		if (!initScope.waitForGenesisBlock || initScope.bus) {
			scope.modules.delegates.onBlockchainReady = function() {};
			return scope;
		}

		// Overwrite onBlockchainReady function to prevent automatic forging
		return new Promise((resolve, reject) => {
			scope.modules.delegates.onBlockchainReady = function() {
				__testContext.debug(
					'initApplication: Fake onBlockchainReady event called'
				);
				__testContext.debug('initApplication: Loading delegates...');

				const loadDelegates = scope.rewiredModules.delegates.__get__(
					'__private.loadDelegates'
				);

				loadDelegates(loadDelegatesErr => {
					if (loadDelegatesErr) {
						reject(loadDelegatesErr);
					}

					const keypairs = scope.rewiredModules.delegates.__get__(
						'__private.keypairs'
					);

					const delegatesCount = Object.keys(keypairs).length;
					expect(delegatesCount).to.equal(
						__testContext.config.forging.delegates.length
					);

					__testContext.debug(
						`initApplication: Delegates loaded from config file - ${delegatesCount}`
					);
					__testContext.debug('initApplication: Done');

					if (initScope.waitForGenesisBlock) {
						resolve(scope);
					}

					resolve(scope);
				});
			};
		});
	} catch (error) {
		__testContext.debug('Error during test application init.', error);
		throw error;
	}
}

function cleanup(done) {
	if (
		Object.prototype.hasOwnProperty.call(currentAppScope, 'components') &&
		currentAppScope.components !== undefined
	) {
		currentAppScope.components.cache.cleanup();
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
				currentAppScope.components.logger.error(err);
			} else {
				currentAppScope.components.logger.info('Cleaned up successfully');
			}
			// Disconnect from database instance if sandbox was used
			if (currentAppScope.components.storage) {
				currentAppScope.components.storage.cleanup();
			}
			done(err);
		}
	);
}

const initStepsForTest = {
	createSocketCluster: async () => {
		const MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
		const wsRPC = require('../../../src/modules/chain/api/ws/rpc/ws_rpc').wsRPC;
		const transport = require('../../../src/modules/chain/api/ws/transport');

		wsRPC.clientsConnectionsMap = {};

		const socketClusterMock = {
			on: sinonSandbox.spy(),
		};

		wsRPC.setServer(new MasterWAMPServer(socketClusterMock));

		// Register RPC
		const transportModuleMock = { internal: {}, shared: {} };
		transport(transportModuleMock);
		return wsRPC;
	},
	initModules: async scope => {
		const tasks = {};
		scope.rewiredModules = {};
		Object.keys(modulesInit).forEach(name => {
			tasks[name] = function(tasksCb) {
				const Instance = rewire(modulesInit[name]);
				scope.rewiredModules[name] = Instance;
				return new Instance(tasksCb, scope);
			};
		});

		const modules = await promisifyParallel(tasks);
		scope.bus.registerModules(modules);

		return modules;
	},
};

module.exports = {
	init,
	cleanup,
};
