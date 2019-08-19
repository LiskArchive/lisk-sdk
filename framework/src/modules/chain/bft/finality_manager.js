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

const assert = require('assert');
const debug = require('debug')('lisk:bft:consensus_manager');
const EventEmitter = require('events');
const { HeadersList } = require('./headers_list');
const { validateBlockHeader } = require('./utils');
const {
	BFTChainDisjointError,
	BFTLowerChainBranchError,
	BFTForkChoiceRuleError,
	BFTInvalidAttributeError,
} = require('./errors');

const EVENT_BFT_FINALIZED_HEIGHT_CHANGED = 'EVENT_BFT_FINALIZED_HEIGHT_CHANGED';
/**
 * @typedef {Object} BlockHeader
 * @property {string} blockId
 * @property {int} height
 * @property {int} maxHeightPreviouslyForged
 * @property {int} prevotedConfirmedUptoHeight
 * @property {int} activeSinceRound
 * @property {string} delegatePublicKey
 */

class FinalityManager extends EventEmitter {
	constructor({ finalizedHeight, activeDelegates } = {}) {
		super();
		assert(finalizedHeight !== undefined, 'Must provide finalizedHeight');
		assert(activeDelegates !== undefined, 'Must provide activeDelegates');
		assert(activeDelegates > 0, 'Must provide a positive activeDelegates');

		// Set constants
		this.activeDelegates = activeDelegates;

		// Threshold to consider a block pre-voted
		this.preVoteThreshold = Math.ceil((this.activeDelegates * 2) / 3);

		// Threshold to consider a block pre-committed (or finalized)
		this.preCommitThreshold = Math.ceil((this.activeDelegates * 2) / 3);

		// Limit for blocks to make perform verification or pre-vote/pre-commit (1 block less than 3 rounds)
		this.processingThreshold = this.activeDelegates * 3 - 1;

		// Maximum headers to store (5 rounds)
		this.maxHeaders = this.activeDelegates * 5;

		this.headers = new HeadersList({ size: this.maxHeaders });

		// Height up to which blocks are finalized
		this._initialFinalizedHeight = finalizedHeight;
		this.finalizedHeight = finalizedHeight;

		// Height up to which blocks have pre-voted
		this.prevotedConfirmedHeight = 0;

		this.state = {};
		this.preVotes = {};
		this.preCommits = {};
	}

	/**
	 * Add block header to BlockHeaderManager
	 *
	 * @param {BlockHeader} blockHeader
	 * @return {Block_headers_manager}
	 */
	addBlockHeader(blockHeader) {
		debug('addBlockHeader invoked');
		debug('validateBlockHeader invoked');
		// Validate the schema of the header
		// To spy exported function in same module we have to call it as this
		validateBlockHeader(blockHeader);

		// Verify the integrity of the header with chain
		try {
			this.verifyBlockHeaders(blockHeader);
		} catch (error) {
			// TODO: Remove hardcoded value of maxHeightPreviouslyForged to avoid this
			// https://github.com/LiskHQ/lisk-sdk/blob/fa1bb6907955c12297336f80f59951ba4754da7f/framework/src/modules/chain/blocks/process.js#L125-L126
			if (!(error instanceof BFTChainDisjointError)) {
				throw error;
			}
		}

		// Add the header to the list
		this.headers.add(blockHeader);
		// Update the pre-votes and pre-commits
		this.updatePreVotesPreCommits(blockHeader);

		// Update the pre-voted confirmed and finalized height
		this.updatePreVotedAndFinalizedHeight();

		// Cleanup pre-votes and pre-commits
		this._cleanup();

		debug('after adding block header', {
			finalizedHeight: this.finalizedHeight,
			prevotedConfirmedHeight: this.prevotedConfirmedHeight,
			minHeight: this.minHeight,
			maxHeight: this.maxHeight,
		});
		return this;
	}

	/**
	 * Remove block headers above given height (exclusive)
	 * If no param provided will remove last block header
	 *
	 *
	 * @param {int} aboveHeight -  Height from above remove headers
	 */
	removeBlockHeaders({ aboveHeight }) {
		debug('removeBlockHeaders invoked');

		const removeAboveHeight = aboveHeight || this.maxHeight - 1;

		// Remove block header from the list
		this.headers.remove({ aboveHeight: removeAboveHeight });

		// Recompute finality data
		this.recompute();
	}

