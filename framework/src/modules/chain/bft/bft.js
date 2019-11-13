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
const forkChoiceRule = require('./fork_choice_rule');
const { validateBlockHeader } = require('./utils');

const META_KEYS = {
	FINALIZED_HEIGHT: 'BFT.finalizedHeight',
	LAST_BLOCK_FORGED: 'BFT.maxHeightPreviouslyForged',
};
const EVENT_BFT_BLOCK_FINALIZED = 'EVENT_BFT_BLOCK_FINALIZED';

const extractBFTBlockHeaderFromBlock = block => ({
	blockId: block.id,
	height: block.height,
	maxHeightPreviouslyForged: block.maxHeightPreviouslyForged,
	maxHeightPrevoted: block.maxHeightPrevoted,
	delegatePublicKey: block.generatorPublicKey,
	// This parameter injected to block object to avoid big refactoring
	// for the moment. `delegateMinHeightActive` will be removed from the block
	// object with https://github.com/LiskHQ/lisk-sdk/issues/4413
	delegateMinHeightActive: block.delegateMinHeightActive || 0,
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
	 * @param {Object} slots - Slots class
	 * @param {integer} activeDelegates - Number of delegates
	 * @param {integer} startingHeight - The height at which BFT finalization manager initialize
	 */
	constructor({ storage, logger, slots, activeDelegates, startingHeight }) {
		super();
		this.finalityManager = null;

		this.logger = logger;
		this.storage = storage;
		this.slots = slots;
		this.constants = {
			activeDelegates,
			startingHeight,
		};

		this.blockEntity = this.storage.entities.Block;
		this.chainMetaEntity = this.storage.entities.ChainMeta;
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
	 * Serialize common properties to the JSON format
	 * @param {*} blockInstance Instance of the block
	 * @returns JSON format of the block
	 */
	// eslint-disable-next-line class-methods-use-this
	serialize(blockInstance) {
		return {
			...blockInstance,
			maxHeightPreviouslyForged: blockInstance.maxHeightPreviouslyForged || 0,
			maxHeightPrevoted: blockInstance.maxHeightPrevoted || 0,
		};
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
	 * @param {Object} tx - database transaction
	 * @return {Promise<void>}
	 */
	async addNewBlock(block, tx) {
		this.finalityManager.addBlockHeader(extractBFTBlockHeaderFromBlock(block));
		const { finalizedHeight } = this.finalityManager;
		// TODO: this should be memory operation in the state store
		return this.chainMetaEntity.setKey(
			META_KEYS.FINALIZED_HEIGHT,
			finalizedHeight,
			tx,
		);
	}

	async verifyNewBlock(block) {
		return this.finalityManager.verifyBlockHeaders(
			extractBFTBlockHeaderFromBlock(block),
		);
	}

	/**
	 * Computes maxHeightPreviouslyForged and maxHeightPrevoted properties that are necessary
	 * for creating a new block
	 * @param delegatePublicKey
	 * @return {Promise<{maxHeightPrevoted: number, maxHeightPreviouslyForged: (number|*)}>}
	 */
	async computeBFTHeaderProperties(delegatePublicKey) {
		const previouslyForged = await this._getPreviouslyForgedMap();
		const maxHeightPreviouslyForged = previouslyForged[delegatePublicKey] || 0;

		return {
			// maxHeightPrevoted is up till height - 1
			maxHeightPrevoted: this.finalityManager.prevotedConfirmedHeight,
			maxHeightPreviouslyForged,
		};
	}

	/**
	 * Saving a height which delegate last forged. this needs to be saved before broadcasting
	 * so it needs to be outside of the DB transaction
	 * @param delegatePublicKey
	 * @param height
	 */
	async saveMaxHeightPreviouslyForged(delegatePublicKey, height) {
		const previouslyForgedMap = await this._getPreviouslyForgedMap();
		const previouslyForgedHeightByDelegate =
			previouslyForgedMap[delegatePublicKey] || 0;
		// previously forged height only saves maximum forged height
		if (height <= previouslyForgedHeightByDelegate) {
			return;
		}
		const updatedPreviouslyForged = {
			...previouslyForgedMap,
			[delegatePublicKey]: height,
		};
		const previouslyForgedStr = JSON.stringify(updatedPreviouslyForged);
		await this.chainMetaEntity.setKey(
			META_KEYS.LAST_BLOCK_FORGED,
			previouslyForgedStr,
		);
	}

	forkChoice(block, lastBlock) {
		// Current time since Lisk Epoch
		block.receivedAt = this.slots.getEpochTime();
		// Cases are numbered following LIP-0014 Fork choice rule.
		// See: https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#applying-blocks-according-to-fork-choice-rule
		// Case 2 and 1 have flipped execution order for better readability. Behavior is still the same

		if (forkChoiceRule.isValidBlock(lastBlock, block)) {
			// Case 2: correct block received
			return forkChoiceRule.FORK_STATUS_VALID_BLOCK;
		}

		if (forkChoiceRule.isIdenticalBlock(lastBlock, block)) {
			// Case 1: same block received twice
			return forkChoiceRule.FORK_STATUS_IDENTICAL_BLOCK;
		}

		if (forkChoiceRule.isDoubleForging(lastBlock, block)) {
			// Delegates are the same
			// Case 3: double forging different blocks in the same slot.
			// Last Block stands.
			return forkChoiceRule.FORK_STATUS_DOUBLE_FORGING;
		}

		if (
			forkChoiceRule.isTieBreak({
				slots: this.slots,
				lastAppliedBlock: lastBlock,
				receivedBlock: block,
			})
		) {
			// Two competing blocks by different delegates at the same height.
			// Case 4: Tie break
			return forkChoiceRule.FORK_STATUS_TIE_BREAK;
		}

		if (forkChoiceRule.isDifferentChain(lastBlock, block)) {
			// Case 5: received block has priority. Move to a different chain.
			return forkChoiceRule.FORK_STATUS_DIFFERENT_CHAIN;
		}

		// Discard newly received block
		return forkChoiceRule.FORK_STATUS_DISCARD;
	}

	async _getPreviouslyForgedMap() {
		const previouslyForgedStr = await this.chainMetaEntity.getKey(
			META_KEYS.LAST_BLOCK_FORGED,
		);
		return previouslyForgedStr ? JSON.parse(previouslyForgedStr) : {};
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
				await this.chainMetaEntity.getKey(META_KEYS.FINALIZED_HEIGHT),
				10,
			) || 1;

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
		const lastBlock = await this.blockEntity.get(
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

		const rows = await this.blockEntity.get(
			{ height_gte: fromHeight, height_lte: tillHeight },
			{ limit: null, sort: sortOrder },
		);

		rows.forEach(row => {
			if (row.height !== 1 && row.version !== 2) return;

			this.finalityManager.addBlockHeader(extractBFTBlockHeaderFromBlock(row));
		});
	}

	// eslint-disable-next-line class-methods-use-this
	validateBlock(block) {
		validateBlockHeader(extractBFTBlockHeaderFromBlock(block));
	}

	/**
	 * Verify if block forger is following the BFT Protocol
	 * See https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#incentivizing-lisk-bft-protocol-participation
	 *
	 * @param {ExtendedBlock} block
	 * @return {boolean}
	 */
	isBFTProtocolCompliant(block) {
		assert(block, 'No block was provided to be verified');

		const roundsThreshold = 3;
		const heightThreshold = this.constants.activeDelegates * roundsThreshold;
		const blockHeader = extractBFTBlockHeaderFromBlock(block);

		// Special case to avoid reducing the reward of delegates forging for the first time before the `heightThreshold` height
		if (blockHeader.maxHeightPreviouslyForged === 0) {
			return true;
		}

		const bftHeaders = this.finalityManager.headers;

		const maxHeightPreviouslyForgedBlock = bftHeaders.get(
			blockHeader.maxHeightPreviouslyForged,
		);

		if (
			!maxHeightPreviouslyForgedBlock ||
			blockHeader.maxHeightPreviouslyForged >= blockHeader.height ||
			(blockHeader.height - blockHeader.maxHeightPreviouslyForged <=
				heightThreshold &&
				blockHeader.delegatePublicKey !==
					maxHeightPreviouslyForgedBlock.delegatePublicKey)
		) {
			return false;
		}

		return true;
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
