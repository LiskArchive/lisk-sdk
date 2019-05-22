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

const EventEmitter = require('events');
const blocksUtils = require('./utils');
const blocksProcess = require('./process');
const blocksVerify = require('./verify');
const blocksChain = require('./chain');
const { BlockReward } = require('./block_reward');

const EVENT_NEW_BLOCK = 'EVENT_NEW_BLOCK';
const EVENT_DELETE_BLOCK = 'EVENT_DELETE_BLOCK';
const EVENT_BROADCAST_BLOCK = 'EVENT_BROADCAST_BLOCK';
const EVENT_NEW_BROADHASH = 'EVENT_NEW_BROADHASH';

class Blocks extends EventEmitter {
	constructor({
		// components
		logger,
		storage,
		sequence,
		// Unique requirements
		genesisBlock,
		slots,
		excptions,
		// Modules
		roundsModule,
		delegatesModule,
		transactionManager,
		// constants
		blockReceiptTimeout, // set default
		loadPerIteration,
		maxPayloadLength,
		maxTransactionsPerBlock,
		activeDelegates,
		rewardDistance,
		rewardOffset,
		rewardMileStones,
		totalAmount,
	}) {
		super();
		this.logger = logger;
		this.storage = storage;
		this.roundsModule = roundsModule;
		this.delegatesModule = delegatesModule;
		this.exceptions = excptions;
		this.genesisBlock = genesisBlock;
		this.transactionManager = transactionManager;
		this.slots = slots;
		this.sequence = sequence;
		this.blockReward = new BlockReward({
			distance: rewardDistance,
			rewardOffset,
			milestones: rewardMileStones,
			totalAmount,
		});
		this.constants = {
			blockReceiptTimeout,
			maxPayloadLength,
			maxTransactionsPerBlock,
			loadPerIteration,
			activeDelegates,
		};

		this._broadhash = genesisBlock.payloadHash;
		this._lastNBlockIds = [];
		this._lastBlock = {};
		this._isActive = false;
		this._lastReceipt = null;
		this._cleaning = false;
	}

	get lastBlock() {
		return this._lastBlock;
	}

	get isActive() {
		return this._isActive;
	}

	get lastReceipt() {
		return this._lastReceipt;
	}

	get broadhash() {
		return this._broadhash;
	}

	/**
	 * Returns status of last receipt - if it stale or not.
	 *
	 * @returns {boolean} Stale status of last receipt
	 */
	isStale() {
		if (!this._lastReceipt) {
			return true;
		}
		// Current time in seconds - lastReceipt (seconds)
		const secondsAgo = Math.floor(Date.now() / 1000) - this._lastReceipt;
		return secondsAgo > this.constants.blockReceiptTimeout;
	}

	async init() {
		try {
			const rows = await this.storage.entities.Block.get(
				{},
				{ limit: this.blockSlotWindow, sort: 'height:desc' }
			);
			this._lastNBlockIds = rows.map(row => row.id);
		} catch (error) {
			this.logger.error(
				error,
				`Unable to load last ${this.blockSlotWindow} block ids`
			);
		}
	}

	broadcast(block) {
		// emit event
		this.emit(EVENT_BROADCAST_BLOCK, { block });
	}

	/**
	 * Handle node shutdown request.
	 *
	 * @listens module:app~event:cleanup
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 */
	async cleanup() {
		this._cleaning = true;
		if (!this._isActive) {
			// Module ready for shutdown
			return;
		}

		const waitFor = () =>
			new Promise(resolve => {
				setTimeout(resolve, 10000);
			});
		// Module is not ready, repeat
		const nextWatch = async () => {
			if (this._isActive) {
				this.logger.info('Waiting for block processing to finish...');
				await waitFor();
				await nextWatch();
			}

			return null;
		};
		await nextWatch();
	}

