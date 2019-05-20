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

const blocksUtils = require('./utils');
const blocksProcess = require('./process');

class Blocks {
	constructor({
		logger,
		storage,
		genesisBlock,
		transactionManager,
		excptions,
		blockReceiptTimeout, // set default
	}) {
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
	async loadBlockChain() {
		// check mem tables
		// check genesisBlock
		// rebuild account if it's rebuild
		// check reload condition, true then reload
		// reload
		// reset memtables
		// loadBlocksOffsets
		// loadBlocksOffsets
		// processBlock, boradcast: false, save: false (apply only)
		// validate own chain
		await blocksProcess.loadBlockChain(this.storage);
	}

	async loadBlocksDataWS(filter, tx) {
		return blocksUtils.loadBlocksDataWS(this.storage, filter, tx);
	}

	// Process a block from the P2P
	async receiveBlockFromNetwork() {
		// add to sequence
		// get last block
		// check if it's not fork
		// if not, update lastReceipt
		// processBlock, boradcast: true, save: true
		// if fork one
		// save fork
		// check discard condition
		// object normalize
		// validateBlockSlot
		// verifyReceipt
		// deleteLastBlock
		// deleteLastBlock
		// if fork five
		// save fork
		// check double forge
		// check discard condition
		// update lastReceipt
		// object normalize
		// validateBlockSlot
		// verifyReceipt
		// deleteLastBlock
		// processBlock, boradcast: true, save: true
		await blocksProcess.loadBlockChain(this.storage);
	}

	// Process a block from syncing
	async loadBlocksFromNetwork() {
		// readDBRows (for sync syntax)
		// processBlock, boradcast: false, save: true
		await blocksProcess.loadBlocksFromNetwork(this.storage);
	}

	// Generate a block for forging
	async generateBlock(transactions = []) {
		// checkAllowedTransactions
		// verifyTransactions
		// createBlock
		// processBlock, boradcast: true, save: true
		blocksProcess.loadBlockChain(this.storage);
	}

	// Used for transport
	// eslint-disable-next-line
	async addBlockProperties() {
		return blocksUtils.addBlockProperties();
	}
}

module.exports = {
	Blocks,
};
