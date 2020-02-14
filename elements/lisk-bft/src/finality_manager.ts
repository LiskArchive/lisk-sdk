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

import * as assert from 'assert';
import * as Debug from 'debug';
import { EventEmitter } from 'events';

import { BFT_ROUND_THRESHOLD } from './constant';
import {
	BFTChainDisjointError,
	BFTForkChoiceRuleError,
	BFTInvalidAttributeError,
	BFTLowerChainBranchError,
	BlockHeader,
	Chain,
	DPoS,
	StateStore,
} from './types';
import { validateBlockHeader } from './utils';

const debug = Debug('lisk:bft:consensus_manager');

export const EVENT_BFT_FINALIZED_HEIGHT_CHANGED =
	'EVENT_BFT_FINALIZED_HEIGHT_CHANGED';

export class FinalityManager extends EventEmitter {
	public readonly activeDelegates: number;
	public readonly preVoteThreshold: number;
	public readonly preCommitThreshold: number;
	public readonly processingThreshold: number;
	public readonly maxHeaders: number;

	public finalizedHeight: number;
	public chainMaxHeightPrevoted: number;

	private state: {
		[key: string]: {
			maxPreVoteHeight: number;
			maxPreCommitHeight: number;
		};
	};
	private preVotes: {
		[key: string]: number;
	};
	private preCommits: {
		[key: string]: number;
	};

	private readonly _chain: Chain;
	private readonly _dpos: DPoS;

	public constructor({
		chain,
		dpos,
		finalizedHeight,
		activeDelegates,
	}: {
		readonly chain: Chain;
		readonly dpos: DPoS;
		readonly finalizedHeight: number;
		readonly activeDelegates: number;
	}) {
		super();
		assert(activeDelegates > 0, 'Must provide a positive activeDelegates');

		this._chain = chain;
		this._dpos = dpos;

		// Set constants
		this.activeDelegates = activeDelegates;

		/* tslint:disable:no-magic-numbers */
		// Threshold to consider a block pre-voted
		this.preVoteThreshold = Math.ceil((this.activeDelegates * 2) / 3);

		// Threshold to consider a block pre-committed (or finalized)
		this.preCommitThreshold = Math.ceil((this.activeDelegates * 2) / 3);

		// Limit for blocks to make perform verification or pre-vote/pre-commit (1 block less than 3 rounds)
		this.processingThreshold = this.activeDelegates * BFT_ROUND_THRESHOLD - 1;

		// Maximum headers to store (5 rounds)
		this.maxHeaders = this.activeDelegates * 5;

		// Height up to which blocks are finalized
		this.finalizedHeight = finalizedHeight;

		// Height up to which blocks have pre-voted
		this.chainMaxHeightPrevoted = 0;

		this.state = {};
		this.preVotes = {};
		this.preCommits = {};

		/* tslint:enable:no-magic-numbers */
	}

	public async addBlockHeader(
		blockHeader: BlockHeader,
		stateStore: StateStore,
	): Promise<FinalityManager> {
		debug('addBlockHeader invoked');
		debug('validateBlockHeader invoked');
		const bftApplicableBlocks = await this.getBFTApplicableBlockHeaders(
			blockHeader.height - 1,
		);

		validateBlockHeader(blockHeader);

		// Verify the integrity of the header with chain
		this.verifyBlockHeaders(blockHeader, bftApplicableBlocks);

		// Update the pre-votes and pre-commits
		await this.updatePreVotesPreCommits(
			blockHeader,
			stateStore,
			bftApplicableBlocks,
		);

		// Update the pre-voted confirmed and finalized height
		this.updatePreVotedAndFinalizedHeight();

		// Cleanup pre-votes and pre-commits
		this._cleanup();

		debug('after adding block header', {
			finalizedHeight: this.finalizedHeight,
			chainMaxHeightPrevoted: this.chainMaxHeightPrevoted,
		});

		return this;
	}

