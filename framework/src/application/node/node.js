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

const { Blocks } = require('@liskhq/lisk-blocks');
const {
	Dpos,
	constants: { EVENT_ROUND_CHANGED },
} = require('@liskhq/lisk-dpos');
const { EVENT_BFT_BLOCK_FINALIZED, BFT } = require('@liskhq/lisk-bft');
const { getNetworkIdentifier } = require('@liskhq/lisk-cryptography');
const { convertErrorsToString } = require('./utils/error_handlers');
const { Sequence } = require('./utils/sequence');
const jobQueue = require('./utils/jobs_queue');
const {
	TransactionPool,
	EVENT_MULTISIGNATURE_SIGNATURE,
	EVENT_UNCONFIRMED_TRANSACTION,
} = require('./transaction_pool');
const { Loader } = require('./loader');
const { Forger } = require('./forger');
const { Transport } = require('./transport');
const {
	Synchronizer,
	BlockSynchronizationMechanism,
	FastChainSwitchingMechanism,
} = require('./synchronizer');
const { Processor } = require('./processor');
const { Rebuilder } = require('./rebuilder');
const { BlockProcessorV0 } = require('./block_processor_v0.js');
const { BlockProcessorV1 } = require('./block_processor_v1.js');
const { BlockProcessorV2 } = require('./block_processor_v2.js');

const forgeInterval = 1000;