	/**
	 * Loads blockchain upon application start:
	 * 1. Checks mem tables:
	 * - count blocks from `blocks` table
	 * - get genesis block from `blocks` table
	 * - count accounts from `mem_accounts` table by block id
	 * - get rounds from `mem_round`
	 * 2. Matches genesis block with database.
	 * 3. Verifies rebuild mode.
	 * 4. Recreates memory tables when neccesary:
	 *  - Calls block to load block. When blockchain ready emits a bus message.
	 * 5. Detects orphaned blocks in `mem_accounts` and gets delegates.
	 * 6. Loads last block and emits a bus message blockchain is ready.
	 *
	 * @todo Add @returns tag
	 */
	async loadBlockChain(rebuildUpToRound) {
		this._shouldNotBeActive();
		this._isActive = true;
		await blocksChain.saveGenesisBlock(
			this.storage,
			this.transactionManager,
			this.genesisBlock
		);
		// check mem tables
		const { blocksCount, genesisBlock, memRounds } = await new Promise(
			(resolve, reject) => {
				this.storage.entities.Block.begin('loader:checkMemTables', async tx => {
					try {
						const result = await blocksUtils.loadMemTables(this.storage, tx);
						resolve(result);
					} catch (error) {
						reject(error);
					}
				});
			}
		);
		if (blocksCount === 1) {
			this._lastBlock = await this._reload(blocksCount)();
			this._isActive = false;
			return;
		}
		// check genesisBlock
		blocksVerify.matchGenesisBlock(this.genesisBlock, genesisBlock);
		// rebuild accounts if it's rebuild
		if (rebuildUpToRound !== null && rebuildUpToRound !== undefined) {
			await this._rebuildMode(rebuildUpToRound, blocksCount);
			this._isActive = false;
			return;
		}
		// check reload condition, true then reload
		try {
			await blocksVerify.reloadRequired(
				this.storage,
				this.slots,
				blocksCount,
				memRounds
			);
		} catch (error) {
			this.logger.error(error, 'Reload of blockchain is required');
			this._lastBlock = await this._reload(blocksCount)();
			this._isActive = false;
			return;
		}
		try {
			this._lastBlock = await blocksUtils.loadLastBlock(
				this.storage,
				this.transactionManager,
				this.genesisBlock
			);
		} catch (error) {
			this.logger.error(error, 'Failed to fetch last block');
			// This is last attempt
			this._lastBlock = await this._reload(blocksCount)();
			this._isActive = false;
			return;
		}
		const recoverRequired = await blocksVerify.requireBlockRewind({
			...this.constants,
			storage: this.storage,
			slots: this.slots,
			transactionManager: this.transactionManager,
			genesisBlock: this.genesisBlock,
			currentBlock: this._lastBlock,
			delegatesModule: this.delegatesModule,
			blockReward: this.blockReward,
			exceptions: this.exceptions,
		});
		if (recoverRequired) {
			this.logger.error('Invalid own blockchain');
			this._lastBlock = await blocksProcess.recoverInvalidOwnChain({
				...this.constants,
				lastBlock: this._lastBlock,
				onDelete: (lastBlock, newLastBlock) => {
					this.logger.info({ lastBlock, newLastBlock }, 'Deleted block');
					this.emit(EVENT_DELETE_BLOCK, { block: lastBlock, newLastBlock });
				},
				storage: this.storage,
				roundsModule: this.roundsModule,
				slots: this.slots,
				transactionManager: this.transactionManager,
				genesisBlock: this.genesisBlock,
				delegatesModule: this.delegatesModule,
				blockReward: this.blockReward,
				exceptions: this.exceptions,
			});
		}
		this._isActive = false;
		this.logger.info('Blockchain ready');
	}

	async recoverChain() {
		this._lastBlock = await blocksChain.deleteLastBlock();
		return this._lastBlock;
	}

	async loadBlocksDataWS(filter, tx) {
		return blocksUtils.loadBlocksDataWS(this.storage, filter, tx);
	}