	public async updatePreVotesPreCommits(
		header: BlockHeader,
		stateStore: StateStore,
		bftBlockHeaders: ReadonlyArray<BlockHeader>,
	): Promise<boolean> {
		debug('updatePreVotesPreCommits invoked');
		// If delegate forged a block with higher or same height previously
		// That means he is forging on other chain and we don't count any
		// Pre-votes and pre-commits from him
		if (header.maxHeightPreviouslyForged >= header.height) {
			return false;
		}

		// Get delegate public key
		const { generatorPublicKey: delegatePublicKey } = header;

		// Load or initialize delegate state in reference to current BlockHeaderManager block headers
		const delegateState = this.state[delegatePublicKey] || {
			maxPreVoteHeight: 0,
			maxPreCommitHeight: 0,
		};

		const minValidHeightToPreCommit = this._getMinValidHeightToPreCommit(
			header,
			bftBlockHeaders,
		);

		const delegateMinHeightActive = await this._dpos.getMinActiveHeight(
			header.height,
			header.generatorPublicKey,
			stateStore,
		);

		// If delegate is new then first block of the round will be considered
		// If it forged before then we probably have the last commit height
		// Delegate can't pre-commit a block before the above mentioned conditions
		const minPreCommitHeight = Math.max(
			header.height - this.processingThreshold,
			delegateMinHeightActive,
			minValidHeightToPreCommit,
			delegateState.maxPreCommitHeight + 1,
		);

		// Delegate can't pre-commit the blocks on tip of the chain
		const maxPreCommitHeight = header.height - 1;

		/* tslint:disable-next-line: no-let*/
		for (let j = minPreCommitHeight; j <= maxPreCommitHeight; j += 1) {
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
			delegateMinHeightActive,
			header.maxHeightPreviouslyForged + 1,
			// This is not written on LIP // delegateState.maxPreVoteHeight + 1,
			header.height - this.processingThreshold,
		);
		// Pre-vote upto current block height
		const maxPreVoteHeight = header.height;

		/* tslint:disable-next-line: no-let*/
		for (let j = minPreVoteHeight; j <= maxPreVoteHeight; j += 1) {
			this.preVotes[j] = (this.preVotes[j] || 0) + 1;
		}
		// Update delegate state
		delegateState.maxPreVoteHeight = maxPreVoteHeight;

		// Set the delegate state
		this.state[delegatePublicKey] = delegateState;

		return true;
	}