	/**
	 * Update pre-votes and pre-commits in reference to particular block header
	 *
	 * @param {BlockHeader} lastBlockHeader
	 * @return {Boolean}
	 */
	updatePreVotesPreCommits(lastBlockHeader) {
		debug('updatePreVotesPreCommits invoked');
		// Update applies particularly in reference to last block header in the list
		const header = lastBlockHeader || this.headers.last;

		// If delegate forged a block with higher or same height previously
		// that means he is forging on other chain and we don't count any
		// pre-votes and pre-commits from him
		if (header.maxHeightPreviouslyForged >= header.height) {
			return false;
		}

		// Get delegate public key
		const { delegatePublicKey } = header;

		// Load or initialize delegate state in reference to current BlockHeaderManager block headers
		const delegateState = this.state[delegatePublicKey] || {
			maxPreVoteHeight: 0,
			maxPreCommitHeight: 0,
		};

		// Get first block of the round when delegate was active
		const heightSinceDelegateActive =
			(header.activeSinceRound - 1) * this.activeDelegates + 1;

		const validMinHeightToVoteAndCommit = this._getValidMinHeightToCommit(
			header,
		);

		// If delegate is new then first block of the round will be considered
		// if it forged before then we probably have the last commit height
		// delegate can't pre-commit a block before the above mentioned conditions
		const minPreCommitHeight = Math.max(
			heightSinceDelegateActive,
			validMinHeightToVoteAndCommit,
			delegateState.maxPreCommitHeight + 1,
		);

		// Delegate can't pre-commit the blocks on tip of the chain
		const maxPreCommitHeight = header.height - 1;

		// eslint-disable-next-line no-plusplus
		for (let j = minPreCommitHeight; j <= maxPreCommitHeight; j++) {
			// Add pre-commit if threshold is reached
			if (this.preVotes[j] >= this.preVoteThreshold) {
				// Increase the pre-commit for particular height
				this.preCommits[j] = (this.preCommits[j] || 0) + 1;

				// Keep track of the last pre-commit point
				delegateState.maxPreCommitHeight = j;
			}
		}

		// Check between height of first block of the round when delegate was active
		// Or one step ahead where it forged the last block
		// Or one step ahead where it left the last pre-vote
		// Or maximum 3 rounds backward
		const minPreVoteHeight = Math.max(
			heightSinceDelegateActive,
			header.maxHeightPreviouslyForged + 1,
			delegateState.maxPreVoteHeight + 1,
			header.height - this.processingThreshold,
		);
		// Pre-vote upto current block height
		const maxPreVoteHeight = header.height;
		// eslint-disable-next-line no-plusplus
		for (let j = minPreVoteHeight; j <= maxPreVoteHeight; j++) {
			this.preVotes[j] = (this.preVotes[j] || 0) + 1;
		}
		// Update delegate state
		delegateState.maxPreVoteHeight = maxPreVoteHeight;

		// Set the delegate state
		this.state[delegatePublicKey] = delegateState;

		return true;
	}

	/**
	 * Update the pre-voted confirmed and finalized height
	 * @return {boolean}
	 */
	updatePreVotedAndFinalizedHeight() {
		debug('updatePreVotedAndFinalizedHeight invoked');
		if (this.headers.length === 0) {
			return false;
		}

		const highestHeightPreVoted = Object.keys(this.preVotes)
			.reverse()
			.find(key => this.preVotes[key] >= this.preVoteThreshold);

		this.prevotedConfirmedHeight = highestHeightPreVoted
			? parseInt(highestHeightPreVoted, 10)
			: this.prevotedConfirmedHeight;

		const highestHeightPreCommitted = Object.keys(this.preCommits)
			.reverse()
			.find(key => this.preCommits[key] >= this.preCommitThreshold);

		// Store current finalizedHeight
		const previouslyFinalizedHeight = this.finalizedHeight;

		if (highestHeightPreCommitted) {
			this.finalizedHeight = parseInt(highestHeightPreCommitted, 10);
		}

		if (previouslyFinalizedHeight !== this.finalizedHeight) {
			this.emit(EVENT_BFT_FINALIZED_HEIGHT_CHANGED, this.finalizedHeight);
		}

		return true;
	}

