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

if (process.env.NEW_RELIC_LICENSE_KEY) {
	// eslint-disable-next-line global-require
	require('./utils/newrelic_lisk');
}

const { validator } = require('@liskhq/lisk-validator');
const { convertErrorsToString } = require('./utils/error_handlers');
const { Sequence } = require('./utils/sequence');
const definitions = require('./schema/definitions');
const { createStorageComponent } = require('../../components/storage');
const { createCacheComponent } = require('../../components/cache');
const { createLoggerComponent } = require('../../components/logger');
const { bootstrapStorage, bootstrapCache } = require('./init_steps');
const jobQueue = require('./utils/jobs_queue');
const { Peers } = require('./peers');
const { TransactionInterfaceAdapter } = require('./interface_adapters');
const {
	TransactionPool,
	EVENT_MULTISIGNATURE_SIGNATURE,
	EVENT_UNCONFIRMED_TRANSACTION,
} = require('./transaction_pool');
const { Slots, Dpos } = require('./dpos');
const { EVENT_BFT_BLOCK_FINALIZED, BFT } = require('./bft');
const { Rounds } = require('./rounds');
const {
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
	EVENT_PRIORITY_CHAIN_DETECTED,
} = require('./blocks');
const { Loader } = require('./loader');
const { Forger } = require('./forger');
const { Transport } = require('./transport');
const {
	Synchronizer,
	BlockSynchronizationMechanism,
	FastChainSwitchingMechanism,
} = require('./synchronizer');
const { Processor } = require('./processor');
const { BlockProcessorV0 } = require('./block_processor_v0.js');
const { BlockProcessorV1 } = require('./block_processor_v1.js');
const { BlockProcessorV2 } = require('./block_processor_v2.js');

const syncInterval = 10000;
const forgeInterval = 1000;

/**
 * Chain Module
 *
 * @namespace Framework.modules.chain
 * @type {module.Chain}
 */
