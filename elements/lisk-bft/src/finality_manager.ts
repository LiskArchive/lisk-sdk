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

import { codec } from '@liskhq/lisk-codec';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as assert from 'assert';
import * as Debug from 'debug';
import { EventEmitter } from 'events';
import { BufferMap } from './utils/buffer_map';
import { BFT_ROUND_THRESHOLD } from './constant';
import {
	BFTChainDisjointError,
	BFTForkChoiceRuleError,
	BFTInvalidAttributeError,
	BFTLowerChainBranchError,
	BlockHeader,
	DPoS,
	StateStore,
} from './types';

// eslint-disable-next-line new-cap
const debug = Debug('lisk:bft:consensus_manager');

export const EVENT_BFT_FINALIZED_HEIGHT_CHANGED =
	'EVENT_BFT_FINALIZED_HEIGHT_CHANGED';
export const CONSENSUS_STATE_DELEGATE_LEDGER_KEY = 'bft:votingLedger';

export const BFTVotingLedgerSchema = {
	type: 'object',
	$id: '/BFT/Delegates',
	title: 'Lisk BFT Delegate ledger',
	required: ['delegates', 'ledger'],
	properties: {
		delegates: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'maxPreVoteHeight', 'maxPreCommitHeight'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					maxPreVoteHeight: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					maxPreCommitHeight: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
		},
		ledger: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['height', 'preVotes', 'preCommits'],
				properties: {
					height: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					preVotes: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					preCommits: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			},
		},
	},
};

codec.addSchema(BFTVotingLedgerSchema);

interface DelegatesState {
	address: Buffer;
	maxPreVoteHeight: number;
	maxPreCommitHeight: number;
}

interface LedgerState {
	height: number;
	preVotes: number;
	preCommits: number;
}

interface LedgerMap {
	[key: string]: { preVotes: number; preCommits: number };
}

interface DelegateState {
	maxPreVoteHeight: number;
	maxPreCommitHeight: number;
}

interface VotingLedgerMap {
	readonly delegates: BufferMap<DelegateState>;
	readonly ledger: LedgerMap;
}

export interface VotingLedger {
	readonly delegates: DelegatesState[];
	readonly ledger: LedgerState[];
}

export class FinalityManager extends EventEmitter {
	public readonly activeDelegates: number;
	public readonly preVoteThreshold: number;
	public readonly preCommitThreshold: number;
	public readonly processingThreshold: number;
	public readonly maxHeaders: number;

	public finalizedHeight: number;
	public chainMaxHeightPrevoted: number;

	private readonly _dpos: DPoS;

	public constructor({
		dpos,
		finalizedHeight,
		activeDelegates,
	}: {
		readonly dpos: DPoS;
		readonly finalizedHeight: number;
		readonly activeDelegates: number;
	}) {
		super();
		assert(activeDelegates > 0, 'Must provide a positive activeDelegates');

		this._dpos = dpos;

		// Set constants
		this.activeDelegates = activeDelegates;

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
	}