	public updatePreVotedAndFinalizedHeight(): boolean {
		debug('updatePreVotedAndFinalizedHeight invoked');

		const highestHeightPreVoted = Object.keys(this.preVotes)
			.reverse()
			.find(key => this.preVotes[key] >= this.preVoteThreshold);

		this.chainMaxHeightPrevoted = highestHeightPreVoted
			? parseInt(highestHeightPreVoted, 10)
			: this.chainMaxHeightPrevoted;

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
	 * Get the min height from which a delegate can make pre-commits
	 *
	 * The flow is as following:
	 * - We search backward from top block to bottom block in the chain
	 * - We can search down to current block height - processingThreshold(302)
	 * -
	 */
	private _getMinValidHeightToPreCommit(
		header: BlockHeader,
		bftApplicableBlocks: ReadonlyArray<BlockHeader>,
	): number {
		// tslint:disable-next-line no-let
		let needleHeight = Math.max(
			header.maxHeightPreviouslyForged,
			header.height - this.processingThreshold,
		);
		/* We should search down to the height we have in our headers list
			and within the processing threshold which is three rounds	*/
		const searchTillHeight = Math.max(
			1,
			header.height - this.processingThreshold,
		);
		// Hold reference for the previously forged height
		// tslint:disable-next-line no-let
		let previousBlockHeight = header.maxHeightPreviouslyForged;

		const blocksIncludingCurrent = [header, ...bftApplicableBlocks];
		while (needleHeight >= searchTillHeight) {
			// We need to ensure that the delegate forging header did not forge on any other chain, i.e.,
			// MaxHeightPreviouslyForged always refers to a height with a block forged by the same delegate.
			if (needleHeight === previousBlockHeight) {
				const previousBlockHeader = blocksIncludingCurrent.find(
					bftHeader => bftHeader.height === needleHeight,
				);
				if (!previousBlockHeader) {
					// If the height is not in the cache, it should not be considered
					debug('Fail to get cached block header');

					return 0;
				}
				if (
					previousBlockHeader.generatorPublicKey !==
						header.generatorPublicKey ||
					previousBlockHeader.maxHeightPreviouslyForged >= needleHeight
				) {
					return needleHeight + 1;
				}
				previousBlockHeight = previousBlockHeader.maxHeightPreviouslyForged;
				needleHeight = previousBlockHeader.maxHeightPreviouslyForged;
			} else {
				needleHeight -= 1;
			}
		}

		return Math.max(needleHeight + 1, searchTillHeight);
	}

	public async recompute(
		recompteUptoHeight: number,
		stateStore: StateStore,
	): Promise<void> {
		this.reset();

		const blockHeaders = await this.getBFTApplicableBlockHeaders(
			recompteUptoHeight,
		);
		if (!blockHeaders.length) {
			throw new Error('Cannot find a block to recompute');
		}

		// tslint:disable-next-line no-let
		for (let i = blockHeaders.length - 1; i >= 0; i -= 1) {
			const blockHeader = blockHeaders[i];
			const bftBlockHeader = blockHeaders.slice(i + 1);
			await this.updatePreVotesPreCommits(
				blockHeader,
				stateStore,
				bftBlockHeader,
			);
		}
		this.updatePreVotedAndFinalizedHeight();

		this._cleanup();
	}

	public reset(): void {
		this.state = {};
		this.chainMaxHeightPrevoted = 0;
		this.preVotes = {};
		this.preCommits = {};
	}

	public verifyBlockHeaders(
		blockHeader: BlockHeader,
		bftBlockHeaders: ReadonlyArray<BlockHeader>,
	): boolean {
		debug('verifyBlockHeaders invoked');
		debug(blockHeader);

		// We need minimum processingThreshold to decide
		// If maxHeightPrevoted is correct
		if (
			bftBlockHeaders.length >= this.processingThreshold &&
			blockHeader.maxHeightPrevoted !== this.chainMaxHeightPrevoted
		) {
			throw new BFTInvalidAttributeError(
				`Wrong maxHeightPrevoted in blockHeader. maxHeightPrevoted: ${blockHeader.maxHeightPrevoted}, : ${this.chainMaxHeightPrevoted}`,
			);
		}

		// Find top most block forged by same delegate
		const delegateLastBlock = bftBlockHeaders.find(
			header => header.generatorPublicKey === blockHeader.generatorPublicKey,
		);

		if (!delegateLastBlock) {
			return true;
		}

		// Order the two block headers such that earlierBlock must be forged first
		// tslint:disable-next-line no-let
		let earlierBlock = delegateLastBlock;
		// tslint:disable-next-line no-let
		let laterBlock = blockHeader;
		const higherMaxHeightPreviouslyForgerd =
			earlierBlock.maxHeightPreviouslyForged >
			laterBlock.maxHeightPreviouslyForged;
		const sameMaxHeightPreviouslyForgerd =
			earlierBlock.maxHeightPreviouslyForged ===
			laterBlock.maxHeightPreviouslyForged;
		const higherMaxHeightPrevoted =
			earlierBlock.maxHeightPrevoted > laterBlock.maxHeightPrevoted;
		const sameMaxHeightPrevoted =
			earlierBlock.maxHeightPrevoted === laterBlock.maxHeightPrevoted;
		const higherHeight = earlierBlock.height > laterBlock.height;
		if (
			higherMaxHeightPreviouslyForgerd ||
			(sameMaxHeightPreviouslyForgerd && higherMaxHeightPrevoted) ||
			(sameMaxHeightPreviouslyForgerd && sameMaxHeightPrevoted && higherHeight)
		) {
			[earlierBlock, laterBlock] = [laterBlock, earlierBlock];
		}

		if (
			earlierBlock.maxHeightPrevoted === laterBlock.maxHeightPrevoted &&
			earlierBlock.height >= laterBlock.height
		) {
			/* Violation of the fork choice rule as delegate moved to different chain
			 without strictly larger maxHeightPreviouslyForged or larger height as
			 justification. This in particular happens, if a delegate is double forging. */
			throw new BFTForkChoiceRuleError();
		}

		if (earlierBlock.height > laterBlock.maxHeightPreviouslyForged) {
			throw new BFTChainDisjointError();
		}

		if (earlierBlock.maxHeightPrevoted > laterBlock.maxHeightPrevoted) {
			throw new BFTLowerChainBranchError();
		}

		return true;
	}

	public async getBFTApplicableBlockHeaders(
		height: number,
	): Promise<ReadonlyArray<BlockHeader>> {
		if (height === 0) {
			return [];
		}
		const fromHeight = Math.max(1, height - this.processingThreshold);

		return this._chain.dataAccess.getBlockHeadersByHeightBetween(
			fromHeight,
			height,
		);
	}

	private _cleanup(): void {
		// tslint:disable:no-delete no-dynamic-delete
		Object.keys(this.preVotes)
			.slice(0, this.maxHeaders * -1)
			.forEach(key => {
				delete this.preVotes[key];
			});

		Object.keys(this.preCommits)
			.slice(0, this.maxHeaders * -1)
			.forEach(key => {
				delete this.preCommits[key];
			});
		// tslint:enable:no-delete no-dynamic-delete
	}
}
