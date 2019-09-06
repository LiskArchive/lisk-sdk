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

const EventEmitter = require('events');
const { cloneDeep } = require('lodash');
const blocksUtils = require('./utils');
const { BlocksProcess } = require('./process');
const { BlocksVerify } = require('./verify');
const { BlocksChain } = require('./chain');
const {
	calculateSupply,
	calculateReward,
	calculateMilestone,
} = require('./block_reward');

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
		exceptions,
		// Modules
		roundsModule,
		interfaceAdapters,
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
		blockSlotWindow,
	}) {
		super();

		this._broadhash = genesisBlock.payloadHash;
		this._lastNBlockIds = [];
		this._lastBlock = {};
		this._isActive = false;
		this._lastReceipt = null;
		this._cleaning = false;

		this.logger = logger;
		this.storage = storage;
		this.roundsModule = roundsModule;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
		this.interfaceAdapters = interfaceAdapters;
		this.slots = slots;
		this.sequence = sequence;
		this.blockRewardArgs = {
			distance: rewardDistance,
			rewardOffset,
			milestones: rewardMileStones,
			totalAmount,
		};
		this.blockReward = {
			calculateMilestone: height =>
				calculateMilestone(height, this.blockRewardArgs),
			calculateReward: height => calculateReward(height, this.blockRewardArgs),
			calculateSupply: height => calculateSupply(height, this.blockRewardArgs),
		};
		this.constants = {
			blockReceiptTimeout,
			maxPayloadLength,
			maxTransactionsPerBlock,
			loadPerIteration,
			activeDelegates,
			blockSlotWindow,
		};

		this.blocksChain = new BlocksChain({
			storage: this.storage,
			interfaceAdapters: this.interfaceAdapters,
			roundsModule: this.roundsModule,
			slots: this.slots,
			exceptions: this.exceptions,
			genesisBlock: this.genesisBlock,
		});
		this.blocksVerify = new BlocksVerify({
			storage: this.storage,
			exceptions: this.exceptions,
			slots: this.slots,
			genesisBlock: this.genesisBlock,
			roundsModule: this.roundsModule,
			blockReward: this.blockReward,
			constants: this.constants,
			interfaceAdapters: this.interfaceAdapters,
		});
		this.blocksProcess = new BlocksProcess({
			blocksChain: this.blocksChain,
			blocksVerify: this.blocksVerify,
			storage: this.storage,
			exceptions: this.exceptions,
			slots: this.slots,
			interfaceAdapters: this.interfaceAdapters,
			genesisBlock: this.genesisBlock,
			blockReward: this.blockReward,
			constants: this.constants,
		});
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
				{ limit: this.constants.blockSlotWindow, sort: 'height:desc' },
			);
			this._lastNBlockIds = rows.map(row => row.id);
		} catch (error) {
			this.logger.error(
				error,
				`Unable to load last ${this.constants.blockSlotWindow} block ids`,
			);
		}
	}

	broadcast(block) {
		// emit event
		const cloned = cloneDeep(block);
		this.emit(EVENT_BROADCAST_BLOCK, { block: cloned });
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
		await this.blocksChain.saveGenesisBlock();
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
			},
		);
		if (blocksCount === 1) {
			this.logger.info('Applying genesis block');
			this._lastBlock = await this._reload(blocksCount);
			this._isActive = false;
			return;
		}
		// check genesisBlock
		this.blocksVerify.matchGenesisBlock(genesisBlock);
		// rebuild accounts if it's rebuild
		if (rebuildUpToRound !== null && rebuildUpToRound !== undefined) {
			try {
				await this._rebuildMode(rebuildUpToRound, blocksCount);
				this._isActive = false;
			} catch (errors) {
				this._isActive = false;
				throw errors;
			}
			return;
		}
		// check reload condition, true then reload
		try {
			await this.blocksVerify.reloadRequired(blocksCount, memRounds);
		} catch (error) {
			this.logger.error(error, 'Reload of blockchain is required');
			this._lastBlock = await this._reload(blocksCount);
			this._isActive = false;
			return;
		}
		try {
			this._lastBlock = await blocksUtils.loadLastBlock(
				this.storage,
				this.interfaceAdapters,
				this.genesisBlock,
			);
		} catch (error) {
			this.logger.error(error, 'Failed to fetch last block');
			// This is last attempt
			this._lastBlock = await this._reload(blocksCount);
			this._isActive = false;
			return;
		}
		const recoverRequired = await this.blocksVerify.requireBlockRewind(
			this._lastBlock,
		);

		if (recoverRequired) {
			this.logger.error('Invalid own blockchain');
			this._lastBlock = await this.blocksProcess.recoverInvalidOwnChain(
				this._lastBlock,
				(lastBlock, newLastBlock) => {
					this.logger.info({ lastBlock, newLastBlock }, 'Deleted block');
					this.emit(EVENT_DELETE_BLOCK, {
						block: cloneDeep(lastBlock),
						newLastBlock: cloneDeep(newLastBlock),
					});
				},
			);
		}
		this._isActive = false;
		this.logger.info('Blockchain ready');
	}

	async recoverChain() {
		const originalLastBlock = cloneDeep(this._lastBlock);
		this._lastBlock = await this.blocksChain.deleteLastBlock(this._lastBlock);
		this.emit(EVENT_DELETE_BLOCK, {
			block: originalLastBlock,
			newLastBlock: cloneDeep(this._lastBlock),
		});
		return this._lastBlock;
	}

	async loadBlocksDataWS(filter, tx) {
		return blocksUtils.loadBlocksDataWS(this.storage, filter, tx);
	}

	// Process a block from the P2P
	async receiveBlockFromNetwork(block) {
		return this.sequence.add(async () => {
			this._shouldNotBeActive();
			this._isActive = true;
			// set active to true
			if (this.blocksVerify.isSaneBlock(block, this._lastBlock)) {
				this._updateLastReceipt();
				try {
					const newBlock = await this.blocksProcess.processBlock(
						block,
						this._lastBlock,
						validBlock => this.broadcast(validBlock),
					);
					await this._updateBroadhash();
					this._lastBlock = newBlock;
					this._isActive = false;
					this.emit(EVENT_NEW_BLOCK, { block: cloneDeep(this._lastBlock) });
				} catch (error) {
					this._isActive = false;
					this.logger.error(error);
				}
				return;
			}
			if (this.blocksVerify.isForkOne(block, this._lastBlock)) {
				this.roundsModule.fork(block, 1);
				if (this.blocksVerify.shouldDiscardForkOne(block, this._lastBlock)) {
					this.logger.info('Last block stands');
					this._isActive = false;
					return;
				}
				try {
					const {
						verified,
						errors,
					} = await this.blocksVerify.normalizeAndVerify(
						block,
						this._lastBlock,
						this._lastNBlockIds,
					);
					if (!verified) {
						throw errors;
					}
					const originalLastBlock = cloneDeep(this._lastBlock);
					this._lastBlock = await this.blocksChain.deleteLastBlock(
						this._lastBlock,
					);
					this.emit(EVENT_DELETE_BLOCK, {
						block: originalLastBlock,
						newLastBlock: cloneDeep(this._lastBlock),
					});
					// emit event
					const secondLastBlock = cloneDeep(this._lastBlock);
					this._lastBlock = await this.blocksChain.deleteLastBlock(
						this._lastBlock,
					);
					this.emit(EVENT_DELETE_BLOCK, {
						block: secondLastBlock,
						newLastBlock: cloneDeep(this._lastBlock),
					});
					this._isActive = false;
				} catch (error) {
					this._isActive = false;
					this.logger.error(error);
				}
				return;
			}
			if (this.blocksVerify.isForkFive(block, this._lastBlock)) {
				this.roundsModule.fork(block, 5);
				if (this.blocksVerify.isDoubleForge(block, this._lastBlock)) {
					this.logger.warn(
						'Delegate forging on multiple nodes',
						block.generatorPublicKey,
					);
				}
				if (this.blocksVerify.shouldDiscardForkFive(block, this._lastBlock)) {
					this.logger.info('Last block stands');
					this._isActive = false;
					return;
				}
				this._updateLastReceipt();
				try {
					const {
						verified,
						errors,
					} = await this.blocksVerify.normalizeAndVerify(
						block,
						this._lastBlock,
						this._lastNBlockIds,
					);
					if (!verified) {
						throw errors;
					}
					const deletingBlock = cloneDeep(this._lastBlock);
					this._lastBlock = await this.blocksChain.deleteLastBlock(
						this._lastBlock,
					);
					this.emit(EVENT_DELETE_BLOCK, {
						block: deletingBlock,
						newLastBlock: cloneDeep(this._lastBlock),
					});
					// emit event
					this._lastBlock = await this.blocksProcess.processBlock(
						block,
						this._lastBlock,
						validBlock => this.broadcast(validBlock),
					);
					await this._updateBroadhash();
					this.emit(EVENT_NEW_BLOCK, { block: cloneDeep(this._lastBlock) });
					this._isActive = false;
				} catch (error) {
					this.logger.error(error);
					this._isActive = false;
				}
				return;
			}
			if (block.id === this._lastBlock.id) {
				this.logger.debug({ blockId: block.id }, 'Block already processed');
			} else {
				this.logger.warn(
					{
						blockId: block.id,
						height: block.height,
						round: this.slots.calcRound(block.height),
						generatorPublicKey: block.generatorPublicKey,
						slot: this.slots.getSlotNumber(block.timestamp),
					},
					'Discarded block that does not match with current chain',
				);
			}
			// Discard received block
			this._isActive = false;
		});
	}

	// Process a block from syncing
	async loadBlocksFromNetwork(blocks) {
		this._shouldNotBeActive();
		this._isActive = true;

		try {
			const normalizedBlocks = blocksUtils.readDbRows(
				blocks,
				this.interfaceAdapters,
				this.genesisBlock,
			);
			// eslint-disable-next-line no-restricted-syntax
			for (const block of normalizedBlocks) {
				// check if it's cleaning
				if (this._cleaning) {
					break;
				}
				// eslint-disable-next-line no-await-in-loop
				this._lastBlock = await this.blocksProcess.processBlock(
					block,
					this._lastBlock,
				);
				// emit event
				this._updateLastNBlocks(block);
				this.emit(EVENT_NEW_BLOCK, { block: cloneDeep(block) });
			}
			this._isActive = false;
			return this._lastBlock;
		} catch (error) {
			this._isActive = false;
			throw error;
		}
	}

	// Generate a block for forging
	async generateBlock(keypair, timestamp, transactions = []) {
		this._shouldNotBeActive();
		this._isActive = true;
		try {
			const block = await this.blocksProcess.generateBlock(
				this._lastBlock,
				keypair,
				timestamp,
				transactions,
			);
			this._lastBlock = await this.blocksProcess.processBlock(
				block,
				this._lastBlock,
				validBlock => this.broadcast(validBlock),
			);
		} catch (error) {
			this._isActive = false;
			throw error;
		}
		await this._updateBroadhash();
		this._updateLastReceipt();
		this._updateLastNBlocks(this._lastBlock);
		this.emit(EVENT_NEW_BLOCK, { block: cloneDeep(this._lastBlock) });
		this._isActive = false;
		return this._lastBlock;
	}

	async _rebuildMode(rebuildUpToRound, blocksCount) {
		this.logger.info(
			{ rebuildUpToRound, blocksCount },
			'Rebuild process started',
		);
		if (blocksCount < this.constants.activeDelegates) {
			throw new Error(
				'Unable to rebuild, blockchain should contain at least one round of blocks',
			);
		}
		if (
			Number.isNaN(parseInt(rebuildUpToRound, 10)) ||
			parseInt(rebuildUpToRound, 10) < 0
		) {
			throw new Error(
				'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero',
			);
		}
		const totalRounds = Math.floor(
			blocksCount / this.constants.activeDelegates,
		);
		const targetRound =
			parseInt(rebuildUpToRound, 10) === 0
				? totalRounds
				: Math.min(totalRounds, parseInt(rebuildUpToRound, 10));
		const targetHeight = targetRound * this.constants.activeDelegates;
		this._lastBlock = await this._reload(targetHeight);
		// Remove remaining
		await this.storage.entities.Block.delete({ height_gt: targetHeight });
		this.logger.info({ targetHeight, totalRounds }, 'Rebuilding finished');
	}

	_updateLastNBlocks(block) {
		this._lastNBlockIds.push(block.id);
		if (this._lastNBlockIds.length > this.constants.blockSlotWindow) {
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
			this._lastBlock.height,
		);
		this._broadhash = broadhash;
		this.emit(EVENT_NEW_BROADHASH, { broadhash, height });
	}

	_shouldNotBeActive() {
		if (this._isActive) {
			throw new Error('Block process cannot be executed in parallel');
		}
	}

	async _reload(blocksCount) {
		return this.blocksProcess.reload(
			blocksCount,
			() => this._cleaning,
			block => {
				this._lastBlock = block;
				this.logger.info(
					{ blockId: block.id, height: block.height },
					'Reloaded block',
				);
			},
		);
	}
}

module.exports = {
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
};