	public async addBlockHeader(
		blockHeader: BlockHeader,
		stateStore: StateStore,
	): Promise<FinalityManager> {
		debug('addBlockHeader invoked');
		debug('validateBlockHeader invoked');
		const { lastBlockHeaders } = stateStore.consensus;

		// Verify the integrity of the header with chain
		this.verifyBlockHeaders(blockHeader, lastBlockHeaders);

		// Update the pre-votes and pre-commits
		await this.updatePreVotesPreCommits(
			blockHeader,
			stateStore,
			lastBlockHeaders,
		);

		// Update the pre-voted confirmed and finalized height
		await this.updatePreVotedAndFinalizedHeight(stateStore);

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

		// If the block is in the bootstrap period, it does not have vote weight
		if (this._dpos.isBootstrapPeriod(header.height)) {
			return false;
		}

		// If delegate forged a block with higher or same height previously
		// That means he is forging on other chain and we don't count any
		// Pre-votes and pre-commits from him
		if (header.asset.maxHeightPreviouslyForged >= header.height) {
			return false;
		}

		// Get delegate public key
		const { generatorPublicKey: delegatePublicKey } = header;
		const delegateAddress = getAddressFromPublicKey(delegatePublicKey);

		const isStandby = await this._dpos.isStandbyDelegate(
			delegateAddress,
			header.height,
			stateStore,
		);

		if (isStandby) {
			return false;
		}

		const votingLedger = await this._getVotingLedger(stateStore);
		const { delegates: delegatesMap, ledger: ledgerMap } = votingLedger;

		// Load or initialize delegate state in reference to current BlockHeaderManager block headers
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const delegateState = delegatesMap.get(delegateAddress) ?? {
			maxPreVoteHeight: 0,
			maxPreCommitHeight: 0,
		};

		const minValidHeightToPreCommit = this._getMinValidHeightToPreCommit(
			header,
			bftBlockHeaders,
		);

		const delegateMinHeightActive = await this._dpos.getMinActiveHeight(
			header.height,
			delegateAddress,
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

		for (let j = minPreCommitHeight; j <= maxPreCommitHeight; j += 1) {
			// Add pre-commit if threshold is reached

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			const ledgerState = ledgerMap[j] || {
				preVotes: 0,
				preCommits: 0,
			};

			if (ledgerState.preVotes >= this.preVoteThreshold) {
				// Increase the pre-commit for particular height
				ledgerState.preCommits += 1;

				// Keep track of the last pre-commit point
				delegateState.maxPreCommitHeight = j;

				// Update ledger and delegates map
				ledgerMap[j] = ledgerState;
				delegatesMap.set(delegateAddress, delegateState);
			}
		}

		// Check between height of first block of the round when delegate was active
		// Or one step ahead where it forged the last block
		// Or one step ahead where it left the last pre-vote
		// Or maximum 3 rounds backward
		const minPreVoteHeight = Math.max(
			delegateMinHeightActive,
			header.asset.maxHeightPreviouslyForged + 1,
			// This is not written on LIP // delegateState.maxPreVoteHeight + 1,
			header.height - this.processingThreshold,
		);

		// Pre-vote upto current block height
		const maxPreVoteHeight = header.height;

		for (let j = minPreVoteHeight; j <= maxPreVoteHeight; j += 1) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			const ledgerState = ledgerMap[j] || {
				preVotes: 0,
				preCommits: 0,
			};

			ledgerState.preVotes += 1;

			// Update ledger map
			ledgerMap[j] = ledgerState;
		}

		// Update delegate state
		delegateState.maxPreVoteHeight = maxPreVoteHeight;
		delegatesMap.set(delegateAddress, delegateState);

		// Remove ledger beyond maxHeaders size
		Object.keys(ledgerMap)
			.slice(0, this.maxHeaders * -1)
			.forEach(key => {
				delete ledgerMap[key];
			});

		// Update state to save the bft votes
		this._setVotingLedger(stateStore, {
			delegates: delegatesMap,
			ledger: ledgerMap,
		});

		return true;
	}