	// Process a block from the P2P
	receiveBlockFromNetwork(block) {
		this.sequence.add(async cb => {
			this._shouldNotBeActive();
			this._isActive = true;
			// set active to true
			if (blocksVerify.isSaneBlock(block, this._lastBlock)) {
				this._updateLastReceipt();
				try {
					const newBlock = await this._processBlock(
						block,
						this._lastBlock,
						validBlock => this.broadcast(validBlock)
					)();
					await this._updateBroadhash();
					this._lastBlock = newBlock;
					this._isActive = false;
					setImmediate(cb);
				} catch (error) {
					this._isActive = false;
					this.logger.error(error);
					setImmediate(cb, error);
				}
				return;
			}
			if (blocksVerify.isForkOne(block, this._lastBlock)) {
				this.delegatesModule.fork(block, 1);
				if (blocksVerify.shouldDiscardForkOne(block, this._lastBlock)) {
					this.logger.info('Last block stands');
					setImmediate(cb);
					this._isActive = false;
					return;
				}
				try {
					const { verified, errors } = blocksVerify.normalizeAndVerify({
						block,
						exceptions: this.exceptions,
						delegatesModule: this.delegatesModule,
					});
					if (!verified) {
						throw errors;
					}
					await blocksChain.deleteLastBlock();
					// emit event
					this._lastBlock = await blocksChain.deleteLastBlock();
					// emit event
					this._isActive = false;
					setImmediate(cb);
					return;
				} catch (error) {
					this._isActive = false;
					this.logger.error(error);
					setImmediate(cb, error);
					return;
				}
			}
			if (blocksVerify.isForkFive(block, this._lastBlock)) {
				this.delegatesModule.fork(block, 5);
				if (blocksVerify.isDoubleForge(block, this._lastBlock)) {
					this.logger.warn(
						'Delegate forging on multiple nodes',
						block.generatorPublicKey
					);
				}
				if (blocksVerify.shouldDiscardForkFive(block, this._lastBlock)) {
					this.logger.info('Last block stands');
					setImmediate(cb);
					this._isActive = false;
					return;
				}
				this._updateLastReceipt();
				try {
					const { verified, errors } = blocksVerify.normalizeAndVerify({
						...this.constants,
						block,
						lastBlock: this._lastBlock,
						exceptions: this.exceptions,
						delegatesModule: this.delegatesModule,
						slots: this.slots,
						blockReward: this.blockReward,
						lastNBlockIds: this._lastNBlockIds,
					});
					if (!verified) {
						throw errors;
					}
					const deletingBlock = this._lastBlock;
					this._lastBlock = await blocksChain.deleteLastBlock();
					this.emit(EVENT_DELETE_BLOCK, { block: deletingBlock });
					// emit event
					this._lastBlock = await this._processBlock(
						block,
						this._lastBlock,
						validBlock => this.broadcast(validBlock)
					)();
					await this._updateBroadhash();
					this._isActive = false;
					setImmediate(cb);
					return;
				} catch (error) {
					this.logger.error(error);
					this._isActive = false;
					setImmediate(cb, error);
					return;
				}
			}
			// Discard received block
			this._isActive = false;
			setImmediate(cb);
		});
	}

	// Process a block from syncing
	async loadBlocksFromNetwork(blocks) {
		this._shouldNotBeActive();
		this._isActive = true;
		const normalizedBlocks = blocksUtils.readDbRows(
			blocks,
			this.transactionManager,
			this.genesisBlock
		);
		// eslint-disable-next-line no-restricted-syntax
		for (const block of normalizedBlocks) {
			// check if it's cleaning
			if (this._cleaning) {
				break;
			}
			// eslint-disable-next-line no-await-in-loop
			this._lastBlock = await this._processBlock(block, this._lastBlock)();
			// emit event
			this._updateLastNBlocks(block);
			this.emit(EVENT_NEW_BLOCK, { block });
		}
		this._isActive = false;
		return this._lastBlock;
	}

