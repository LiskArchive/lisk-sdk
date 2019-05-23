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
	 * @param {Object} blockHeader
	 * @param {string} blockHeader.blockId
	 * @param {int} blockHeader.height
	 * @param {int} blockHeader.maxHeightPreviouslyForged
	 * @param {int} blockHeader.prevotedConfirmedUptoHeight
	 * @param {int} blockHeader.activeSinceRound
	 * @param {string} blockHeader.delegatePublicKey
	 */
	addBlockHeader(blockHeader) {
		this.headers.add(blockHeader);

		this.isConflictingHeaders(blockHeader);
	}

	isConflictingHeaders(blockHeader, blockThreshold = PROCESSING_THRESHOLD) {
		// We need minimum PROCESSING_THRESHOLD to decide
		// if prevotedConfirmedUptoHeight is correct
		if (
			this.headers.length >= blockThreshold &&
			blockHeader.prevotedConfirmedUptoHeight !== this.prevotedConfirmedHeight
		) {
			throw new Error('Wrong provtedConfirmedHeight in blockHeader.');
		}
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
	MAX_HEADERS,
	PROCESSING_WINDOW: PROCESSING_THRESHOLD,
	PREVOTE_THRESHOLD,
	PRECOMMIT_THRESHOLD,
};
