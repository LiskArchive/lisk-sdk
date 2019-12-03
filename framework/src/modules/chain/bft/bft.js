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

const CHAIN_STATE_FINALIZED_HEIGHT = 'BFT.finalizedHeight';
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
		this.chainStateEntity = this.storage.entities.ChainState;
	}

	async init(stateStore, minActiveHeightsOfDelegates = {}) {
		this.finalityManager = await this._initFinalityManager(stateStore);

		this.finalityManager.on(
			EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
			updatedFinalizedHeight => {
				this.emit(EVENT_BFT_FINALIZED_HEIGHT_CHANGED, updatedFinalizedHeight);
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
			minActiveHeightsOfDelegates,
		});
	}

	// eslint-disable-next-line class-methods-use-this
	serialize(blockInstance) {
		return {
			...blockInstance,
			maxHeightPreviouslyForged: blockInstance.maxHeightPreviouslyForged || 0,
			maxHeightPrevoted: blockInstance.maxHeightPrevoted || 0,
		};
	}

	async deleteBlocks(blocks, minActiveHeightsOfDelegates = {}) {
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
			await this._loadBlocksFromStorage({
				fromHeight,
				tillHeight,
				minActiveHeightsOfDelegates,
			});
		}
	}

	async addNewBlock(block, stateStore) {
		this.finalityManager.addBlockHeader(extractBFTBlockHeaderFromBlock(block));
		const { finalizedHeight } = this.finalityManager;
		return stateStore.chainState.set(
			CHAIN_STATE_FINALIZED_HEIGHT,
			finalizedHeight,
		);
	}

	async verifyNewBlock(block) {
		return this.finalityManager.verifyBlockHeaders(
			extractBFTBlockHeaderFromBlock(block),
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

	async _initFinalityManager(stateStore) {
		// Check what finalized height was stored last time
		const finalizedHeightStored =
			parseInt(stateStore.chainState.get(CHAIN_STATE_FINALIZED_HEIGHT), 10) ||
			1;

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

	async _getLastBlockHeight() {
		const lastBlock = await this.blockEntity.get(
			{},
			{ limit: 1, sort: 'height:desc' },
		);
		return lastBlock.length ? lastBlock[0].height : 0;
	}

	async _loadBlocksFromStorage({
		fromHeight,
		tillHeight,
		minActiveHeightsOfDelegates,
	}) {
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

			// If it's genesis block, skip the logic and set
			// `delegateMinHeightActive` to 1.
			if (row.height === 1) {
				this.finalityManager.addBlockHeader(
					extractBFTBlockHeaderFromBlock({
						...row,
						delegateMinHeightActive: 1,
					}),
				);
				return;
			}

			const activeHeights = minActiveHeightsOfDelegates[row.generatorPublicKey];
			if (!activeHeights) {
				throw new Error(
					`Minimum active heights were not found for delegate "${
						row.generatorPublicKey
					}".`,
				);
			}

			// If there is no minHeightActive until this point,
			// we can set the value to 0
			const minimumPossibleActiveHeight = this.slots.calcRoundStartHeight(
				this.slots.calcRound(
					Math.max(row.height - this.constants.activeDelegates * 3, 1),
				),
			);
			const [delegateMinHeightActive] = activeHeights.filter(
				height => height >= minimumPossibleActiveHeight,
			);

			const blockHeaders = {
				...row,
				delegateMinHeightActive,
			};

			this.finalityManager.addBlockHeader(
				extractBFTBlockHeaderFromBlock(blockHeaders),
			);
		});
	}

	// eslint-disable-next-line class-methods-use-this
	validateBlock(block) {
		validateBlockHeader(extractBFTBlockHeaderFromBlock(block));
	}

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

	get maxHeightPrevoted() {
		return this.finalityManager.prevotedConfirmedHeight;
	}
}

module.exports = {
	extractBFTBlockHeaderFromBlock,
	BFT,
	EVENT_BFT_BLOCK_FINALIZED,
	EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
};
