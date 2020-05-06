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

const {
	Chain,
	events: { EVENT_NEW_BLOCK, EVENT_DELETE_BLOCK },
} = require('@liskhq/lisk-chain');
const {
	Dpos,
	constants: { EVENT_ROUND_CHANGED },
} = require('@liskhq/lisk-dpos');
const { EVENT_BFT_BLOCK_FINALIZED, BFT } = require('@liskhq/lisk-bft');
const { getNetworkIdentifier } = require('@liskhq/lisk-cryptography');
const {
	TransactionPool,
	Job,
	events: { EVENT_TRANSACTION_REMOVED },
} = require('@liskhq/lisk-transaction-pool');
const { convertErrorsToString } = require('./utils/error_handlers');
const { Sequence } = require('./utils/sequence');
const { Forger } = require('./forger');
const { Transport } = require('./transport');
const {
	Synchronizer,
	BlockSynchronizationMechanism,
	FastChainSwitchingMechanism,
} = require('./synchronizer');
const { Processor } = require('./processor');
const { Rebuilder } = require('./rebuilder');
const { BlockProcessorV2 } = require('./block_processor_v2');

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
		try {
			if (!this.options.genesisBlock) {
				throw Error('Missing genesis block');
			}

			if (
				this.options.forging.waitThreshold >= this.options.constants.blockTime
			) {
				throw Error(
					`forging.waitThreshold=${this.options.forging.waitThreshold} is greater or equal to genesisConfig.blockTime=${this.options.constants.blockTime}. It impacts the forging and propagation of blocks. Please use a smaller value for forging.waitThreshold`,
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

			this._initModules();

			this.components = {
				logger: this.logger,
			};

			// Prepare dependency
			const processorDependencies = {
				networkIdentifier: this.networkIdentifier,
				chainModule: this.chain,
				bftModule: this.bft,
				dposModule: this.dpos,
				logger: this.logger,
				constants: this.options.constants,
				storage: this.storage,
			};

			this.processor.register(new BlockProcessorV2(processorDependencies));

			// Deserialize genesis block and overwrite the options
			this.options.genesisBlock = await this.processor.deserialize(
				this.options.genesisBlock,
			);

			this.channel.subscribe('app:state:updated', event => {
				Object.assign(this.applicationState, event.data);
			});

			this.logger.info('Modules ready and launched');
			// After binding, it should immediately load blockchain
			await this.processor.init(this.options.genesisBlock);
			// Check if blocks are left in temp_blocks table
			await this.synchronizer.init();

			// Update Application State after processor is initialized
			this.channel.invoke('app:updateApplicationState', {
				height: this.chain.lastBlock.height,
				lastBlockId: this.chain.lastBlock.id,
				maxHeightPrevoted: this.chain.lastBlock.maxHeightPrevoted || 0,
				blockVersion: this.chain.lastBlock.version,
			});

			// Deactivate broadcast and syncing during snapshotting process
			if (!Number.isNaN(parseInt(this.options.rebuildUpToRound, 10))) {
				await this.rebuilder.rebuild(this.options.rebuildUpToRound);
				this.logger.info(
					{
						rebuildUpToRound: this.options.rebuildUpToRound,
					},
					'Successfully rebuild the blockchain',
				);
				process.exit(0);
				return;
			}

			this._subscribeToEvents();

			this.channel.subscribe('app:network:ready', async () => {
				await this._startLoader();
			});

			this.channel.subscribe('app:ready', async () => {
				await this.transactionPool.start();
				await this._startForging();
			});

			// Avoid receiving blocks/transactions from the network during snapshotting process
			if (!this.options.rebuildUpToRound) {
				this.channel.subscribe(
					'app:network:event',
					async ({ data: { event, data, peerId } }) => {
						try {
							if (event === 'postTransactionsAnnouncement') {
								await this.transport.handleEventPostTransactionsAnnouncement(
									data,
									peerId,
								);
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
		} catch (error) {
			this.logger.fatal(
				{
					message: error.message,
					stack: error.stack,
				},
				'Failed to initialization node',
			);
			process.exit(0);
		}
	}

	get actions() {
		return {
			calculateSupply: action =>
				this.chain.blockReward.calculateSupply(action.params.height),
			calculateMilestone: action =>
				this.chain.blockReward.calculateMilestone(action.params.height),
			calculateReward: action =>
				this.chain.blockReward.calculateReward(action.params.height),
			getForgerAddressesForRound: async action =>
				this.dpos.getForgerAddressesForRound(action.params.round),
			updateForgingStatus: async action =>
				this.forger.updateForgingStatus(
					action.params.publicKey,
					action.params.password,
					action.params.forging,
				),
			getAccount: async action => {
				const account = await this.chain.dataAccess.getAccountByAddress(
					action.params.address,
				);
				return account.toJSON();
			},
			getAccounts: async action => {
				const accounts = await this.chain.dataAccess.getAccountsByAddress(
					action.params.address,
				);
				return accounts.map(account => account.toJSON());
			},
			getBlockByID: async action => {
				const block = await this.chain.dataAccess.getBlockByID(
					action.params.id,
				);

				return block ? this.chain.dataAccess.deserialize(block) : undefined;
			},
			getBlocksByIDs: async action => {
				const blocks = await this.chain.dataAccess.getBlocksByIDs(
					action.params.ids,
				);

				return blocks.length > 0
					? blocks.map(b => this.chain.dataAccess.deserialize(b))
					: [];
			},
			getBlockByHeight: async action => {
				const block = await this.chain.dataAccess.getBlockByHeight(
					action.params.height,
				);

				return block ? this.chain.dataAccess.deserialize(block) : undefined;
			},
			getBlocksByHeightBetween: async action => {
				const blocks = await this.chain.dataAccess.getBlocksByHeightBetween(
					action.params.heights,
				);

				return blocks.length > 0
					? blocks.map(b => this.chain.dataAccess.deserialize(b))
					: [];
			},
			getTransactionByID: async action => {
				const [transaction] = await this.chain.dataAccess.getTransactionsByIDs(
					action.params.id,
				);

				return transaction
					? this.chain.dataAccess.deserializeTransaction(transaction)
					: undefined;
			},
			getTransactionsByIDs: async action => {
				const transactions = await this.chain.dataAccess.getTransactionsByIDs(
					action.params.ids,
				);

				return transactions.length > 0
					? transactions.map(tx =>
							this.chain.dataAccess.deserializeTransaction(tx),
					  )
					: [];
			},
			getTransactions: async action =>
				this.transport.handleRPCGetTransactions(
					action.params.data,
					action.params.peerId,
				),
			getForgingStatusOfAllDelegates: () =>
				this.forger.getForgingStatusOfAllDelegates(),
			getTransactionsFromPool: () =>
				this.transactionPool.getAll().map(tx => tx.toJSON()),
			postTransaction: async action =>
				this.transport.handleEventPostTransaction(action.params),
			getSlotNumber: action =>
				action.params
					? this.chain.slots.getSlotNumber(action.params.epochTime)
					: this.chain.slots.getSlotNumber(),
			calcSlotRound: action => this.dpos.rounds.calcRound(action.params.height),
			getNodeStatus: () => ({
				syncing: this.synchronizer.isActive,
				unconfirmedTransactions: this.transactionPool.getAll().length,
				secondsSinceEpoch: this.chain.slots.getEpochTime(),
				lastBlock: this.chain.lastBlock,
				chainMaxHeightFinalized: this.bft.finalityManager.finalizedHeight,
			}),
			getLastBlock: async () => this.processor.serialize(this.chain.lastBlock),
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
		this.transactionPool.stop();
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

	_initModules() {
		this.modules = {};

		this.chain = new Chain({
			logger: this.logger,
			storage: this.storage,
			genesisBlock: this.options.genesisBlock,
			registeredTransactions: this.options.registeredTransactions,
			networkIdentifier: this.networkIdentifier,
			maxPayloadLength: this.options.constants.maxPayloadLength,
			rewardDistance: this.options.constants.rewards.distance,
			rewardOffset: this.options.constants.rewards.offset,
			rewardMilestones: this.options.constants.rewards.milestones,
			totalAmount: this.options.constants.totalAmount,
			epochTime: this.options.constants.epochTime,
			blockTime: this.options.constants.blockTime,
		});

		this.chain.events.on(EVENT_NEW_BLOCK, eventData => {
			const { block } = eventData;
			// Publish to the outside
			this.channel.publish('app:block:new', eventData);

			// Remove any transactions from the pool on new block
			if (block.transactions.length) {
				for (const transaction of block.transactions) {
					this.transactionPool.remove(
						this.chain.deserializeTransaction(transaction),
					);
				}
			}

			if (!this.synchronizer.isActive && !this.rebuilder.isActive) {
				this.channel.invoke('app:updateApplicationState', {
					height: block.height,
					lastBlockId: block.id,
					maxHeightPrevoted: block.maxHeightPrevoted,
					blockVersion: block.version,
				});
			}

			this.logger.info(
				{
					id: block.id,
					height: block.height,
					numberOfTransactions: block.transactions.length,
				},
				'New block added to the chain',
			);
		});

		this.chain.events.on(EVENT_DELETE_BLOCK, async eventData => {
			const { block } = eventData;
			// Publish to the outside
			this.channel.publish('app:block:delete', eventData);

			if (block.transactions.length) {
				for (const transaction of block.transactions) {
					try {
						await this.transactionPool.add(
							this.chain.deserializeTransaction(transaction),
						);
					} catch (err) {
						this.logger.error(
							{ err },
							'Failed to add transaction back to the pool',
						);
					}
				}
			}
			this.logger.info(
				{ id: block.id, height: block.height },
				'Deleted a block from the chain',
			);
		});

		this.dpos = new Dpos({
			chain: this.chain,
			activeDelegates: this.options.constants.activeDelegates,
			standbyDelegates: this.options.constants.standbyDelegates,
			delegateListRoundOffset: this.options.constants.delegateListRoundOffset,
		});

		this.bft = new BFT({
			dpos: this.dpos,
			chain: this.chain,
			activeDelegates: this.options.constants.activeDelegates,
			startingHeight: 0, // TODO: Pass exception precedent from config or height for block version 2
		});

		this.dpos.events.on(EVENT_ROUND_CHANGED, data => {
			this.channel.publish('app:round:change', { number: data.newRound });
		});

		this.processor = new Processor({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			chainModule: this.chain,
		});

		this.transactionPool = new TransactionPool({
			applyTransactions: this.chain.applyTransactions.bind(this.chain),
		});
		this.modules.transactionPool = this.transactionPool;

		const blockSyncMechanism = new BlockSynchronizationMechanism({
			storage: this.storage,
			logger: this.logger,
			bft: this.bft,
			dpos: this.dpos,
			channel: this.channel,
			chain: this.chain,
			processorModule: this.processor,
		});

		const fastChainSwitchMechanism = new FastChainSwitchingMechanism({
			logger: this.logger,
			channel: this.channel,
			chain: this.chain,
			bft: this.bft,
			dpos: this.dpos,
			processor: this.processor,
		});

		this.synchronizer = new Synchronizer({
			channel: this.channel,
			logger: this.logger,
			chainModule: this.chain,
			processorModule: this.processor,
			transactionPoolModule: this.transactionPool,
			mechanisms: [blockSyncMechanism, fastChainSwitchMechanism],
		});

		this.modules.chain = this.chain;
		this.rebuilder = new Rebuilder({
			channel: this.channel,
			logger: this.logger,
			genesisBlock: this.options.genesisBlock,
			chainModule: this.chain,
			processorModule: this.processor,
			bftModule: this.bft,
			dposModule: this.dpos,
		});
		this.modules.rebuilder = this.rebuilder;

		this.forger = new Forger({
			channel: this.channel,
			logger: this.logger,
			storage: this.storage,
			dposModule: this.dpos,
			bftModule: this.bft,
			transactionPoolModule: this.transactionPool,
			processorModule: this.processor,
			chainModule: this.chain,
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
			transactionPoolModule: this.transactionPool,
			processorModule: this.processor,
			chainModule: this.chain,
		});

		this.modules.forger = this.forger;
		this.modules.transport = this.transport;
		this.modules.bft = this.bft;
		this.modules.synchronizer = this.synchronizer;
	}

	async _startLoader() {
		return this.synchronizer.loadUnconfirmedTransactions();
	}

	async _forgingTask() {
		return this.sequence.add(async () => {
			try {
				if (!this.forger.delegatesEnabled()) {
					this.logger.trace('No delegates are enabled');
					return;
				}
				if (this.synchronizer.isActive) {
					this.logger.debug('Client not ready to forge');
					return;
				}
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
		this.forgingJob = new Job(async () => this._forgingTask(), forgeInterval);
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.forgingJob.start();
	}

	_subscribeToEvents() {
		this.channel.subscribe(
			'app:block:broadcast',
			async ({ data: { block } }) => {
				await this.transport.handleBroadcastBlock(block);
			},
		);

		this.channel.subscribe('app:chain:sync', ({ data: { block, peerId } }) => {
			this.synchronizer.run(block, peerId).catch(err => {
				this.logger.error({ err }, 'Error occurred during synchronization.');
			});
		});

		this.transactionPool.events.on(EVENT_TRANSACTION_REMOVED, event => {
			this.logger.debug(event, 'Transaction was removed from the pool.');
		});
	}

	_unsubscribeToEvents() {
		this.bft.removeAllListeners(EVENT_BFT_BLOCK_FINALIZED);
	}
};
