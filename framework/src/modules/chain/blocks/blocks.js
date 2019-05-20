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
const blocksLogic = require('./block');
const blocksChain = require('./chain');

const EVENT_NEW_BLOCK = 'EVENT_NEW_BLOCK';
const EVENT_DELETE_BLOCK = 'EVENT_DELETE_BLOCK';
const EVENT_BROADCAST_BLOCK = 'EVENT_BROADCAST_BLOCK';

class Blocks extends EventEmitter {
	constructor({
		logger,
		storage,
		genesisBlock,
		transactionManager,
		excptions,
		blockReceiptTimeout, // set default
	}) {
		super();
		this.logger = logger;
		this.storage = storage;
		this.exceptions = excptions;
		this.blockReceiptTimeout = blockReceiptTimeout;
		this.genesisBlock = genesisBlock;
		this.transactionManager = transactionManager;

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
		return secondsAgo > this.blockReceiptTimeout;
	}

	updateLastReceipt() {
		this._lastReceipt = Math.floor(Date.now() / 1000);
		return this._lastReceipt;
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

	// Initializing the blockchain
	async loadBlockChain(rebuildUpToRound) {
		this._shouldNotBeActive();
		this._isActive = true;
		// check mem tables
		const {
			blockCount,
			genesisBlock,
			memRounds,
		} = await blocksUtils.getMemTables();
		if (blockCount === 1) {
			this._lastBlock = await blocksProcess.reload(blockCount);
			this._isActive = false;
			return;
		}
		// check genesisBlock
		blocksVerify.matchGenesisBlock(this.genesisBlock, genesisBlock);
		// rebuild accounts if it's rebuild
		if (rebuildUpToRound !== null) {
			this.logger.info(
				{ rebuildUpToRound, blockCount },
				'Rebuild process started'
			);
			this._lastBlock = await blocksProcess.rebuild(blockCount);
			this._isActive = false;
			return;
		}
		// check reload condition, true then reload
		try {
			await blocksVerify.reloadRequired(memRounds);
		} catch (error) {
			this.logger.error(error, 'Reload of blockchain is required');
			this._lastBlock = await blocksProcess.reload(blockCount);
			this._isActive = false;
			return;
		}
		try {
			this._lastBlock = await blocksUtils.loadLastBlock();
		} catch (error) {
			this.logger.error(error, 'Failed to fetch last block');
			// This is last attempt
			this._lastBlock = await blocksProcess.reload(blockCount);
			this._isActive = false;
			return;
		}
		try {
			await blocksVerify.validateOwnChain();
		} catch (error) {
			this.logger.error(error, 'Invalid own blockchain');
			await blocksProcess.recoverInvalidOwnChain();
		}
		this._isActive = false;
		this.logger.info('Blockchain ready');
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
			if (!blocksVerify.isFork(block, this._lastBlock)) {
				this.updateLastReceipt();
				try {
					const newBlock = await blocksProcess.processBlock({
						broadcast: validBlock => this.broadcast(validBlock),
					});
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
				const normalizedBlock = blocksLogic.objectNormalize(
					block,
					this.exceptions
				);
				try {
					await blocksVerify.validateBlockSlot(
						this.delegatesModule,
						normalizedBlock
					);
					const { verified, errors } = blocksVerify.verifyReceipt({
						block: normalizedBlock,
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
				this.updateLastReceipt();
				const normalizedBlock = blocksLogic.objectNormalize(
					block,
					this.exceptions
				);
				try {
					await blocksVerify.validateBlockSlot(
						this.delegatesModule,
						normalizedBlock
					);
					const { verified, errors } = blocksVerify.verifyReceipt({
						block: normalizedBlock,
					});
					if (!verified) {
						throw errors;
					}
					const deletingBlock = this._lastBlock;
					this._lastBlock = await blocksChain.deleteLastBlock();
					this.emit(EVENT_DELETE_BLOCK, { block: deletingBlock });
					// emit event
					const secondDeletingBlock = this._lastBlock;
					this._lastBlock = await blocksProcess.processBlock({
						broadcast: validBlock => this.broadcast(validBlock),
					});
					this.emit(EVENT_DELETE_BLOCK, { block: secondDeletingBlock });
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
				this._isActive = false;
				return;
			}
			// eslint-disable-next-line no-await-in-loop
			this._lastBlock = await blocksProcess.processBlock({ block });
			// emit event
			this._updateLastNBlocks(block);
			this.emit(EVENT_NEW_BLOCK, { block });
		}
		this._isActive = false;
	}

	// Generate a block for forging
	async generateBlock(keypair, timestamp, transactions = []) {
		this._shouldNotBeActive();
		this._isActive = true;
		const block = await blocksProcess.generateBlock({
			lastBlock: this._lastBlock,
			transactions,
			keypair,
			timestamp,
		});
		this._lastBlock = await blocksProcess.processBlock({
			block,
			broadcast: validBlock => this.broadcast(validBlock),
		});
		// emit event
		this._updateLastNBlocks(this._lastBlock);
		this.emit(EVENT_NEW_BLOCK, { block: this._lastBlock });
		this._isActive = false;
	}

	_shouldNotBeActive() {
		if (this._isActive) {
			throw new Error('Block process cannot be executed in parallel');
		}
	}

	_updateLastNBlocks(block) {
		this.lastNBlockIds.push(block.id);
		if (this.lastNBlockIds.length > this.blockSlotWindow) {
			this.lastNBlockIds.shift();
		}
	}
}

module.exports = {
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
};
