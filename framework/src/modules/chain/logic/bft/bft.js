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

const HeadersList = require('./headers_list');
const blockHeaderSchema = require('./block_header_schema');
const { validate } = require('../../../../../src/controller/validator');

/**
 * @typedef {Object} BlockHeader
 * @property {string} blockId
 * @property {int} height
 * @property {int} maxHeightPreviouslyForged
 * @property {int} prevotedConfirmedUptoHeight
 * @property {int} activeSinceRound
 * @property {string} delegatePublicKey
 */

/**
 * Validate schema of block header
 *
 * @param {BlockHeader} blockHeader
 * @return {boolean}
 */
const validateBlockHeader = blockHeader =>
	validate(blockHeaderSchema, blockHeader);

// Maximum headers to store (5 rounds)
const MAX_HEADERS = 505;

// Limit to of blocks to must have to make any prevote-precommit verification on blocks (1 block less than 3 rounds)
const PROCESSING_THRESHOLD = 302;

// Threshold to consider a block prevoted
const PREVOTE_THRESHOLD = 68;

// Threshold to consider a block pre-committed (or finalized)
const PRECOMMIT_THRESHOLD = 68;

class BFT {
	constructor({ finalizedHeight }) {
		this.headers = new HeadersList({ size: MAX_HEADERS });

		// Height up to which blocks are finalized
		this.finalizedHeight = finalizedHeight || 0;

		// Height up to which blocks have prevoted
		this.prevotedConfirmedHeight = 0;
	}

	/**
	 * Add block header to BFT
	 *
	 * @param {BlockHeader} blockHeader
	 */
	addBlockHeader(blockHeader) {
		// Validate the schema of the header
		validateBlockHeader(blockHeader);

		// Verify the integrity of the header with chain
		this.verifyBlockHeaders(blockHeader);

		this.headers.add(blockHeader);
	}

	/**
	 * Verify if the block header is good for current chain
	 *
	 * @param {BlockHeader} blockHeader
	 */
	verifyBlockHeaders(blockHeader) {
		// We need minimum PROCESSING_THRESHOLD to decide
		// if prevotedConfirmedUptoHeight is correct
		if (
			this.headers.length >= PROCESSING_THRESHOLD &&
			blockHeader.prevotedConfirmedUptoHeight !== this.prevotedConfirmedHeight
		) {
			throw new Error('Wrong provtedConfirmedHeight in blockHeader.');
		}

		const delegateLastBlock = this.headers.getBlockHeaderForDelegate(
			blockHeader.delegatePublicKey,
			{ fromTop: PROCESSING_THRESHOLD }
		);

		if (!delegateLastBlock) {
			return true;
		}

		if (
			delegateLastBlock.maxHeightPreviouslyForged ===
				blockHeader.maxHeightPreviouslyForged &&
			delegateLastBlock.height >= blockHeader.height
		) {
			// Violation of the fork choice rule as delegate moved to different chain
			// without strictly larger maxHeightPreviouslyForged or larger height as
			// justification. This in particular happens, if a delegate is double forging.
			throw new Error(
				'Violation of fork choice rule. Delegate moved to different chain.'
			);
		}

		if (delegateLastBlock.height > blockHeader.maxHeightPreviouslyForged) {
			throw new Error('Violates disjointness condition');
		}

		if (
			delegateLastBlock.prevotedConfirmedUptoHeight >
			blockHeader.prevotedConfirmedUptoHeight
		) {
			throw new Error(
				'Violates that delegate chooses branch with largest prevotedConfirmedUptoHeight'
			);
		}

		return true;
	}

	get minHeight() {
		return this.headers.first.height;
	}

	get maxHeight() {
		return this.headers.last.height;
	}
}

module.exports = {
	BFT,
	validateBlockHeader,
	MAX_HEADERS,
	PROCESSING_THRESHOLD,
	PREVOTE_THRESHOLD,
	PRECOMMIT_THRESHOLD,
};
