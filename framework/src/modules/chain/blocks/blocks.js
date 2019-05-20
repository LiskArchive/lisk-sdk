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

const {
	loadLastBlock,
	loadBlockByHeight,
	loadBlocksDataWS,
} = require('./utils');

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

	async loadLastBlock() {
		return loadLastBlock(
			this.storage,
			this.transactionManager,
			this.generateBlock
		);
	}

	async loadBlockByHeight(height, tx) {
		return loadBlockByHeight(
			this.storage,
			height,
			this.transactionManager,
			this.generateBlock,
			tx
		);
	}

	async loadBlocksDataWS(filter, tx) {
		return loadBlocksDataWS(this.storage, filter, tx);
	}

	async receiveBlockFromNetwork() {}

	async loadBlocksFromNetwork() {}

	async loadBlocksOffset(blocksAmount, fromHeight = 0) {
		const toHeight = fromHeight + blocksAmount;
		this.logger.debug('Loading blocks offset', {
			limit: toHeight,
			offset: fromHeight,
		});
	}

	async generateBlock() {}

	async deleteFromBlockId() {}

	async deleteLastBlock() {}

	async recoverChain() {}

	async applyGenesisBlock() {}

	async verifyBlock() {}

	async addBlockProperties() {}
}

module.exports = {
	Blocks,
};
