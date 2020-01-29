/*
 * Copyright © 2019 Lisk Foundation
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
const { BFT } = require('@liskhq/lisk-bft');
const { Dpos } = require('@liskhq/lisk-dpos');
const { Slots } = require('@liskhq/lisk-blocks');
const { registeredTransactions } = require('../registered_transactions');
const jobsQueue = require('../../../src/application/node/utils/jobs_queue');
const { Sequence } = require('../../../src/application/node/utils/sequence');
const { createCacheComponent } = require('../../../src/components/cache');
const { StorageSandbox } = require('../storage/storage_sandbox');
const { Processor } = require('../../../src/application/node/processor');
const { Rebuilder } = require('../../../src/application/node/rebuilder');
const {
	BlockProcessorV1,
} = require('../../../src/application/node/block_processor_v1');
const {
	BlockProcessorV2,
} = require('../../../src/application/node/block_processor_v2');
const { getNetworkIdentifier } = require('../network_identifier');

let currentAppScope;

const ChainModule = require('../../../src/application/node');
const HttpAPIModule = require('../../../src/modules/http_api');

const modulesMigrations = {};
modulesMigrations[ChainModule.alias] = ChainModule.migrations;
modulesMigrations[HttpAPIModule.alias] = HttpAPIModule.migrations;

const initStepsForTest = {
	initModules: async scope => {
		scope.rewiredModules = {};
		const modules = {};

		scope.slots = new Slots({
			epochTime: __testContext.config.constants.EPOCH_TIME,
			interval: __testContext.config.constants.BLOCK_TIME,
		});

		const { Blocks: RewiredBlocks } = rewire('@liskhq/lisk-blocks');
		modules.blocks = new RewiredBlocks({
			logger: scope.components.logger,
			storage: scope.components.storage,
			sequence: scope.sequence,
			genesisBlock: __testContext.config.genesisBlock,
			registeredTransactions:
				__testContext.config.modules.chain.registeredTransactions,
			networkIdentifier: getNetworkIdentifier(
				__testContext.config.genesisBlock,
			),
			exceptions: __testContext.config.modules.chain.exceptions,
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
			epochTime: __testContext.config.constants.EPOCH_TIME,
			blockTime: __testContext.config.constants.BLOCK_TIME,
		});

		modules.dpos = new Dpos({
			storage: scope.components.storage,
			logger: scope.components.logger,
			activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
			delegateListRoundOffset:
				__testContext.config.constants.DELEGATE_LIST_ROUND_OFFSET,
			channel: scope.channel,
			exceptions: __testContext.config.modules.chain.exceptions,
			blocks: modules.blocks,
		});

		modules.bft = new BFT({
			storage: scope.components.storage,
			logger: scope.components.logger,
			rounds: modules.dpos.rounds,
			slots: modules.blocks.slots,
			activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
			startingHeight: 1,
		});
		modules.processor = new Processor({
			channel: scope.channel,
			storage: scope.components.storage,
			logger: scope.components.logger,
			blocksModule: modules.blocks,
		});
		const processorDependency = {
			blocksModule: modules.blocks,
			bftModule: modules.bft,
			dposModule: modules.dpos,
			logger: scope.components.logger,
			constants: __testContext.config.constants,
			exceptions: __testContext.config.modules.chain.exceptions,
		};
		modules.processor.register(new BlockProcessorV2(processorDependency), {
			matcher: ({ height }) => height === 1,
		});
		modules.processor.register(new BlockProcessorV1(processorDependency));
		scope.modules = modules;
		const { TransactionPool: RewiredTransactionPool } = rewire(
			'../../../src/application/node/transaction_pool',
		);
		scope.rewiredModules.transactionPool = RewiredTransactionPool;
		modules.transactionPool = new RewiredTransactionPool({
			logger: scope.components.logger,
			storage: scope.components.storage,
			blocks: modules.blocks,
			slots: modules.blocks.slots,
			exceptions: __testContext.config.modules.chain.exceptions,
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
			'../../../src/application/node/loader',
		);
		scope.rewiredModules.loader = RewiredLoader;
		modules.loader = new RewiredLoader({
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			cache: scope.components.cache,
			sequence: scope.sequence,
			genesisBlock: __testContext.config.genesisBlock,
			transactionPoolModule: modules.transactionPool,
			blocksModule: modules.blocks,
			loadPerIteration:
				__testContext.config.modules.chain.loading.loadPerIteration,
			rebuildUpToRound:
				__testContext.config.modules.chain.loading.rebuildUpToRound,
			syncingActive: __testContext.config.modules.chain.syncing.active,
		});
		const { Forger: RewiredForge } = rewire(
			'../../../src/application/node/forger',
		);
		scope.rewiredModules.forger = RewiredForge;
		modules.forger = new RewiredForge({
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			dposModule: modules.dpos,
			transactionPoolModule: modules.transactionPool,
			blocksModule: modules.blocks,
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
			'../../../src/application/node/transport',
		);
		scope.rewiredModules.transport = RewiredTransport;
		modules.transport = new RewiredTransport({
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			applicationState: scope.applicationState,
			exceptions: __testContext.config.exceptions,
			transactionPoolModule: modules.transactionPool,
			blocksModule: modules.blocks,
			loaderModule: modules.loader,
			forgingForce: __testContext.config.modules.chain.forging.force,
			broadcasts: __testContext.config.modules.chain.broadcasts,
			maxSharedTransactions:
				__testContext.config.constants.MAX_SHARED_TRANSACTIONS,
		});

		modules.rebuilder = new Rebuilder({
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			cache: scope.components.cache,
			genesisBlock: __testContext.config.genesisBlock,
			blocksModule: modules.blocks,
			processorModule: modules.processor,
			activeDelegates: __testContext.config.constants.ACTIVE_DELEGATES,
		});

		return modules;
	},
};

// Init whole application inside tests
async function __init(sandbox, initScope) {
	__testContext.debug(
		'initApplication: Application initialization inside test environment started...',
	);

	jobsQueue.jobs = {};

	__testContext.config.modules.chain.syncing.active = false;
	__testContext.config.modules.chain.broadcasts.active = false;
	__testContext.config = Object.assign(
		__testContext.config,
		initScope.config || {},
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
				sandbox.name,
			);
		} else {
			__testContext.config.components.storage.user =
				__testContext.config.components.storage.user || process.env.USER;
			storage = new StorageSandbox(__testContext.config.components.storage);
		}

		__testContext.debug(
			`initApplication: Target database - ${storage.options.database}`,
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
								t,
							),
							storage.adapter.execute('DELETE FROM blocks', {}, {}, t),
							storage.adapter.execute('DELETE FROM mem_accounts', {}, {}, t),
						]),
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
				sequence: new Sequence({
					onWarning(current) {
						logger.warn('Main queue', current);
					},
				}),
				channel: {
					invoke: sinonSandbox.stub(),
					publish: sinonSandbox.stub(),
					subscribe: sinonSandbox.stub(),
					once: sinonSandbox.stub().callsArg(1),
				},
				applicationState: __testContext.config.initialState,
			},
			initScope,
		);
		const cache = createCacheComponent(
			__testContext.config.components.cache,
			logger,
		);

		scope.components = {
			logger,
			storage,
			cache,
		};

		await startStorage();
		await cache.bootstrap();

		scope.modules = await initStepsForTest.initModules(scope);

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

		if (!initScope.waitForGenesisBlock) {
			scope.modules.delegates.onBlockchainReady = function() {};
			return scope;
		}

		// Deserialize genesis block
		const blockWithTransactionInstances = scope.modules.blocks.deserialize(
			__testContext.config.genesisBlock,
		);

		// Overwrite onBlockchainReady function to prevent automatic forging
		await scope.modules.processor.init(blockWithTransactionInstances);
		return scope;
	} catch (error) {
		__testContext.debug('Error during test application init.', error);
		throw error;
	}
}

function init(options, cb) {
	options = options || {};
	options.scope = options.scope ? options.scope : {};
	// Wait for genesisBlock only if false is provided
	options.scope.waitForGenesisBlock = options.waitForGenesisBlock !== false;

	__init(options.sandbox, options.scope)
		.then(scope => cb(null, scope))
		.catch(err => cb(err));
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
		},
	);
}

module.exports = {
	init,
	cleanup,
};
