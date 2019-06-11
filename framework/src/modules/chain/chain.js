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

if (process.env.NEW_RELIC_LICENSE_KEY) {
	require('./helpers/newrelic_lisk');
}

const { convertErrorsToString } = require('./helpers/error_handlers');
const Sequence = require('./helpers/sequence');
const ed = require('./helpers/ed');
const { ZSchema } = require('../../controller/validator');
const { createStorageComponent } = require('../../components/storage');
const { createCacheComponent } = require('../../components/cache');
const { createLoggerComponent } = require('../../components/logger');
const { createBus, bootstrapStorage, bootstrapCache } = require('./init_steps');
const jobQueue = require('./helpers/jobs_queue');
const Peers = require('./submodules/peers');
const { TransactionInterfaceAdapter } = require('./interface_adapters');
const { TransactionPool } = require('./transaction_pool');
const {
	BlockSlots,
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
} = require('./blocks');

const syncInterval = 10000;
const forgeInterval = 1000;

// Begin reading from stdin
process.stdin.resume();

if (typeof gc !== 'undefined') {
	setInterval(() => {
		gc(); // eslint-disable-line no-undef
	}, 60000);
}

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
			'logger'
		);
		const storageConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'storage'
		);

		const cacheConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'cache'
		);

		this.applicationState = await this.channel.invoke(
			'app:getApplicationState'
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
						})
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

			if (
				this.options.forging.waitThreshold >= this.options.constants.BLOCK_TIME
			) {
				throw Error(
					`modules.chain.forging.waitThreshold=${
						this.options.forging.waitThreshold
					} is greater or equal to app.genesisConfig.BLOCK_TIME=${
						this.options.constants.BLOCK_TIME
					}. It impacts the forging and propagation of blocks. Please use a smaller value for modules.chain.forging.waitThreshold`
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
				ed,
				config: self.options,
				genesisBlock: { block: self.options.genesisBlock },
				registeredTransactions: self.options.registeredTransactions,
				schema: new ZSchema(),
				sequence: new Sequence({
					onWarning(current) {
						self.logger.warn('Main queue', current);
					},
				}),
				balancesSequence: new Sequence({
					onWarning(current) {
						self.logger.warn('Balance queue', current);
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

			this.scope.bus = await createBus();

			await this._initModules();

			this.scope.bus.registerModules(this.scope.modules);

			this.channel.subscribe('app:state:updated', event => {
				Object.assign(this.scope.applicationState, event.data);
			});

			// Fire onBind event in every module
			this.scope.bus.message('bind', this.scope);

			this.logger.info('Modules ready and launched');
			// After binding, it should immediately load blockchain
			await this.blocks.loadBlockChain(this.options.loading.rebuildUpToRound);
			if (this.options.loading.rebuildUpToRound) {
				process.emit('cleanup');
				return;
			}
			this._subscribeToEvents();

			this.channel.subscribe('network:bootstrap', async () => {
				this._startLoader();
				await this._startForging();
			});

			// Avoid receiving blocks/transactions from the network during snapshotting process
			if (!this.options.loading.rebuildUpToRound) {
				this.channel.subscribe('network:event', ({ data: { event, data } }) => {
					if (event === 'postTransactions') {
						this.scope.modules.transport.shared.postTransactions(data);
						return;
					}
					if (event === 'postSignatures') {
						this.scope.modules.transport.shared.postSignatures(data);
						return;
					}
					if (event === 'postBlock') {
						this.scope.modules.transport.shared.postBlock(data);
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
				this.scope.modules.rounds.generateDelegateList(
					action.params.round,
					action.params.source
				),
			updateForgingStatus: async action =>
				this.scope.modules.forger.updateForgingStatus(
					action.params.publicKey,
					action.params.password,
					action.params.forging
				),
			getTransactions: async () =>
				this.scope.modules.transport.shared.getTransactions(),
			getSignatures: async () =>
				this.scope.modules.transport.shared.getSignatures(),
			postSignature: async action =>
				this.scope.modules.transport.shared.postSignature(action.params),
			getForgingStatusForAllDelegates: async () =>
				this.scope.modules.forger.getForgingStatusForAllDelegates(),
			getTransactionsFromPool: async ({ params }) =>
				this.transactionPool.getPooledTransactions(params.type, params.filters),
			postTransaction: async action =>
				this.scope.modules.transport.shared.postTransaction(action.params),
			getDelegateBlocksRewards: async action =>
				this.scope.components.storage.entities.Account.delegateBlocksRewards(
					action.params.filters,
					action.params.tx
				),
			getSlotNumber: async action =>
				action.params
					? this.slots.getSlotNumber(action.params.epochTime)
					: this.slots.getSlotNumber(),
			calcSlotRound: async action => this.slots.calcRound(action.params.height),
			getNodeStatus: async () => ({
				consensus: this.scope.modules.peers.getLastConsensus(),
				loaded: true,
				syncing: this.loader.syncing(),
				unconfirmedTransactions: this.transactionPool.getCount(),
				secondsSinceEpoch: this.slots.getTime(),
				lastBlock: this.scope.modules.blocks.lastBlock,
			}),
			blocks: async action =>
				this.scope.modules.transport.shared.blocks(action.params || {}),
			blocksCommon: async action =>
				this.scope.modules.transport.shared.blocksCommon(action.params || {}),
		};
	}

	async cleanup(code, error) {
		this._unsubscribeToEvents();
		const { modules, components } = this.scope;
		if (error) {
			this.logger.fatal(error.toString());
			if (code === undefined) {
				code = 1;
			}
		} else if (code === undefined || code === null) {
			code = 0;
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
			})
		).catch(moduleCleanupError => {
			this.logger.error(convertErrorsToString(moduleCleanupError));
		});

		this.logger.info('Cleaned up successfully');
	}

	async _initModules() {
		this.scope.modules = {};
		this.interfaceAdapters = {
			transactions: new TransactionInterfaceAdapter(
				this.options.registeredTransactions
			),
		};
		this.scope.modules.interfaceAdapters = this.interfaceAdapters;
		this.slots = new BlockSlots({
			epochTime: this.options.constants.EPOCH_TIME,
			interval: this.options.constants.BLOCK_TIME,
			blocksPerRound: this.options.constants.ACTIVE_DELEGATES,
		});
		this.scope.slots = this.slots;
		const { Rounds } = require('./rounds');
		this.rounds = new Rounds(this.scope);
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
		this.peers = new Peers(this.scope);
		this.scope.modules.peers = this.peers;
		// TODO: Global variable forbits to require on top
		const Loader = require('./loader');
		const { Forger } = require('./forger');
		const Transport = require('./transport');
		this.loader = new Loader(this.scope);
		this.forger = new Forger(this.scope);
		this.transport = new Transport(this.scope);
		// TODO: should not add to scope
		this.scope.modules.loader = this.loader;
		this.scope.modules.forger = this.forger;
		this.scope.modules.transport = this.transport;
	}

	_startLoader() {
		this.loader.loadTransactionsAndSignatures();
		if (!this.options.syncing.active) {
			return;
		}
		jobQueue.register(
			'nextSync',
			cb => {
				this.logger.info(
					{
						syncing: this.loader.isActive(),
						lastReceipt: this.scope.modules.blocks.lastReceipt,
					},
					'Sync time triggered'
				);
				if (!this.loader.isActive() && this.scope.modules.blocks.isStale()) {
					this.scope.sequence.add(
						sequenceCB => {
							this.loader
								.sync()
								.then(() => sequenceCB())
								.catch(err => sequenceCB(err));
						},
						syncError => {
							if (syncError) {
								this.logger.error('Sync timer', syncError);
								return cb(syncError);
							}
							return cb();
						}
					);
				}
			},
			syncInterval
		);
	}

	async _startForging() {
		try {
			await this.forger.loadDelegates();
		} catch (err) {
			this.logger.error(err, 'Failed to load delegates');
		}
		jobQueue.register(
			'nextForge',
			async () => {
				await this.forger.beforeForge();
				if (!this.forger.delegatesEnabled()) {
					this.logger.debug('No delegates are enabled');
					return;
				}
				if (this.loader.syncing() || this.scope.modules.rounds.ticking()) {
					this.logger.debug('Client not ready to forge');
					return;
				}
				try {
					await this.forger.forge();
				} catch (error) {
					this.logger.error(error);
					throw error;
				}
			},
			forgeInterval
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
					block.transactions
				);
			}
			this.channel.publish('chain:blocks:change', block);
		});

		this.blocks.on(EVENT_NEW_BLOCK, ({ block }) => {
			if (block.transactions.length) {
				this.transactionPool.onConfirmedTransactions(block.transactions);
				this.channel.publish(
					'chain:transactions:confirmed:change',
					block.transactions
				);
			}
			this.channel.publish('chain:blocks:change', block);
		});

		this.blocks.on(EVENT_NEW_BROADHASH, ({ broadhash, height }) => {
			this.channel.invoke('app:updateApplicationState', { broadhash, height });
		});
	}

	_unsubscribeToEvents() {
		this.blocks.removeAllListeners(EVENT_BROADCAST_BLOCK);
		this.blocks.removeAllListeners(EVENT_DELETE_BLOCK);
		this.blocks.removeAllListeners(EVENT_NEW_BLOCK);
		this.blocks.removeAllListeners(EVENT_NEW_BROADHASH);
	}
};
