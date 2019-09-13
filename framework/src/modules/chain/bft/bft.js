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
const assert = require('assert');
const {
	EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
	FinalityManager,
} = require('./finality_manager');
const { validateBlockHeader } = require('./utils');

const META_KEYS = {
	FINALIZED_HEIGHT: 'BFT.finalizedHeight',
};
const EVENT_BFT_BLOCK_FINALIZED = 'EVENT_BFT_BLOCK_FINALIZED';

const extractBFTBlockHeaderFromBlock = block => ({
	blockId: block.id,
	height: block.height,
	maxHeightPreviouslyForged: block.maxHeightPreviouslyForged,
	prevotedConfirmedUptoHeight: block.prevotedConfirmedUptoHeight,
	delegatePublicKey: block.generatorPublicKey,
	activeSinceRound: 0, // TODO: Link the new DPOS with BFT here
});

/**
 * BFT class responsible to hold integration logic for finality manager with the framework
 */
class BFT extends EventEmitter {
	/**
	 * Create BFT module instance
	 *
	 * @param {Object} storage - Storage component instance
	 * @param {Object} logger - Logger component instance
	 * @param {integer} activeDelegates - Number of delegates
	 * @param {integer} startingHeight - The height at which BFT finalization manager initialize
	 */
	constructor({ storage, logger, activeDelegates, startingHeight }) {
		super();
		this.finalityManager = null;

		this.logger = logger;
		this.storage = storage;
		this.constants = {
			activeDelegates,
			startingHeight,
		};

		this.BlockEntity = this.storage.entities.Block;
		this.ChainMetaEntity = this.storage.entities.ChainMeta;
	}

	/**
	 * Initialize the BFT module
	 *
	 * @return {Promise<void>}
	 */
	async init() {
		this.finalityManager = await this._initFinalityManager();

		this.finalityManager.on(
			EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
			finalizedHeight => {
				this.emit(EVENT_BFT_FINALIZED_HEIGHT_CHANGED, finalizedHeight);
			},
		);
		const { finalizedHeight } = this.finalityManager;
		const lastBlockHeight = await this._getLastBlockHeight();

		const loadFromHeight = Math.max(
			finalizedHeight,
			lastBlockHeight - this.constants.activeDelegates * 2,
			this.constants.startingHeight,
		);

		await this._loadBlocksFromStorage({
			fromHeight: loadFromHeight,
			tillHeight: lastBlockHeight,
		});
	}

	/**
	 * When blocks deleted send those to BFT to update BFT state
	 *
	 * @param {Array.<Object>} blocks - List of all blocks
	 * @return {Promise<void>}
	 */
	async deleteBlocks(blocks) {
		assert(blocks, 'Must provide blocks which are deleted');
		assert(Array.isArray(blocks), 'Must provide list of blocks');

		// We need only height to delete the blocks
		// But for future extension we accept full blocks in BFT
		// We may need to utilize some other attributes for internal processing
		const blockHeights = blocks.map(({ height }) => height);

		assert(
			!blockHeights.some(h => h <= this.finalityManager.finalizedHeight),
			'Can not delete block below or same as finalized height',
		);

		const removeFromHeight = Math.min(...blockHeights);

		this.finalityManager.removeBlockHeaders({
			aboveHeight: removeFromHeight - 1,
		});

		// Make sure there are 2 rounds of block headers available
		if (
			this.finalityManager.maxHeight - this.finalityManager.minHeight <
			this.constants.activeDelegates * 2
		) {
			const tillHeight = this.finalityManager.minHeight - 1;
			const fromHeight =
				this.finalityManager.maxHeight - this.constants.activeDelegates * 2;
			await this._loadBlocksFromStorage({ fromHeight, tillHeight });
		}
	}

	/**
	 * Load new block to BFT
	 *
	 * @param {Object} block - The block which is forged
	 * @return {Promise<void>}
	 */
	async addNewBlock(block) {
		// We don't need async operations here as of now but can require in future
		// and for consistency with other interfaces keeping it async
		this.finalityManager.addBlockHeader(extractBFTBlockHeaderFromBlock(block));
	}

	async verifyNewBlock(block) {
		return this.finalityManager.verifyBlockHeaders(
			extractBFTBlockHeaderFromBlock(block),
		);
	}

	/**
	 * Computes maxHeightPreviouslyForged and prevotedConfirmedUptoHeight properties that are necessary
	 * for creating a new block
	 * @param delegatePubKey
	 * @return {Promise<{prevotedConfirmedUptoHeight: number, maxHeightPreviouslyForged: (number|*)}>}
	 */
	async computeBFTHeaderProperties(delegatePubKey) {
		return this.finalityManager.computeBFTHeaderProperties(delegatePubKey);
	}

	/**
	 * Initialize the consensus manager and return the finalize height
	 *
	 * @return {Promise<number>} - Return the finalize height
	 * @private
	 */
	async _initFinalityManager() {
		// Check what finalized height was stored last time
		const finalizedHeightStored =
			parseInt(
				await this.ChainMetaEntity.getKey(META_KEYS.FINALIZED_HEIGHT),
				10,
			) || 0;

		// Check BFT migration height
		// https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#backwards-compatibility
		const bftMigrationHeight =
			this.constants.startingHeight - this.constants.activeDelegates * 2;

		// Choose max between stored finalized height or migration height
		const finalizedHeight = Math.max(finalizedHeightStored, bftMigrationHeight);

		// Initialize consensus manager
		return new FinalityManager({
			finalizedHeight,
			activeDelegates: this.constants.activeDelegates,
		});
	}

	/**
	 * Get the last block height from storage
	 *
	 * @return {Promise<number>}
	 * @private
	 */
	async _getLastBlockHeight() {
		const lastBlock = await this.BlockEntity.get(
			{},
			{ limit: 1, sort: 'height:desc' },
		);
		return lastBlock.length ? lastBlock[0].height : 0;
	}

	/**
	 * Load blocks into consensus manager fetching from storage
	 *
	 * @param {int} fromHeight - The start height to fetch and load
	 * @param {int} tillHeight - The end height to fetch and load
	 * @return {Promise<void>}
	 */
	async _loadBlocksFromStorage({ fromHeight, tillHeight }) {
		let sortOrder = 'height:asc';

		// If blocks to be loaded on tail
		if (
			this.finalityManager.minHeight ===
			Math.max(fromHeight, tillHeight) + 1
		) {
			sortOrder = 'height:desc';
		}

		const rows = await this.BlockEntity.get(
			{ height_gte: fromHeight, height_lte: tillHeight },
			{ limit: null, sort: sortOrder },
		);

		rows.forEach(row => {
			if (row.version !== '2') return;

			this.finalityManager.addBlockHeader(extractBFTBlockHeaderFromBlock(row));
		});
	}

	// eslint-disable-next-line class-methods-use-this
	validateBlock(block) {
		validateBlockHeader(extractBFTBlockHeaderFromBlock(block));
	}

	get finalizedHeight() {
		return this.finalityManager.finalizedHeight;
	}
}

module.exports = {
	extractBFTBlockHeaderFromBlock,
	BFT,
	EVENT_BFT_BLOCK_FINALIZED,
	EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
};
