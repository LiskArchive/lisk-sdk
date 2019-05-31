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

class BFT {
	constructor({ finalizedHeight, activeDelegates = 101 }) {
		// Set constants
		this.ACTIVE_DELEGATES = activeDelegates;

		// Threshold to consider a block prevoted
		this.PREVOTE_THRESHOLD = Math.ceil((this.ACTIVE_DELEGATES * 2) / 3);

		// Threshold to consider a block pre-committed (or finalized)
		this.PRECOMMIT_THRESHOLD = Math.ceil((this.ACTIVE_DELEGATES * 2) / 3);

		// Limit to of blocks to must have to make any prevote-precommit verification on blocks (1 block less than 3 rounds)
		this.PROCESSING_THRESHOLD = this.ACTIVE_DELEGATES * 3 - 1;

		// Maximum headers to store (5 rounds)
		this.MAX_HEADERS = this.ACTIVE_DELEGATES * 5;

		this.headers = new HeadersList({ size: this.MAX_HEADERS });

		// Height up to which blocks are finalized
		this.finalizedHeight = finalizedHeight || 0;

		// Height up to which blocks have prevoted
		this.prevotedConfirmedHeight = 0;

		this.delegatesState = {};
		this.prevotes = {};
		this.precommits = {};
	}

	/**
	 * Add block header to BFT
	 *
	 * @param {BlockHeader} blockHeader
	 */
	addBlockHeader(blockHeader) {
		// Validate the schema of the header
		BFT.validateBlockHeader(blockHeader);

		// Verify the integrity of the header with chain
		this.verifyBlockHeaders(blockHeader);

		this.headers.add(blockHeader);
		this.updatePrevotesPrecommits(blockHeader);

		return this;
	}

	updatePrevotesPrecommits(lastBlockHeader) {
		const header = lastBlockHeader || this.headers.last;

		if (header.maxHeightPreviouslyForged >= header.height) {
			return;
		}

		const delegatePublicKey = header.delegatePublicKey;
		const delegateState = this.delegatesState[delegatePublicKey] || {
			maxPrevoteHeight: 0,
			maxPrecommitHeight: 0,
		};
		const delegateMinHeightActive =
			(header.activeSinceRound - 1) * this.ACTIVE_DELEGATES + 1;

		const minPrecommitHeight = Math.max(
			delegateMinHeightActive,
			delegateState.maxPrecommitHeight + 1
		);
		const maxPrecommitHeight = header.height - 1;

		for (let j = minPrecommitHeight; j <= maxPrecommitHeight; j++) {
			// Add precommit if threshold is reached
			if (this.prevotes[j] >= this.PREVOTE_THRESHOLD) {
				this.precommits[j] = (this.precommits[j] || 0) + 1;
				delegateState.maxPrecommitHeight = j;
			}
		}

		// Add implied prevotes by newBlockheader
		const minPrevoteHeight = Math.max(
			header.maxHeightPreviouslyForged + 1,
			delegateMinHeightActive,
			header.height - this.PROCESSING_THRESHOLD
		);
		const maxPrevoteHeight = header.height;
		for (let j = minPrevoteHeight; j <= maxPrevoteHeight; j++) {
			this.prevotes[j] = (this.prevotes[j] || 0) + 1;
		}

		delegateState.maxPrevoteHeight = maxPrevoteHeight;

		this.delegatesState[delegatePublicKey] = delegateState;
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
			this.headers.length >= this.PROCESSING_THRESHOLD &&
			blockHeader.prevotedConfirmedUptoHeight !== this.prevotedConfirmedHeight
		) {
			throw new Error('Wrong provtedConfirmedHeight in blockHeader.');
		}

		const delegateLastBlock = this.headers.getBlockHeaderForDelegate(
			blockHeader.delegatePublicKey,
			{ fromTop: this.PROCESSING_THRESHOLD }
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
				'Violation of fork choice rule, delegate moved to different chain'
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

	/**
	 * Validate schema of block header
	 *
	 * @param {BlockHeader} blockHeader
	 * @return {boolean}
	 */
	static validateBlockHeader(blockHeader) {
		return validate(blockHeaderSchema, blockHeader);
	}

	get minHeight() {
		return this.headers.first.height;
	}

	get maxHeight() {
		return this.headers.last.height;
	}
}

module.exports = BFT;
