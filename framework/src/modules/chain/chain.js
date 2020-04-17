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

const { convertErrorsToString } = require('./utils/error_handlers');
const { Sequence } = require('./utils/sequence');
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
const { Rounds } = require('./rounds');
const {
	BlockSlots,
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
} = require('./blocks');
const { Loader } = require('./loader');
const { Forger } = require('./forger');
const { Transport } = require('./transport');

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

		this.logger = createLoggerComponent(loggerConfig);
		const dbLogger =
			storageConfig.logFileName &&
			storageConfig.logFileName === loggerConfig.logFileName
				? this.logger
				: createLoggerComponent(
						Object.assign({
							...loggerConfig,
							logFileName: storageConfig.logFileName,
						}),
				  );

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

			this.channel.subscribe('app:state:updated', event => {
				Object.assign(this.scope.applicationState, event.data);
			});

			this.logger.info('Modules ready and launched');
			// After binding, it should immediately load blockchain
			await this.blocks.loadBlockChain(this.options.loading.rebuildUpToRound);
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
				this.channel.subscribe(
					'network:event',
					async ({ data: { event, data, peerId } }) => {
						try {
							if (event === 'postTransactions') {
								await this.transport.postTransactions(data, peerId);
								return;
							}
							if (event === 'postSignatures') {
								await this.transport.postSignatures(data, peerId);
								return;
							}
							if (event === 'postBlock') {
								await this.transport.postBlock(data, peerId);
								return;
							}
						} catch (error) {
							this.logger.warn(
								{ error, event },
								'Received invalid event message',
							);
						}
					},
				);
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
				secondsSinceEpoch: this.slots.getTime(),
				lastBlock: this.blocks.lastBlock,
			}),
			getLastBlock: async () => this.blocks.lastBlock,
			blocks: async action => this.transport.blocks(action.params || {}),
			blocksCommon: async action =>
				this.transport.blocksCommon(action.params || {}),
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
		this.slots = new BlockSlots({
			epochTime: this.options.constants.EPOCH_TIME,
			interval: this.options.constants.BLOCK_TIME,
			blocksPerRound: this.options.constants.ACTIVE_DELEGATES,
		});
		this.scope.slots = this.slots;
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
		this.loader = new Loader({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			cache: this.cache,
			genesisBlock: this.options.genesisBlock,
			transactionPoolModule: this.transactionPool,
			blocksModule: this.blocks,
			peersModule: this.peers,
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
			blocksModule: this.blocks,
			peersModule: this.peers,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
			maxTransactionsPerBlock: this.options.constants
				.MAX_TRANSACTIONS_PER_BLOCK,
			forgingDelegates: this.options.forging.delegates,
			forgingForce: this.options.forging.force,
			forgingDefaultPassword: this.options.forging.defaultPassword,
		});
		this.transport = new Transport({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			applicationState: this.applicationState,
			exceptions: this.options.exceptions,
			transactionPoolModule: this.transactionPool,
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
	}

	async _syncTask() {
		this.logger.debug(
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
		this.blocks.removeAllListeners(EVENT_NEW_BROADHASH);
		this.blocks.removeAllListeners(EVENT_UNCONFIRMED_TRANSACTION);
		this.blocks.removeAllListeners(EVENT_MULTISIGNATURE_SIGNATURE);
	}
};