module.exports = class Node {
	constructor({ channel, options, logger, storage, applicationState }) {
		this.channel = channel;
		this.options = options;
		this.logger = logger;
		this.storage = storage;
		this.applicationState = applicationState;

		this.components = null;
		this.sequence = null;
		this.registeredTransactions = null;
		this.genesisBlock = null;
		this.config = null;
	}

	async bootstrap() {
		global.constants = this.options.constants;
		global.exceptions = this.options.exceptions;

		try {
			if (!this.options.genesisBlock) {
				throw Error('Missing genesis block');
			}

			if (
				this.options.forging.waitThreshold >= this.options.constants.BLOCK_TIME
			) {
				throw Error(
					`app.node.forging.waitThreshold=${this.options.forging.waitThreshold} is greater or equal to app.genesisConfig.BLOCK_TIME=${this.options.constants.BLOCK_TIME}. It impacts the forging and propagation of blocks. Please use a smaller value for modules.chain.forging.waitThreshold`,
				);
			}

			this.networkIdentifier = getNetworkIdentifier(
				this.options.genesisBlock.payloadHash,
				this.options.genesisBlock.communityIdentifier,
			);

			this.config = this.options;
			this.genesisBlock = { block: this.config.genesisBlock };
			this.registeredTransactions = this.options.registeredTransactions;

			this.sequence = new Sequence({
				onWarning(current) {
					this.components.logger.warn('Main queue', current);
				},
			});

			await this._initModules();

			this.components = {
				logger: this.logger,
			};

			// Prepare dependency
			const processorDependencies = {
				blocksModule: this.blocks,
				bftModule: this.bft,
				dposModule: this.dpos,
				logger: this.logger,
				constants: this.options.constants,
				exceptions: this.options.exceptions,
			};

			// TODO: Move this to core https://github.com/LiskHQ/lisk-sdk/issues/4140
			if (this.options.exceptions.blockVersions) {
				if (this.options.exceptions.blockVersions[0]) {
					const period = this.options.exceptions.blockVersions[0];
					this.processor.register(new BlockProcessorV0(processorDependencies), {
						matcher: ({ height }) =>
							height >= period.start && height <= period.end,
					});
				}

				if (this.options.exceptions.blockVersions[1]) {
					const period = this.options.exceptions.blockVersions[1];
					this.processor.register(new BlockProcessorV1(processorDependencies), {
						matcher: ({ height }) =>
							height >= period.start && height <= period.end,
					});
				}
			}

			this.processor.register(new BlockProcessorV2(processorDependencies));

			// Deserialize genesis block and overwrite the options
			this.options.genesisBlock = await this.processor.deserialize(
				this.options.genesisBlock,
			);

			// Deactivate broadcast and syncing during snapshotting process
			if (this.options.loading.rebuildUpToRound) {
				this.options.broadcasts.active = false;
				this.options.syncing.active = false;
				await this.rebuilder.rebuild(
					this.options.loading.rebuildUpToRound,
					this.options.loading.loadPerIteration,
				);
				this.logger.info(
					{
						rebuildUpToRound: this.options.loading.rebuildUpToRound,
						loadPerIteration: this.options.loading.loadPerIteration,
					},
					'Successfully rebuild the blockchain',
				);
				process.emit('cleanup');
				return;
			}

			this.channel.subscribe('app:state:updated', event => {
				Object.assign(this.applicationState, event.data);
			});

			this.logger.info('Modules ready and launched');
			// After binding, it should immediately load blockchain
			await this.processor.init(this.options.genesisBlock);

			// Update Application State after processor is initialized
			this.channel.invoke('app:updateApplicationState', {
				height: this.blocks.lastBlock.height,
				lastBlockId: this.blocks.lastBlock.id,
				maxHeightPrevoted: this.blocks.lastBlock.maxHeightPrevoted || 0,
				blockVersion: this.blocks.lastBlock.version,
			});

			this._subscribeToEvents();

			this.channel.subscribe('app:ready', async () => {
				await this._startForging();
				await this._startLoader();
			});

			// Avoid receiving blocks/transactions from the network during snapshotting process
			if (!this.options.loading.rebuildUpToRound) {
				this.channel.subscribe(
					'app:networkEvent',
					async ({ data: { event, data, peerId } }) => {
						try {
							if (event === 'postTransactionsAnnouncement') {
								await this.transport.handleEventPostTransactionsAnnouncement(
									data,
									peerId,
								);
								return;
							}
							if (event === 'postSignatures') {
								await this.transport.handleEventPostSignatures(data, peerId);
								return;
							}
							if (event === 'postBlock') {
								await this.transport.handleEventPostBlock(data, peerId);
								return;
							}
						} catch (err) {
							this.logger.warn(
								{ err, event },
								'Received invalid event message',
							);
						}
					},
				);
			}

			// Check if blocks are left in temp_blocks table
			await this.synchronizer.init();
		} catch (error) {
			this.logger.fatal(
				{
					message: error.message,
					stack: error.stack,
				},
				'Failed to initialization node',
			);
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
			getForgerPublicKeysForRound: async action =>
				this.dpos.getForgerPublicKeysForRound(action.params.round),
			updateForgingStatus: async action =>
				this.forger.updateForgingStatus(
					action.params.publicKey,
					action.params.password,
					action.params.forging,
				),
			getTransactions: async action =>
				this.transport.handleRPCGetTransactions(
					action.params.data,
					action.params.peerId,
				),
			getSignatures: () => this.transport.handleRPCGetSignatures(),
			postSignature: async action =>
				this.transport.handleEventPostSignature(action.params),
			getForgingStatusForAllDelegates: async () =>
				this.forger.getForgingStatusForAllDelegates(),
			getTransactionsFromPool: async ({ params }) =>
				this.transactionPool.getPooledTransactions(params.type, params.filters),
			postTransaction: async action =>
				this.transport.handleEventPostTransaction(action.params),
			getSlotNumber: async action =>
				action.params
					? this.blocks.slots.getSlotNumber(action.params.epochTime)
					: this.blocks.slots.getSlotNumber(),
			calcSlotRound: async action =>
				this.dpos.rounds.calcRound(action.params.height),
			getNodeStatus: async () => ({
				syncing: this.synchronizer.isActive,
				unconfirmedTransactions: this.transactionPool.getCount(),
				secondsSinceEpoch: this.blocks.slots.getEpochTime(),
				lastBlock: this.blocks.lastBlock,
				chainMaxHeightFinalized: this.bft.finalityManager.finalizedHeight,
			}),
			getLastBlock: async () => this.processor.serialize(this.blocks.lastBlock),
			getBlocksFromId: async action =>
				this.transport.handleRPCGetBlocksFromId(
					action.params.data,
					action.params.peerId,
				),
			getHighestCommonBlock: async action =>
				this.transport.handleRPCGetGetHighestCommonBlock(
					action.params.data,
					action.params.peerId,
				),
		};
	}

	async cleanup(error) {
		this._unsubscribeToEvents();
		const { modules } = this;

		if (error) {
			this.logger.fatal(error.toString());
		}
		this.logger.info('Cleaning chain...');

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
		this.modules = {};

		this.blocks = new Blocks({
			logger: this.logger,
			storage: this.storage,
			sequence: this.sequence,
			genesisBlock: this.options.genesisBlock,
			registeredTransactions: this.options.registeredTransactions,
			networkIdentifier: this.networkIdentifier,
			exceptions: this.options.exceptions,
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
			epochTime: this.options.constants.EPOCH_TIME,
			blockTime: this.options.constants.BLOCK_TIME,
		});

		this.slots = this.blocks.slots;
		this.dpos = new Dpos({
			logger: this.logger,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
			delegateListRoundOffset: this.options.constants
				.DELEGATE_LIST_ROUND_OFFSET,
			blocks: this.blocks,
			exceptions: this.options.exceptions,
		});

		this.bft = new BFT({
			storage: this.storage,
			logger: this.logger,
			rounds: this.dpos.rounds,
			slots: this.blocks.slots,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
			startingHeight: 0, // TODO: Pass exception precedent from config or height for block version 2
		});

		this.dpos.events.on(EVENT_ROUND_CHANGED, data => {
			this.channel.publish('app:rounds:change', { number: data.newRound });
		});

		this.processor = new Processor({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			blocksModule: this.blocks,
		});
		const blockSyncMechanism = new BlockSynchronizationMechanism({
			storage: this.storage,
			logger: this.logger,
			bft: this.bft,
			rounds: this.dpos.rounds,
			channel: this.channel,
			blocks: this.blocks,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
			processorModule: this.processor,
		});

		const fastChainSwitchMechanism = new FastChainSwitchingMechanism({
			logger: this.logger,
			channel: this.channel,
			blocks: this.blocks,
			bft: this.bft,
			dpos: this.dpos,
			processor: this.processor,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
		});

		this.synchronizer = new Synchronizer({
			logger: this.logger,
			blocksModule: this.blocks,
			processorModule: this.processor,
			mechanisms: [blockSyncMechanism, fastChainSwitchMechanism],
		});

		this.modules.blocks = this.blocks;
		this.transactionPool = new TransactionPool({
			logger: this.logger,
			blocks: this.blocks,
			slots: this.blocks.slots,
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
		this.modules.transactionPool = this.transactionPool;
		this.loader = new Loader({
			channel: this.channel,
			logger: this.logger,
			processorModule: this.processor,
			transactionPoolModule: this.transactionPool,
			blocksModule: this.blocks,
			loadPerIteration: this.options.loading.loadPerIteration,
			syncingActive: this.options.syncing.active,
		});
		this.rebuilder = new Rebuilder({
			channel: this.channel,
			logger: this.logger,
			genesisBlock: this.options.genesisBlock,
			blocksModule: this.blocks,
			processorModule: this.processor,
			activeDelegates: this.options.constants.ACTIVE_DELEGATES,
		});
		this.modules.rebuilder = this.rebuilder;
		this.forger = new Forger({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			dposModule: this.dpos,
			transactionPoolModule: this.transactionPool,
			processorModule: this.processor,
			blocksModule: this.blocks,
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
			synchronizer: this.synchronizer,
			applicationState: this.applicationState,
			exceptions: this.options.exceptions,
			transactionPoolModule: this.transactionPool,
			processorModule: this.processor,
			blocksModule: this.blocks,
			loaderModule: this.loader,
			broadcasts: this.options.broadcasts,
			maxSharedTransactions: this.options.constants.MAX_SHARED_TRANSACTIONS,
		});

		this.modules.loader = this.loader;
		this.modules.forger = this.forger;
		this.modules.transport = this.transport;
		this.modules.bft = this.bft;
		this.modules.synchronizer = this.synchronizer;
	}

	async _startLoader() {
		return this.loader.loadUnconfirmedTransactions();
	}

	async _forgingTask() {
		return this.sequence.add(async () => {
			try {
				if (!this.forger.delegatesEnabled()) {
					this.logger.debug('No delegates are enabled');
					return;
				}
				if (this.synchronizer.isActive) {
					this.logger.debug('Client not ready to forge');
					return;
				}
				await this.forger.beforeForge();
				await this.forger.forge();
			} catch (err) {
				this.logger.error({ err });
			}
		});
	}

	async _startForging() {
		try {
			await this.forger.loadDelegates();
		} catch (err) {
			this.logger.error({ err }, 'Failed to load delegates for forging');
		}
		jobQueue.register(
			'nextForge',
			async () => this._forgingTask(),
			forgeInterval,
		);
	}

	_subscribeToEvents() {
		this.channel.subscribe(
			'app:processor:broadcast',
			async ({ data: { block } }) => {
				await this.transport.handleBroadcastBlock(block);
			},
		);

		this.channel.subscribe(
			'app:processor:deleteBlock',
			({ data: { block } }) => {
				if (block.transactions.length) {
					const transactions = block.transactions
						.reverse()
						.map(tx => this.blocks.deserializeTransaction(tx));
					this.transactionPool.onDeletedTransactions(transactions);
					this.channel.publish(
						'app:transactions:confirmed:change',
						block.transactions,
					);
				}
				this.logger.info(
					{ id: block.id, height: block.height },
					'Deleted a block from the chain',
				);
				this.channel.publish('app:blocks:change', block);
			},
		);

		this.channel.subscribe('app:processor:newBlock', ({ data: { block } }) => {
			if (block.transactions.length) {
				this.transactionPool.onConfirmedTransactions(
					block.transactions.map(tx => this.blocks.deserializeTransaction(tx)),
				);
				this.channel.publish(
					'app:transactions:confirmed:change',
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
			this.channel.publish('app:blocks:change', block);

			if (!this.synchronizer.isActive) {
				this.channel.invoke('app:updateApplicationState', {
					height: block.height,
					lastBlockId: block.id,
					maxHeightPrevoted: block.maxHeightPrevoted,
					blockVersion: block.version,
				});
			}
		});

		this.channel.subscribe(
			'app:processor:sync',
			({ data: { block, peerId } }) => {
				this.synchronizer.run(block, peerId).catch(err => {
					this.logger.error({ err }, 'Error occurred during synchronization.');
				});
			},
		);

		this.transactionPool.on(EVENT_UNCONFIRMED_TRANSACTION, transaction => {
			this.logger.trace(
				{ transactionId: transaction.id },
				'Received EVENT_UNCONFIRMED_TRANSACTION',
			);
			this.transport.handleBroadcastTransaction(transaction);
		});

		this.bft.on(EVENT_BFT_BLOCK_FINALIZED, ({ height }) => {
			this.dpos.onBlockFinalized({ height });
		});

		this.transactionPool.on(EVENT_MULTISIGNATURE_SIGNATURE, signature => {
			this.logger.trace(
				{ signature },
				'Received EVENT_MULTISIGNATURE_SIGNATURE',
			);
			this.transport.handleBroadcastSignature(signature);
		});
	}

	_unsubscribeToEvents() {
		this.bft.removeAllListeners(EVENT_BFT_BLOCK_FINALIZED);
		this.blocks.removeAllListeners(EVENT_UNCONFIRMED_TRANSACTION);
		this.blocks.removeAllListeners(EVENT_MULTISIGNATURE_SIGNATURE);
	}
};