	/**
	 * Return the valid height to start the pre-commit
	 * this method will help to identify the gaps in the blocks
	 * if delegate forged a block on different chain
	 *
	 * @param header
	 * @return {number}
	 * @private
	 */
	_getValidMinHeightToCommit(header) {
		// We search backward from top block to bottom block in the chain

		// We should search down to the height we have in our headers list
		// and within the processing threshold which is three rounds
		const searchTillHeight = Math.max(
			this.minHeight,
			header.height - this.processingThreshold,
		);

		// Start looking from the point where delegate forged the block last time
		// and within the processing threshold which is three rounds
		let needleHeight = Math.max(
			header.maxHeightPreviouslyForged,
			header.height - this.processingThreshold,
		);

		// Hold reference for the current header
		let currentBlockHeader = { ...header };

		while (needleHeight >= searchTillHeight) {
			// We need to ensure that the delegate forging header did not forge on any other chain, i.e.,
			// maxHeightPreviouslyForged always refers to a height with a block forged by the same delegate.
			if (needleHeight === currentBlockHeader.maxHeightPreviouslyForged) {
				const previousBlockHeader = this.headers.get(needleHeight);

				// Was the previous block suggested by current block header
				// was actually forged by same delegate? If not then just return from here
				// delegate can't commit blocks down from that height
				if (
					previousBlockHeader.delegatePublicKey !== header.delegatePublicKey ||
					previousBlockHeader.maxHeightPreviouslyForged >= needleHeight
				) {
					return needleHeight;
				}

				// Move the needle to previous block and consider it current for next iteration
				needleHeight = previousBlockHeader.maxHeightPreviouslyForged;
				currentBlockHeader = previousBlockHeader;
			} else {
				needleHeight -= 1;
			}
		}
		return needleHeight;
	}

	/**
	 * Use existing block headers and re-compute all information
	 */
	recompute() {
		this.state = {};
		this.finalizedHeight = this._initialFinalizedHeight;
		this.prevotedConfirmedHeight = 0;
		this.preVotes = {};
		this.preCommits = {};

		this.headers.items.forEach(header => {
			this.updatePreVotesPreCommits(header);
		});

		this.updatePreVotedAndFinalizedHeight();

		this._cleanup();
	}

	/**
	 * Verify if the block header is good for current chain
	 *
	 * @param {BlockHeader} blockHeader
	 */
	verifyBlockHeaders(blockHeader) {
		debug('verifyBlockHeaders invoked');
		// We need minimum processingThreshold to decide
		// if prevotedConfirmedUptoHeight is correct
		if (
			this.headers.length >= this.processingThreshold &&
			blockHeader.prevotedConfirmedUptoHeight !== this.prevotedConfirmedHeight
		) {
			throw new BFTInvalidAttributeError(
				'Wrong prevotedConfirmedHeight in blockHeader.',
			);
		}

		// Find top most block forged by same delegate
		const delegateLastBlock = this.headers
			.top(this.processingThreshold)
			.reverse()
			.find(
				header => header.delegatePublicKey === blockHeader.delegatePublicKey,
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
			throw new BFTForkChoiceRuleError();
		}

		if (delegateLastBlock.height > blockHeader.maxHeightPreviouslyForged) {
			throw new BFTChainDisjointError();
		}

		if (
			delegateLastBlock.prevotedConfirmedUptoHeight >
			blockHeader.prevotedConfirmedUptoHeight
		) {
			throw new BFTLowerChainBranchError();
		}

		return true;
	}

	/**
	 * Cleanup pre-votes and pre-commits objects
	 * to only keep the track of maximum 5 rounds (headers list size)
	 *
	 * @private
	 */
	_cleanup() {
		Object.keys(this.preVotes)
			.slice(0, -1 * this.maxHeaders)
			.forEach(key => {
				delete this.preVotes[key];
			});

		Object.keys(this.preCommits)
			.slice(0, -1 * this.maxHeaders)
			.forEach(key => {
				delete this.preCommits[key];
			});
	}

	get minHeight() {
		return this.headers.first ? this.headers.first.height : 0;
	}

	get maxHeight() {
		return this.headers.last ? this.headers.last.height : 0;
	}
}

module.exports = {
	EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
	FinalityManager,
};