module.exports = class Chain {
	constructor(channel, options) {
		this.channel = channel;
		this.options = options;
		this.logger = null;
		this.scope = null;
		this.slots = null;
	}

	async bootstrap() {
		const loggerConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'logger',
		);

		const storageConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'storage',
		);

		const cacheConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'cache',
		);

		this.applicationState = await this.channel.invoke(
			'app:getApplicationState',
		);

		this.logger = createLoggerComponent({ ...loggerConfig, module: 'chain' });
		const dbLogger =
			storageConfig.logFileName &&
			storageConfig.logFileName === loggerConfig.logFileName
				? this.logger
				: createLoggerComponent({
						...loggerConfig,
						logFileName: storageConfig.logFileName,
						module: 'chain:database',
				  });

		global.constants = this.options.constants;
		global.exceptions = this.options.exceptions;

		// Deactivate broadcast and syncing during snapshotting process
		if (this.options.loading.rebuildUpToRound) {
			this.options.broadcasts.active = false;
			this.options.syncing.active = false;
		}

		try {
			if (!this.options.genesisBlock) {
				throw Error('Failed to assign nethash from genesis block');
			}

			if (
				this.options.forging.waitThreshold >= this.options.constants.BLOCK_TIME
			) {
				throw Error(
					`modules.chain.forging.waitThreshold=${
						this.options.forging.waitThreshold
					} is greater or equal to app.genesisConfig.BLOCK_TIME=${
						this.options.constants.BLOCK_TIME
					}. It impacts the forging and propagation of blocks. Please use a smaller value for modules.chain.forging.waitThreshold`,
				);
			}

			// Cache
			this.logger.debug('Initiating cache...');
			this.cache = createCacheComponent(cacheConfig, this.logger);

			// Storage
			this.logger.debug('Initiating storage...');
			this.storage = createStorageComponent(storageConfig, dbLogger);

			// TODO: For socket cluster child process, should be removed with refactoring of network module
			this.options.loggerConfig = loggerConfig;

			const self = this;
			this.scope = {
				config: self.options,
				peers: this.peers,
				genesisBlock: { block: self.options.genesisBlock },
				registeredTransactions: self.options.registeredTransactions,
				sequence: new Sequence({
					onWarning(current) {
						self.logger.warn('Main queue', current);
					},
				}),
				components: {
					storage: this.storage,
					cache: this.cache,
					logger: this.logger,
				},
				channel: this.channel,
				applicationState: this.applicationState,
			};

			await bootstrapStorage(this.scope, global.constants.ACTIVE_DELEGATES);
			await bootstrapCache(this.scope);

			await this._initModules();

			// Prepare dependency
			const processorDependency = {
				blocksModule: this.blocks,
				logger: this.logger,
				constants: this.options.constants,
				exceptions: this.options.exceptions,
			};

			// TODO: remove this once we have version 2 genesis block
			this.processor.register(new BlockProcessorV0(processorDependency), {
				matcher: ({ height }) => height >= 0 && height <= 0,
			});

			// TODO: Move this to core
			if (this.options.exceptions.blockVersion) {
				if (this.options.exceptions.blockVersion[0]) {
					const period = this.options.exceptions.blockVersion[0];
					this.processor.register(new BlockProcessorV0(processorDependency), {
						matcher: ({ height }) =>
							height >= period.start && height <= period.end,
					});
				}

				if (this.options.exceptions.blockVersion[1]) {
					const period = this.options.exceptions.blockVersion[1];
					this.processor.register(new BlockProcessorV1(processorDependency), {
						matcher: ({ height }) =>
							height >= period.start && height <= period.end,
					});
				}
			}

			this.processor.register(new BlockProcessorV2(processorDependency), {
				matcher: ({ height }) => height >= 1,
			});

			this.channel.subscribe('app:state:updated', event => {
				Object.assign(this.scope.applicationState, event.data);
			});

			this.logger.info('Modules ready and launched');
			await this.bft.init();
			// After binding, it should immediately load blockchain
			await this.processor.init(this.options.genesisBlock);

			if (this.options.loading.rebuildUpToRound) {
				process.emit('cleanup');
				return;
			}
			this._subscribeToEvents();

			this.channel.subscribe('network:bootstrap', async () => {
				this._calculateConsensus();
				await this._startForging();
			});

			this.channel.subscribe('network:ready', async () => {
				this._startLoader();
			});

			// Avoid receiving blocks/transactions from the network during snapshotting process
			if (!this.options.loading.rebuildUpToRound) {
				this.channel.subscribe('network:event', ({ data: { event, data } }) => {
					if (event === 'postTransactions') {
						this.transport.postTransactions(data);
						return;
					}
					if (event === 'postSignatures') {
						this.transport.postSignatures(data);
						return;
					}
					if (event === 'postBlock') {
						this.transport.postBlock(data);
						// eslint-disable-next-line no-useless-return
						return;
					}
				});
			}
		} catch (error) {
			this.logger.fatal('Chain initialization', {
				message: error.message,
				stack: error.stack,
			});
			process.emit('cleanup', error);
		}
	}

	get actions() {
		return {
			calculateSupply: action =>
				this.blocks.blockReward.calculateSupply(action.params.height),
			calculateMilestone: action =>
				this.blocks.blockReward.calculateMilestone(action.params.height),
			calculateReward: action =>
				this.blocks.blockReward.calculateReward(action.params.height),
			generateDelegateList: async action =>
				this.rounds.generateDelegateList(
					action.params.round,
					action.params.source,
				),
			updateForgingStatus: async action =>
				this.forger.updateForgingStatus(
					action.params.publicKey,
					action.params.password,
					action.params.forging,
				),
			getTransactions: async () => this.transport.getTransactions(),
			getSignatures: async () => this.transport.getSignatures(),
			postSignature: async action =>
				this.transport.postSignature(action.params),
			getForgingStatusForAllDelegates: async () =>
				this.forger.getForgingStatusForAllDelegates(),
			getTransactionsFromPool: async ({ params }) =>
				this.transactionPool.getPooledTransactions(params.type, params.filters),
			postTransaction: async action =>
				this.transport.postTransaction(action.params),
			getDelegateBlocksRewards: async action =>
				this.scope.components.storage.entities.Account.delegateBlocksRewards(
					action.params.filters,
					action.params.tx,
				),
			getSlotNumber: async action =>
				action.params
					? this.slots.getSlotNumber(action.params.epochTime)
					: this.slots.getSlotNumber(),
			calcSlotRound: async action => this.slots.calcRound(action.params.height),
			getNodeStatus: async () => ({
				consensus: await this.peers.getLastConsensus(this.blocks.broadhash),
				loaded: true,
				syncing: this.loader.syncing(),
				unconfirmedTransactions: this.transactionPool.getCount(),
				secondsSinceEpoch: this.slots.getEpochTime(),
				lastBlock: this.blocks.lastBlock,
			}),
			blocks: async action => this.transport.blocks(action.params || {}),
			getHighestCommonBlockId: async action => {
				const valid = validator.validate(
					definitions.getHighestCommonBlockIdRequest,
					action.params,
				);

				if (valid.length) {
					const err = valid;
					const error = `${err[0].message}: ${err[0].path}`;
					this.logger.debug(
						'getHighestCommonBlockId request validation failed',
						{
							err: error,
							req: action.params,
						},
					);
					throw new Error(error);
				}

				const commonBlock = await this.scope.modules.blocks.getHighestCommonBlock(
					action.params.ids,
				);

				return commonBlock ? commonBlock.id : null;
			},
		};
	}

	async cleanup(error) {
		this._unsubscribeToEvents();
		const { modules, components } = this.scope;
		if (error) {
			this.logger.fatal(error.toString());
		}
		this.logger.info('Cleaning chain...');

		if (components !== undefined) {
			Object.keys(components).forEach(async key => {
				if (components[key].cleanup) {
					await components[key].cleanup();
				}
			});
		}

		// Run cleanup operation on each module before shutting down the node;
		// this includes operations like the rebuild verification process.
		await Promise.all(
			Object.keys(modules).map(key => {
				if (typeof modules[key].cleanup === 'function') {
					return modules[key].cleanup();
				}
				return true;
			}),
		).catch(moduleCleanupError => {
			this.logger.error(convertErrorsToString(moduleCleanupError));
		});

		this.logger.info('Cleaned up successfully');
	}

	async _initModules() {
		this.scope.modules = {};
		this.interfaceAdapters = {
			transactions: new TransactionInterfaceAdapter(
				this.options.registeredTransactions,
			),
		};
		this.scope.modules.interfaceAdapters = this.interfaceAdapters;
		this.slots = new Slots({
			epochTime: this.options.constants.EPOCH_TIME,
			interval: this.options.constants.BLOCK_TIME,
			blocksPerRound: this.options.constants.ACTIVE_DELEGATES,
		});
		this.scope.slots = this.slots;
		this.bft = new BFT({
			storage: this.storage,
			logger: this.logger,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
			startingHeight: 0, // TODO: Pass exception precedent from config or height for block version 2
		});
		this.rounds = new Rounds({
			channel: this.channel,
			components: {
				logger: this.logger,
				storage: this.storage,
			},
			slots: this.slots,
			config: {
				exceptions: this.options.exceptions,
				constants: {
					activeDelegates: this.options.constants.ACTIVE_DELEGATES,
				},
			},
		});
		this.dpos = new Dpos({
			storage: this.storage,
			logger: this.logger,
			slots: this.slots,
		});
		this.scope.modules.rounds = this.rounds;
		this.blocks = new Blocks({
			logger: this.logger,
			storage: this.storage,
			sequence: this.scope.sequence,
			genesisBlock: this.options.genesisBlock,
			slots: this.slots,
			exceptions: this.options.exceptions,
			roundsModule: this.rounds,
			interfaceAdapters: this.interfaceAdapters,
			blockReceiptTimeout: this.options.constants.BLOCK_RECEIPT_TIMEOUT,
			loadPerIteration: 1000,
			maxPayloadLength: this.options.constants.MAX_PAYLOAD_LENGTH,
			maxTransactionsPerBlock: this.options.constants
				.MAX_TRANSACTIONS_PER_BLOCK,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
			rewardDistance: this.options.constants.REWARDS.DISTANCE,
			rewardOffset: this.options.constants.REWARDS.OFFSET,
			rewardMileStones: this.options.constants.REWARDS.MILESTONES,
			totalAmount: this.options.constants.TOTAL_AMOUNT,
			blockSlotWindow: this.options.constants.BLOCK_SLOT_WINDOW,
		});

		const blockSyncMechanism = new BlockSynchronizationMechanism({
			storage: this.storage,
			logger: this.logger,
			bft: this.bft,
			slots: this.slots,
			channel: this.channel,
			blocks: this.blocks,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
		});

		const fastChainSwitchMechanism = new FastChainSwitchingMechanism({
			storage: this.storage,
			logger: this.logger,
			slots: this.slots,
			blocks: this.blocks,
			dpos: {},
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
		});

		this.synchronizer = new Synchronizer({
			storage: this.storage,
			logger: this.logger,
			blocks: this.blocks,
			blockReward: this.blocks.blockReward,
			exceptions: this.options.exceptions,
			maxTransactionsPerBlock: this.options.constants
				.MAX_TRANSACTIONS_PER_BLOCK,
			maxPayloadLength: this.options.constants.MAX_PAYLOAD_LENGTH,
		});
		this.synchronizer.register(blockSyncMechanism);
		this.synchronizer.register(fastChainSwitchMechanism);

		this.scope.modules.blocks = this.blocks;
		this.transactionPool = new TransactionPool({
			logger: this.logger,
			storage: this.storage,
			blocks: this.blocks,
			slots: this.slots,
			exceptions: this.options.exceptions,
			maxTransactionsPerQueue: this.options.transactions
				.maxTransactionsPerQueue,
			expireTransactionsInterval: this.options.constants.EXPIRY_INTERVAL,
			maxTransactionsPerBlock: this.options.constants
				.MAX_TRANSACTIONS_PER_BLOCK,
			maxSharedTransactions: this.options.constants.MAX_SHARED_TRANSACTIONS,
			broadcastInterval: this.options.broadcasts.broadcastInterval,
			releaseLimit: this.options.broadcasts.releaseLimit,
		});
		this.scope.modules.transactionPool = this.transactionPool;
		// TODO: Remove - Temporal write to modules for blocks circular dependency
		this.peers = new Peers({
			channel: this.channel,
			forgingForce: this.options.forging.force,
			minBroadhashConsensus: this.options.constants.MIN_BROADHASH_CONSENSUS,
		});
		this.scope.modules.peers = this.peers;
		this.processor = new Processor({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			blocksModule: this.blocks,
			interfaceAdapters: this.interfaceAdapters,
		});
		this.loader = new Loader({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			cache: this.cache,
			genesisBlock: this.options.genesisBlock,
			transactionPoolModule: this.transactionPool,
			blocksModule: this.blocks,
			peersModule: this.peers,
			processorModule: this.processor,
			interfaceAdapters: this.interfaceAdapters,
			loadPerIteration: this.options.loading.loadPerIteration,
			rebuildUpToRound: this.options.loading.rebuildUpToRound,
			syncingActive: this.options.syncing.active,
		});
		this.forger = new Forger({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			sequence: this.scope.sequence,
			slots: this.slots,
			roundsModule: this.rounds,
			transactionPoolModule: this.transactionPool,
			processorModule: this.processor,
			blocksModule: this.blocks,
			peersModule: this.peers,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
			maxTransactionsPerBlock: this.options.constants
				.MAX_TRANSACTIONS_PER_BLOCK,
			forgingDelegates: this.options.forging.delegates,
			forgingForce: this.options.forging.force,
			forgingDefaultPassword: this.options.forging.defaultPassword,
			forgingWaitThreshold: this.options.forging.waitThreshold,
		});
		this.transport = new Transport({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			applicationState: this.applicationState,
			exceptions: this.options.exceptions,
			transactionPoolModule: this.transactionPool,
			processorModule: this.processor,
			blocksModule: this.blocks,
			loaderModule: this.loader,
			interfaceAdapters: this.interfaceAdapters,
			nonce: this.options.nonce,
			broadcasts: this.options.broadcasts,
			maxSharedTransactions: this.options.constants.MAX_SHARED_TRANSACTIONS,
		});
		// TODO: should not add to scope
		this.scope.modules.loader = this.loader;
		this.scope.modules.forger = this.forger;
		this.scope.modules.transport = this.transport;
		this.scope.modules.bft = this.bft;
		this.scope.modules.synchronizer = this.synchronizer;
	}

	async _syncTask() {
		this.logger.info(
			{
				syncing: this.loader.syncing(),
				lastReceipt: this.blocks.lastReceipt,
			},
			'Sync time triggered',
		);
		if (!this.loader.syncing() && this.blocks.isStale()) {
			await this.scope.sequence.add(async () => {
				try {
					await this.loader.sync();
				} catch (error) {
					this.logger.error(error, 'Sync timer');
				}
			});
		}
	}

	_startLoader() {
		this.loader.loadTransactionsAndSignatures();
		if (!this.options.syncing.active) {
			return;
		}
		jobQueue.register('nextSync', async () => this._syncTask(), syncInterval);
	}

	_calculateConsensus() {
		jobQueue.register(
			'calculateConsensus',
			async () => {
				const consensus = await this.peers.calculateConsensus(
					this.blocks.broadhash,
				);
				return this.logger.debug(`Broadhash consensus: ${consensus} %`);
			},
			this.peers.broadhashConsensusCalculationInterval,
		);
	}

	async _forgingTask() {
		return this.scope.sequence.add(async () => {
			try {
				await this.forger.beforeForge();
				if (!this.forger.delegatesEnabled()) {
					this.logger.debug('No delegates are enabled');
					return;
				}
				if (this.loader.syncing() || this.rounds.ticking()) {
					this.logger.debug('Client not ready to forge');
					return;
				}
				await this.forger.forge();
			} catch (error) {
				this.logger.error(error);
			}
		});
	}

	async _startForging() {
		try {
			await this.forger.loadDelegates();
		} catch (err) {
			this.logger.error(err, 'Failed to load delegates');
		}
		jobQueue.register(
			'nextForge',
			async () => this._forgingTask(),
			forgeInterval,
		);
	}

	_subscribeToEvents() {
		this.blocks.on(EVENT_BROADCAST_BLOCK, ({ block }) => {
			this.transport.onBroadcastBlock(block, true);
		});

		this.blocks.on(EVENT_DELETE_BLOCK, ({ block }) => {
			if (block.transactions.length) {
				const transactions = block.transactions.reverse();
				this.transactionPool.onDeletedTransactions(transactions);
				this.channel.publish(
					'chain:transactions:confirmed:change',
					block.transactions,
				);
			}
			this.logger.info(
				{ id: block.id, height: block.height },
				'Deleted a block from the chain',
			);
			this.channel.publish('chain:blocks:change', block);
		});

		this.blocks.on(EVENT_NEW_BLOCK, ({ block }) => {
			if (block.transactions.length) {
				this.transactionPool.onConfirmedTransactions(block.transactions);
				this.channel.publish(
					'chain:transactions:confirmed:change',
					block.transactions,
				);
			}
			this.logger.info(
				{
					id: block.id,
					height: block.height,
					numberOfTransactions: block.transactions.length,
				},
				'New block added to the chain',
			);
			this.channel.publish('chain:blocks:change', block);

			if (!this.loader.syncing()) {
				this.channel.invoke('app:updateApplicationState', {
					height: block.height,
					lastBlockId: block.id,
					prevotedConfirmedUptoHeight: block.prevotedConfirmedUptoHeight,
				});
			}
		});

		this.blocks.on(EVENT_PRIORITY_CHAIN_DETECTED, ({ block }) => {
			this.logger.info(
				'Received EVENT_PRIORITY_CHAIN_DETECTED. Triggering synchronizer.',
			);
			this.synchronizer
				.run(block)
				.then(() => {
					this.logger.info('Synchronization finished.');
				})
				.catch(error => {
					this.logger.error('Error occurred during synchronization.', error);
				});
		});

		this.transactionPool.on(EVENT_UNCONFIRMED_TRANSACTION, transaction => {
			this.logger.trace(
				{ transactionId: transaction.id },
				'Received EVENT_UNCONFIRMED_TRANSACTION',
			);
			this.transport.onUnconfirmedTransaction(transaction, true);
		});

		this.blocks.on(EVENT_NEW_BROADHASH, ({ broadhash, height }) => {
			this.channel.invoke('app:updateApplicationState', { broadhash, height });
			this.logger.debug(
				{ broadhash, height },
				'Updating the application state',
			);
		});

		this.bft.on(EVENT_BFT_BLOCK_FINALIZED, ({ height }) => {
			this.dpos.onBlockFinalized({ height });
		});

		this.transactionPool.on(EVENT_MULTISIGNATURE_SIGNATURE, signature => {
			this.logger.trace(
				{ signature },
				'Received EVENT_MULTISIGNATURE_SIGNATURE',
			);
			this.transport.onSignature(signature, true);
		});
	}

	_unsubscribeToEvents() {
		this.blocks.removeAllListeners(EVENT_BROADCAST_BLOCK);
		this.blocks.removeAllListeners(EVENT_DELETE_BLOCK);
		this.blocks.removeAllListeners(EVENT_NEW_BLOCK);
		this.blocks.removeAllListeners(EVENT_PRIORITY_CHAIN_DETECTED);
		this.bft.removeAllListeners(EVENT_BFT_BLOCK_FINALIZED);
		this.blocks.removeAllListeners(EVENT_NEW_BROADHASH);
		this.blocks.removeAllListeners(EVENT_UNCONFIRMED_TRANSACTION);
		this.blocks.removeAllListeners(EVENT_MULTISIGNATURE_SIGNATURE);
	}
};