	// Generate a block for forging
	async generateBlock(keypair, timestamp, transactions = []) {
		this._shouldNotBeActive();
		this._isActive = true;
		try {
			const block = await blocksProcess.generateBlock({
				keypair,
				timestamp,
				transactions,
				lastBlock: this._lastBlock,
				storage: this.storage,
				exceptions: this.exceptions,
				slots: this.slots,
				maxPayloadLength: this.maxPayloadLength,
				blockReward: this.blockReward,
			});
			this._lastBlock = await this._processBlock(
				block,
				this._lastBlock,
				validBlock => this.broadcast(validBlock)
			)();
		} catch (error) {
			this._isActive = false;
			throw error;
		}
		await this._updateBroadhash();
		// emit event
		this._updateLastReceipt();
		this._updateLastNBlocks(this._lastBlock);
		this.emit(EVENT_NEW_BLOCK, { block: this._lastBlock });
		this._isActive = false;
		return this._lastBlock;
	}

	async _rebuildMode(rebuildUpToRound, blocksCount) {
		this.logger.info(
			{ rebuildUpToRound, blocksCount },
			'Rebuild process started'
		);
		if (blocksCount < this.activeDelegates) {
			throw new Error(
				'Unable to rebuild, blockchain should contain at least one round of blocks'
			);
		}
		if (
			Number.isNaN(parseInt(rebuildUpToRound)) ||
			parseInt(rebuildUpToRound) < 0
		) {
			throw new Error(
				'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero'
			);
		}
		const totalRounds = Math.floor(
			rebuildUpToRound / this.constants.activeDelegates
		);
		const targetRound =
			parseInt(rebuildUpToRound) === 0
				? totalRounds
				: Math.min(totalRounds, parseInt(rebuildUpToRound));
		const targetHeight = targetRound * this.activeDelegates;
		this._lastBlock = await blocksProcess.reload(targetHeight);
	}

	_updateLastNBlocks(block) {
		this._lastNBlockIds.push(block.id);
		if (this._lastNBlockIds.length > this.blockSlotWindow) {
			this._lastNBlockIds.shift();
		}
	}

	_updateLastReceipt() {
		this._lastReceipt = Math.floor(Date.now() / 1000);
		return this._lastReceipt;
	}

	async _updateBroadhash() {
		const { broadhash, height } = await blocksUtils.calculateNewBroadhash(
			this.storage,
			this._broadhash,
			this._lastBlock.height
		);
		this._broadhash = broadhash;
		this.emit(EVENT_NEW_BROADHASH, { broadhash, height });
	}

	_shouldNotBeActive() {
		if (this._isActive) {
			throw new Error('Block process cannot be executed in parallel');
		}
	}

	_reload(blocksCount) {
		return async () =>
			blocksProcess.reload({
				...this.constants,
				targetHeight: blocksCount,
				isCleaning: () => this._cleaning,
				onProgress: block => {
					this._lastBlock = block;
					this.logger.info(
						{ blockId: block.id, height: block.height },
						'Rebuilding block'
					);
				},
				transactionManager: this.transactionManager,
				storage: this.storage,
				loadPerIteration: this.constants.loadPerIteration,
				genesisBlock: this.genesisBlock,
				slots: this.slots,
				roundsModule: this.roundsModule,
				exceptions: this.exceptions,
				delegatesModule: this.delegatesModule,
				blockReward: this.blockReward,
			});
	}

	_processBlock(block, lastBlock, broadcast) {
		return async () =>
			blocksProcess.processBlock({
				block,
				lastBlock,
				broadcast,
				storage: this.storage,
				exceptions: this.exceptions,
				slots: this.slots,
				delegatesModule: this.delegatesModule,
				roundsModule: this.roundsModule,
				maxPayloadLength: this.maxPayloadLength,
				maxTransactionsPerBlock: this.maxTransactionsPerBlock,
				blockReward: this.blockReward,
			});
	}
}

module.exports = {
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
};