	public async updatePreVotedAndFinalizedHeight(
		stateStore: StateStore,
	): Promise<boolean> {
		debug('updatePreVotedAndFinalizedHeight invoked');

		const { ledger } = await this._getVotingLedger(stateStore);

		const highestHeightPreVoted = Object.keys(ledger)
			.reverse()
			.find(key => ledger[key].preVotes >= this.preVoteThreshold);

		this.chainMaxHeightPrevoted = highestHeightPreVoted
			? parseInt(highestHeightPreVoted, 10)
			: this.chainMaxHeightPrevoted;

		const highestHeightPreCommitted = Object.keys(ledger)
			.reverse()
			.find(key => ledger[key].preCommits >= this.preCommitThreshold);

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

	public reset(): void {
		this.chainMaxHeightPrevoted = 0;
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
			blockHeader.asset.maxHeightPrevoted !== this.chainMaxHeightPrevoted
		) {
			throw new BFTInvalidAttributeError(
				`Wrong maxHeightPrevoted in blockHeader. maxHeightPrevoted: ${blockHeader.asset.maxHeightPrevoted}, : ${this.chainMaxHeightPrevoted}`,
			);
		}

		// Find top most block forged by same delegate
		const delegateLastBlock = bftBlockHeaders.find(header =>
			header.generatorPublicKey.equals(blockHeader.generatorPublicKey),
		);

		if (!delegateLastBlock) {
			return true;
		}

		// Order the two block headers such that earlierBlock must be forged first
		let earlierBlock = delegateLastBlock;
		let laterBlock = blockHeader;
		const higherMaxHeightPreviouslyForged =
			earlierBlock.asset.maxHeightPreviouslyForged >
			laterBlock.asset.maxHeightPreviouslyForged;
		const sameMaxHeightPreviouslyForged =
			earlierBlock.asset.maxHeightPreviouslyForged ===
			laterBlock.asset.maxHeightPreviouslyForged;
		const higherMaxHeightPrevoted =
			earlierBlock.asset.maxHeightPrevoted > laterBlock.asset.maxHeightPrevoted;
		const sameMaxHeightPrevoted =
			earlierBlock.asset.maxHeightPrevoted ===
			laterBlock.asset.maxHeightPrevoted;
		const higherHeight = earlierBlock.height > laterBlock.height;
		if (
			higherMaxHeightPreviouslyForged ||
			(sameMaxHeightPreviouslyForged && higherMaxHeightPrevoted) ||
			(sameMaxHeightPreviouslyForged && sameMaxHeightPrevoted && higherHeight)
		) {
			[earlierBlock, laterBlock] = [laterBlock, earlierBlock];
		}

		if (
			earlierBlock.asset.maxHeightPrevoted ===
				laterBlock.asset.maxHeightPrevoted &&
			earlierBlock.height >= laterBlock.height
		) {
			/* Violation of the fork choice rule as delegate moved to different chain
			 without strictly larger maxHeightPreviouslyForged or larger height as
			 justification. This in particular happens, if a delegate is double forging. */
			throw new BFTForkChoiceRuleError();
		}

		if (earlierBlock.height > laterBlock.asset.maxHeightPreviouslyForged) {
			throw new BFTChainDisjointError();
		}

		if (
			earlierBlock.asset.maxHeightPrevoted > laterBlock.asset.maxHeightPrevoted
		) {
			throw new BFTLowerChainBranchError();
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
		let needleHeight = Math.max(
			header.asset.maxHeightPreviouslyForged,
			header.height - this.processingThreshold,
		);
		/* We should search down to the height we have in our headers list
			and within the processing threshold which is three rounds	*/
		const searchTillHeight = Math.max(
			1,
			header.height - this.processingThreshold,
		);
		// Hold reference for the previously forged height
		let previousBlockHeight = header.asset.maxHeightPreviouslyForged;

		const blocksIncludingCurrent = [header, ...bftApplicableBlocks];
		while (needleHeight >= searchTillHeight) {
			// We need to ensure that the delegate forging header did not forge on any other chain, i.e.,
			// MaxHeightPreviouslyForged always refers to a height with a block forged by the same delegate.
			if (needleHeight === previousBlockHeight) {
				const previousBlockHeader = blocksIncludingCurrent.find(
					// eslint-disable-next-line no-loop-func
					bftHeader => bftHeader.height === needleHeight,
				);
				if (!previousBlockHeader) {
					// If the height is not in the cache, it should not be considered
					debug('Fail to get cached block header');

					return 0;
				}
				if (
					!previousBlockHeader.generatorPublicKey.equals(
						header.generatorPublicKey,
					) ||
					previousBlockHeader.asset.maxHeightPreviouslyForged >= needleHeight
				) {
					return needleHeight + 1;
				}
				previousBlockHeight =
					previousBlockHeader.asset.maxHeightPreviouslyForged;
				needleHeight = previousBlockHeader.asset.maxHeightPreviouslyForged;
			} else {
				needleHeight -= 1;
			}
		}

		return Math.max(needleHeight + 1, searchTillHeight);
	}

	// eslint-disable-next-line class-methods-use-this
	private async _getVotingLedger(
		stateStore: StateStore,
	): Promise<VotingLedgerMap> {
		const votingLedgerBuffer = await stateStore.consensus.get(
			CONSENSUS_STATE_DELEGATE_LEDGER_KEY,
		);

		const votingLedger =
			votingLedgerBuffer === undefined
				? {
						ledger: [],
						delegates: [],
				  }
				: codec.decode<VotingLedger>(
						BFTVotingLedgerSchema,
						(votingLedgerBuffer as unknown) as Buffer,
				  );

		const ledger = votingLedger.ledger.reduce((prev: LedgerMap, curr) => {
			// eslint-disable-next-line no-param-reassign
			prev[curr.height] = {
				preVotes: curr.preVotes,
				preCommits: curr.preCommits,
			};

			return prev;
		}, {});

		const delegates = votingLedger.delegates.reduce(
			(prev: BufferMap<DelegateState>, curr) => {
				prev.set(curr.address, {
					maxPreVoteHeight: curr.maxPreVoteHeight,
					maxPreCommitHeight: curr.maxPreCommitHeight,
				});
				return prev;
			},
			new BufferMap<DelegatesState>(),
		);

		return { ledger, delegates };
	}

	// eslint-disable-next-line class-methods-use-this
	private _setVotingLedger(
		stateStore: StateStore,
		votingLedgerMap: VotingLedgerMap,
	): void {
		const ledgerState = [];
		for (const height of Object.keys(votingLedgerMap.ledger)) {
			const intHeight = parseInt(height, 10);
			ledgerState.push({
				height: intHeight,
				...votingLedgerMap.ledger[intHeight],
			});
		}

		const delegatesState = [];
		for (const [key, value] of votingLedgerMap.delegates.entries()) {
			delegatesState.push({
				address: key,
				...value,
			});
		}

		stateStore.consensus.set(
			CONSENSUS_STATE_DELEGATE_LEDGER_KEY,
			codec.encode(BFTVotingLedgerSchema, {
				delegates: delegatesState,
				ledger: ledgerState,
			}),
		);
	}
}
