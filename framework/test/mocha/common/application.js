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
const rewire = require('rewire');
const async = require('async');
const _ = require('lodash');
const { registeredTransactions } = require('./registered_transactions');
const jobsQueue = require('../../../src/modules/chain/utils/jobs_queue');
const Sequence = require('../../../src/modules/chain/utils/sequence');
const { BlockSlots } = require('../../../src/modules/chain/blocks/block_slots');
const { createCacheComponent } = require('../../../src/components/cache');
const { StorageSandbox } = require('./storage_sandbox');
const { ZSchema } = require('../../../src/controller/validator');
const initSteps = require('../../../src/modules/chain/init_steps');

let currentAppScope;

const ChainModule = require('../../../src/modules/chain');
const NetworkModule = require('../../../src/modules/network');
const HttpAPIModule = require('../../../src/modules/http_api');

const modulesMigrations = {};
modulesMigrations[ChainModule.alias] = ChainModule.migrations;
modulesMigrations[NetworkModule.alias] = NetworkModule.migrations;
modulesMigrations[HttpAPIModule.alias] = HttpAPIModule.migrations;

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

	__testContext.config.modules.chain.syncing.active = false;
	__testContext.config.modules.chain.broadcasts.active = false;
	__testContext.config = Object.assign(
		__testContext.config,
		initScope.config || {}
	);

	const config = __testContext.config.modules.chain;
	let storage;
	if (!initScope.components) {
		initScope.components = {};
	}

	try {
		if (sandbox && !initScope.components.storage) {
			storage = new StorageSandbox(
				sandbox.config || __testContext.config.components.storage,
				sandbox.name
			);
		} else {
			__testContext.config.components.storage.user =
				__testContext.config.components.storage.user || process.env.USER;
			storage = new StorageSandbox(__testContext.config.components.storage);
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
						await storage.entities.Migration.defineSchema();
						await storage.entities.Migration.applyAll(modulesMigrations);
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

		const scope = _.merge(
			{
				lastCommit: '',
				build: '',
				config,
				genesisBlock: { block: __testContext.config.genesisBlock },
				registeredTransactions,
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
				applicationState: __testContext.config.initialState,
			},
			initScope
		);
		const cache = createCacheComponent(
			__testContext.config.components.cache,
			logger
		);

		scope.components = {
			logger,
			storage,
			cache,
		};

		await startStorage();
		await cache.bootstrap();

		scope.bus = await initSteps.createBus();
		scope.modules = await initStepsForTest.initModules(scope);

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
		await scope.modules.blocks.loadBlockChain();
		return scope;
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
				module.cleanup();
				return cb();
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
	initModules: async scope => {
		scope.rewiredModules = {};
		const modules = {};

		const {
			TransactionInterfaceAdapter: RewiredTransactionInterfaceAdapter,
		} = rewire('../../../src/modules/chain/interface_adapters');

		scope.rewiredModules.interfaceAdapters = {};
		scope.rewiredModules.interfaceAdapters.transactions = RewiredTransactionInterfaceAdapter;
		scope.slots = new BlockSlots({
			epochTime: __testContext.config.constants.EPOCH_TIME,
			interval: __testContext.config.constants.BLOCK_TIME,
			blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
		});
		modules.interfaceAdapters = {};
		modules.interfaceAdapters.transactions = new RewiredTransactionInterfaceAdapter(
			__testContext.config.modules.chain.registeredTransactions
		);
		const {
			Rounds: RewiredRounds,
		} = require('../../../src/modules/chain/rounds');
		modules.rounds = new RewiredRounds({
			channel: scope.channel,
			components: {
				logger: scope.components.logger,
				storage: scope.components.storage,
			},
			bus: scope.bus,
			slots: scope.slots,
			schema: scope.schema,
			config: {
				exceptions: __testContext.config.modules.chain.exceptions,
				constants: {
					activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
				},
			},
		});
		const { Blocks: RewiredBlocks } = rewire(
			'../../../src/modules/chain/blocks'
		);
		modules.blocks = new RewiredBlocks({
			logger: scope.components.logger,
			storage: scope.components.storage,
			sequence: scope.sequence,
			genesisBlock: __testContext.config.genesisBlock,
			slots: scope.slots,
			exceptions: __testContext.config.modules.chain.exceptions,
			roundsModule: modules.rounds,
			interfaceAdapters: modules.interfaceAdapters,
			blockReceiptTimeout: __testContext.config.constants.BLOCK_RECEIPT_TIMEOUT,
			loadPerIteration: 1000,
			maxPayloadLength: __testContext.config.constants.MAX_PAYLOAD_LENGTH,
			maxTransactionsPerBlock:
				__testContext.config.constants.MAX_TRANSACTIONS_PER_BLOCK,
			activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
			rewardDistance: __testContext.config.constants.REWARDS.DISTANCE,
			rewardOffset: __testContext.config.constants.REWARDS.OFFSET,
			rewardMileStones: __testContext.config.constants.REWARDS.MILESTONES,
			totalAmount: __testContext.config.constants.TOTAL_AMOUNT,
			blockSlotWindow: __testContext.config.constants.BLOCK_SLOT_WINDOW,
		});
		scope.modules = modules;
		const RewiredPeers = rewire('../../../src/modules/chain/submodules/peers');
		scope.rewiredModules.peers = RewiredPeers;
		modules.peers = new RewiredPeers(scope);
		const { TransactionPool: RewiredTransactionPool } = rewire(
			'../../../src/modules/chain/transaction_pool'
		);
		scope.rewiredModules.transactionPool = RewiredTransactionPool;
		modules.transactionPool = new RewiredTransactionPool({
			storage: scope.components.storage,
			slots: scope.slots,
			blocks: modules.blocks,
			exceptions: __testContext.config.modules.chain.exceptions,
			logger: scope.components.logger,
			maxTransactionsPerQueue:
				__testContext.config.modules.chain.transactions.maxTransactionsPerQueue,
			expireTransactionsInterval:
				__testContext.config.constants.EXPIRY_INTERVAL,
			maxTransactionsPerBlock:
				__testContext.config.constants.MAX_TRANSACTIONS_PER_BLOCK,
			maxSharedTransactions:
				__testContext.config.constants.MAX_SHARED_TRANSACTIONS,
			broadcastInterval:
				__testContext.config.modules.chain.broadcasts.broadcastInterval,
			releaseLimit: __testContext.config.modules.chain.broadcasts.releaseLimit,
		});
		const { Loader: RewiredLoader } = rewire(
			'../../../src/modules/chain/loader'
		);
		scope.rewiredModules.loader = RewiredLoader;
		modules.loader = new RewiredLoader({
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			cache: scope.components.cache,
			genesisBlock: __testContext.config.genesisBlock,
			balancesSequence: scope.balancesSequence,
			schema: scope.schema,
			transactionPoolModule: modules.transactionPool,
			blocksModule: modules.blocks,
			peersModule: modules.peers,
			interfaceAdapters: modules.interfaceAdapters,
			loadPerIteration:
				__testContext.config.modules.chain.loading.loadPerIteration,
			rebuildUpToRound:
				__testContext.config.modules.chain.loading.rebuildUpToRound,
			syncingActive: __testContext.config.modules.chain.syncing.active,
		});
		const { Forger: RewiredForge } = rewire(
			'../../../src/modules/chain/forger'
		);
		scope.rewiredModules.forger = RewiredForge;
		modules.forger = new RewiredForge({
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			sequence: scope.sequence,
			slots: scope.slots,
			roundsModule: modules.rounds,
			transactionPoolModule: modules.transactionPool,
			blocksModule: modules.blocks,
			peersModule: modules.peers,
			activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
			maxTransactionsPerBlock:
				__testContext.config.constants.MAX_TRANSACTIONS_PER_BLOCK,
			forgingDelegates: __testContext.config.modules.chain.forging.delegates,
			forgingForce: __testContext.config.modules.chain.forging.force,
			forgingDefaultPassword:
				__testContext.config.modules.chain.forging.defaultPassword,
			forgingWaitThreshold:
				__testContext.config.modules.chain.forging.waitThreshold,
		});
		const { Transport: RewiredTransport } = rewire(
			'../../../src/modules/chain/transport'
		);
		scope.rewiredModules.transport = RewiredTransport;
		modules.transport = new RewiredTransport({
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			applicationState: scope.applicationState,
			balancesSequence: scope.balancesSequence,
			schema: scope.schema,
			exceptions: __testContext.config.exceptions,
			transactionPoolModule: modules.transactionPool,
			blocksModule: modules.blocks,
			loaderModule: modules.loader,
			interfaceAdapters: modules.interfaceAdapters,
			nonce: __testContext.config.app.nonce,
			forgingForce: __testContext.config.modules.chain.forging.force,
			broadcasts: __testContext.config.modules.chain.broadcasts,
			maxSharedTransactions:
				__testContext.config.constants.MAX_SHARED_TRANSACTIONS,
		});

		scope.bus.registerModules(modules);

		return modules;
	},
};

module.exports = {
	init,
	cleanup,
};
