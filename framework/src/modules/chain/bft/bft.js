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

const { FinalityManager } = require('./finality_manager');
const { verifyBlockForChainSwitching } = require('./utils');

const META_KEYS = {
	FINALIZED_HEIGHT: 'BFT.finalizedHeight',
};

const CHAIN_SWITCH_MODES = {
	NO: Symbol('CHAIN_SWITCH_MODE_NO'),
	FAST: Symbol('CHAIN_SWITCH_MODE_FAST'),
	SYNC: Symbol('CHAIN_SWITCH_MODE_SYNC'),
};

const extractBFTBlockHeaderFromBlock = block => ({
	blockId: block.id,
	height: block.height,
	maxHeightPreviouslyForged: block.maxHeightPreviouslyForged,
	prevotedConfirmedUptoHeight: block.prevotedConfirmedUptoHeight,
	delegatePublicKey: block.generatorPublicKey,
	activeSinceRound: 0, // TODO: Link the new DPOS with BFT here
});

/**
 * BFT class responsible to hold integration logic for consensus manager with the framework
 */
class BFT {
	/**
	 * Create BFT module instance
	 *
	 * @param {Object} storage - Storage component instance
	 * @param {Object} logger - Logger component instance
	 * @param {integer} activeDelegates - Number of delegates
	 * @param {integer} startingHeight - The height at which BFT consensus initialize
	 */
	constructor({
		storage,
		logger,
		slots,
		dpos,
		activeDelegates,
		startingHeight,
	}) {
		this.finalityManager = null;

		this.logger = logger;
		this.storage = storage;
		this.slots = slots;
		this.dpos = dpos;
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
		const { finalizedHeight } = this.finalityManager;
		const lastBlockHeight = await this._getLastBlockHeight();

		const loadFromHeight = Math.max(
			finalizedHeight,
			lastBlockHeight - this.constants.activeDelegates * 2,
			this.constants.startingHeight
		);

		await this.loadBlocks({
			fromHeight: loadFromHeight,
			tillHeight: lastBlockHeight,
		});
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
			parseInt(await this.ChainMetaEntity.getKey(META_KEYS.FINALIZED_HEIGHT)) ||
			0;

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
			{ limit: 1, sort: 'height:desc' }
		);
		return lastBlock.length ? lastBlock[0].height : 0;
	}

	/**
	 * Load blocks into consensus manager fetching from storage
	 *
	 * @param {integer} fromHeight - The start height to fetch and load
	 * @param {integer} tillHeight - The end height to fetch and load
	 * @return {Promise<void>}
	 */
	async loadBlocks({ fromHeight, tillHeight }) {
		const rows = await this.BlockEntity.get(
			{ height_gte: fromHeight, height_lte: tillHeight },
			{ limit: null, sort: 'height:asc' }
		);

		rows.forEach(row => {
			if (row.version !== '2') return;

			this.finalityManager.addBlockHeader(
				exportedInterface.extractBFTBlockHeaderFromBlock(row)
			);
		});
	}

	/**
	 * Get the mode to switch the chain
	 *
	 * @param {Object} lastBlock
	 * @param {Object} block
	 * @return {Promise<'CHAIN_SWITCH_MODE_SYNC'|'CHAIN_SWITCH_MODE_FAST'|'CHAIN_SWITCH_MODE_NO'>}
	 */
	async getChainSwitchingMode(lastBlock, block) {
		// Moving to a Different Chain
		// 1. Step: Validate new tip of chain
		const result = verifyBlockForChainSwitching(lastBlock, block);
		if (!result.verified) {
			throw Error(
				`Block verification for chain switching failed with errors: ${result.errors.join()}`
			);
		}

		// 2. Step: Check whether current chain justifies triggering the block synchronization mechanism
		const finalizedBlock = await this.BlockEntity.getOne({
			height_eq: this.consensusManager.finalizedHeight,
		});
		const finalizedBlockSlot = this.slots.getSlotNumber(
			finalizedBlock.timestamp
		);
		const currentBlockSLot = this.slots.getSlotNumber();
		const THREE_ROUNDS = this.constants.activeDelegates * 3;

		if (finalizedBlockSlot < currentBlockSLot - THREE_ROUNDS) {
			return CHAIN_SWITCH_MODES.SYNC;
		}

		// 3. Step: Check whether B justifies fast chain switching mechanism
		const TWO_ROUNDS = this.constants.activeDelegates * 2;
		if (Math.abs(block.height - lastBlock.height) > TWO_ROUNDS) {
			return CHAIN_SWITCH_MODES.NO;
		}

		const blockRound = this.slots.calcRound(block.height);
		const delegateList = await this.dpos.getRoundDelegates(blockRound);
		if (delegateList.includes(block.generatorPublicKey)) {
			return CHAIN_SWITCH_MODES.FAST;
		}

		return CHAIN_SWITCH_MODES.NO;
	}
}

const exportedInterface = {
	extractBFTBlockHeaderFromBlock,
	BFT,
	CHAIN_SWITCH_MODES,
};

module.exports = exportedInterface;
