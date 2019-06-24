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

const { ConsensusManager } = require('./consensus_manager');

const blockHeaderSchema = require('./block_header_schema');
const { validate } = require('../../../../src/controller/validator');

/**
 * Validate schema of block header
 *
 * @param {BlockHeader} blockHeader
 * @return {boolean}
 */
const validateBlockHeader = blockHeader =>
	validate(blockHeaderSchema, blockHeader);

const KEYS = {
	FINALIZED_HEIGHT: 'BFT.finalizedHeight',
};

const TWO_ROUNDS = 101 * 2;

const extractBlockHeaderFromBlock = block => {
	if (block.version !== 2) {
		return null;
	}

	return {
		blockId: block.id,
		height: block.height,
		maxHeightPreviouslyForged: block.maxHeightPreviouslyForged,
		prevotedConfirmedUptoHeight: block.prevotedConfirmedUptoHeight,
		delegatePublicKey: block.generatorPublicKey,
		activeSinceRound: 0, // TODO: Link the new DPOS with BFT here
	};
};

class BFT {
	constructor({ storage, logger, activeDelegates, startingHeight }) {
		this.consensusManager = null;

		this.logger = logger;
		this.storage = storage;
		this.constants = {
			activeDelegates,
			startingHeight,
		};
	}

	async init() {
		try {
			// Initialize the finality manager
			// =====================================

			// Check what finalized height was stored last time
			const finalizedHeightStored =
				parseInt(
					await this.storage.entities.ChainMeta.getKey(KEYS.FINALIZED_HEIGHT)
				) || 0;

			// Check BFT migration height
			// https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#backwards-compatibility
			const bftMigrationHeight = this.constants.startingHeight - TWO_ROUNDS;

			// Choose
			const finalizedHeight = Math.max(
				finalizedHeightStored,
				bftMigrationHeight
			);

			this.consensusManager = new ConsensusManager({
				finalizedHeight,
				activeDelegates: this.constants.activeDelegates,
			});

			const lastBlock = await this.storage.entities.Block.get(
				{},
				{ limit: 1, sort: 'height:desc' }
			);
			const lastBlockHeight = lastBlock.length ? lastBlock[0].height : 0;

			const loadUptoHeight = Math.max(
				lastBlockHeight - TWO_ROUNDS,
				finalizedHeight
			);

			const rows = await this.storage.entities.Block.get(
				{ height_gte: loadUptoHeight },
				{ limit: 1, sort: 'height:asc' }
			);

			rows.map(row =>
				this._finalityManager.addBlockHeader(
					exportedInterface.extractBlockHeaderFromBlock(row)
				)
			);
		} catch (error) {
			this.logger.error(error, 'Unable to init BFT module');
		}
	}
}

const exportedInterface = {
	validateBlockHeader,
	extractBlockHeaderFromBlock,
	BFT,
};

module.exports = exportedInterface;
