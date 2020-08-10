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
import { BlockHeader, Chain, getValidators } from '@liskhq/lisk-chain';
import * as assert from 'assert';
import * as Debug from 'debug';
import { EventEmitter } from 'events';
import { dataStructures } from '@liskhq/lisk-utils';
import { BFT_ROUND_THRESHOLD } from './constant';
import {
	StateStore,
	BFTChainDisjointError,
	BFTForkChoiceRuleError,
	BFTInvalidAttributeError,
	BFTLowerChainBranchError,
} from './types';

// eslint-disable-next-line new-cap
const debug = Debug('lisk:bft:consensus_manager');

export const EVENT_BFT_FINALIZED_HEIGHT_CHANGED = 'EVENT_BFT_FINALIZED_HEIGHT_CHANGED';
export const CONSENSUS_STATE_VALIDATOR_LEDGER_KEY = 'bft:votingLedger';

export const BFTVotingLedgerSchema = {
	type: 'object',
	$id: '/bft/validators',
	title: 'Lisk BFT Validator ledger',
	required: ['validators', 'ledger'],
	properties: {
		validators: {
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

interface ValidatorsState {
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

interface ValidatorState {
	maxPreVoteHeight: number;
	maxPreCommitHeight: number;
}

interface VotingLedgerMap {
	readonly validators: dataStructures.BufferMap<ValidatorState>;
	readonly ledger: LedgerMap;
}

export interface VotingLedger {
	readonly validators: ValidatorsState[];
	readonly ledger: LedgerState[];
}

export class FinalityManager extends EventEmitter {
	public readonly preVoteThreshold: number;
	public readonly preCommitThreshold: number;
	public readonly processingThreshold: number;
	public readonly maxHeaders: number;

	public finalizedHeight: number;
	private readonly _chain: Chain;

	public constructor({
		chain,
		finalizedHeight,
		threshold,
	}: {
		readonly chain: Chain;
		readonly finalizedHeight: number;
		readonly threshold: number;
	}) {
		super();
		assert(threshold > 0, 'Must provide a positive threshold');

		this._chain = chain;

		// Threshold to consider a block pre-voted
		this.preVoteThreshold = threshold;

		// Threshold to consider a block pre-committed (or finalized)
		this.preCommitThreshold = threshold;

		if (this._chain.numberOfValidators <= 0) {
			throw new Error('Invalid number of validators for BFT property');
		}

		// Limit for blocks to make perform verification or pre-vote/pre-commit (1 block less than 3 rounds)
		this.processingThreshold = this._chain.numberOfValidators * BFT_ROUND_THRESHOLD - 1;

		// Maximum headers to store (5 rounds)
		this.maxHeaders = this._chain.numberOfValidators * 5;

		// Height up to which blocks are finalized
		this.finalizedHeight = finalizedHeight;
	}

	public async addBlockHeader(
		blockHeader: BlockHeader,
		stateStore: StateStore,
	): Promise<FinalityManager> {
		debug('addBlockHeader invoked');
		debug('validateBlockHeader invoked');
		const { lastBlockHeaders } = stateStore.chain;

		// Verify the integrity of the header with chain
		await this.verifyBlockHeaders(blockHeader, stateStore);

		// Update the pre-votes and pre-commits
		await this.updatePreVotesPreCommits(blockHeader, stateStore, lastBlockHeaders);

		// Update the pre-voted confirmed and finalized height
		await this.updateFinalizedHeight(stateStore);

		debug('after adding block header', {
			finalizedHeight: this.finalizedHeight,
		});

		return this;
	}

	public async updatePreVotesPreCommits(
		header: BlockHeader,
		stateStore: StateStore,
		bftBlockHeaders: ReadonlyArray<BlockHeader>,
	): Promise<boolean> {
		debug('updatePreVotesPreCommits invoked');
		// If validator forged a block with higher or same height previously
		// That means he is forging on other chain and we don't count any
		// Pre-votes and pre-commits from him
		if (header.asset.maxHeightPreviouslyForged >= header.height) {
			return false;
		}
		// Get validator public key
		const { generatorPublicKey } = header;
		const generatorAddress = getAddressFromPublicKey(generatorPublicKey);
		const validators = await getValidators(stateStore);
		const validator = validators.find(v => v.address.equals(generatorAddress));
		if (!validator) {
			throw new Error(
				`Generator ${generatorPublicKey.toString('base64')} is not in validators set`,
			);
		}

		// If validator cannot vote, it cannot vote on the block
		if (!validator.isConsensusParticipant) {
			return false;
		}

		const votingLedger = await this._getVotingLedger(stateStore);
		const { validators: validatorsMap, ledger: ledgerMap } = votingLedger;

		// Load or initialize validator state in reference to current BlockHeaderManager block headers
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const validatorState = validatorsMap.get(generatorAddress) ?? {
			maxPreVoteHeight: 0,
			maxPreCommitHeight: 0,
		};

		const minValidHeightToPreCommit = this._getMinValidHeightToPreCommit(header, bftBlockHeaders);

		const validatorMinHeightActive = validator.minActiveHeight;

		// If validator is new then first block of the round will be considered
		// If it forged before then we probably have the last commit height
		// Validator can't pre-commit a block before the above mentioned conditions
		const minPreCommitHeight = Math.max(
			header.height - this.processingThreshold,
			validatorMinHeightActive,
			minValidHeightToPreCommit,
			validatorState.maxPreCommitHeight + 1,
		);

		// Validator can't pre-commit the blocks on tip of the chain
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
				validatorState.maxPreCommitHeight = j;

				// Update ledger and validators map
				ledgerMap[j] = ledgerState;
				validatorsMap.set(generatorAddress, validatorState);
			}
		}

		// Check between height of first block of the round when validator was active
		// Or one step ahead where it forged the last block
		// Or one step ahead where it left the last pre-vote
		// Or maximum 3 rounds backward
		const minPreVoteHeight = Math.max(
			validatorMinHeightActive,
			header.asset.maxHeightPreviouslyForged + 1,
			// This is not written on LIP // validatorState.maxPreVoteHeight + 1,
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

		// Update validator state
		validatorState.maxPreVoteHeight = maxPreVoteHeight;
		validatorsMap.set(generatorAddress, validatorState);

		// Remove ledger beyond maxHeaders size
		Object.keys(ledgerMap)
			.slice(0, this.maxHeaders * -1)
			.forEach(key => {
				delete ledgerMap[key];
			});

		// Update state to save the bft votes
		this._setVotingLedger(stateStore, {
			validators: validatorsMap,
			ledger: ledgerMap,
		});

		return true;
	}

	public async updateFinalizedHeight(stateStore: StateStore): Promise<boolean> {
		debug('updatePreVotedAndFinalizedHeight invoked');

		const { ledger } = await this._getVotingLedger(stateStore);

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

	public async verifyBlockHeaders(
		blockHeader: BlockHeader,
		stateStore: StateStore,
	): Promise<boolean> {
		debug('verifyBlockHeaders invoked');
		debug(blockHeader);

		const bftBlockHeaders = stateStore.chain.lastBlockHeaders;
		const { ledger } = await this._getVotingLedger(stateStore);
		const { preVoted: chainMaxHeightPrevoted } = this._getChainMaxHeightStatus(ledger);
		// We need minimum processingThreshold to decide
		// If maxHeightPrevoted is correct
		if (
			bftBlockHeaders.length >= this.processingThreshold &&
			blockHeader.asset.maxHeightPrevoted !== chainMaxHeightPrevoted
		) {
			throw new BFTInvalidAttributeError(
				`Wrong maxHeightPrevoted in blockHeader. maxHeightPrevoted: ${blockHeader.asset.maxHeightPrevoted}, : ${chainMaxHeightPrevoted}`,
			);
		}

		// Find top most block forged by same validator
		const validatorLastBlock = bftBlockHeaders.find(header =>
			header.generatorPublicKey.equals(blockHeader.generatorPublicKey),
		);

		if (!validatorLastBlock) {
			return true;
		}

		// Order the two block headers such that earlierBlock must be forged first
		let earlierBlock = validatorLastBlock;
		let laterBlock = blockHeader;
		const higherMaxHeightPreviouslyForged =
			earlierBlock.asset.maxHeightPreviouslyForged > laterBlock.asset.maxHeightPreviouslyForged;
		const sameMaxHeightPreviouslyForged =
			earlierBlock.asset.maxHeightPreviouslyForged === laterBlock.asset.maxHeightPreviouslyForged;
		const higherMaxHeightPrevoted =
			earlierBlock.asset.maxHeightPrevoted > laterBlock.asset.maxHeightPrevoted;
		const sameMaxHeightPrevoted =
			earlierBlock.asset.maxHeightPrevoted === laterBlock.asset.maxHeightPrevoted;
		const higherHeight = earlierBlock.height > laterBlock.height;
		if (
			higherMaxHeightPreviouslyForged ||
			(sameMaxHeightPreviouslyForged && higherMaxHeightPrevoted) ||
			(sameMaxHeightPreviouslyForged && sameMaxHeightPrevoted && higherHeight)
		) {
			[earlierBlock, laterBlock] = [laterBlock, earlierBlock];
		}

		if (
			earlierBlock.asset.maxHeightPrevoted === laterBlock.asset.maxHeightPrevoted &&
			earlierBlock.height >= laterBlock.height
		) {
			/* Violation of the fork choice rule as validator moved to different chain
			 without strictly larger maxHeightPreviouslyForged or larger height as
			 justification. This in particular happens, if a validator is double forging. */
			throw new BFTForkChoiceRuleError();
		}

		if (earlierBlock.height > laterBlock.asset.maxHeightPreviouslyForged) {
			throw new BFTChainDisjointError();
		}

		if (earlierBlock.asset.maxHeightPrevoted > laterBlock.asset.maxHeightPrevoted) {
			throw new BFTLowerChainBranchError();
		}

		return true;
	}

	public async getMaxHeightPrevoted(): Promise<number> {
		const bftState = await this._chain.dataAccess.getConsensusState(
			CONSENSUS_STATE_VALIDATOR_LEDGER_KEY,
		);
		const { ledger } = this._decodeVotingLedger(bftState);
		const { preVoted } = this._getChainMaxHeightStatus(ledger);

		return preVoted;
	}

	private _getChainMaxHeightStatus(ledger: LedgerMap): { preVoted: number; preComitted: number } {
		debug('updatePreVotedAndFinalizedHeight invoked');

		const highestHeightPreVoted = Object.keys(ledger)
			.reverse()
			.find(key => ledger[key].preVotes >= this.preVoteThreshold);

		const preVoted = highestHeightPreVoted ? parseInt(highestHeightPreVoted, 10) : 0;

		const highestHeightPreComitted = Object.keys(ledger)
			.reverse()
			.find(key => ledger[key].preCommits >= this.preCommitThreshold);

		const preComitted = highestHeightPreComitted ? parseInt(highestHeightPreComitted, 10) : 0;

		return { preVoted, preComitted };
	}

	/**
	 * Get the min height from which a validator can make pre-commits
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
		const searchTillHeight = Math.max(1, header.height - this.processingThreshold);
		// Hold reference for the previously forged height
		let previousBlockHeight = header.asset.maxHeightPreviouslyForged;

		const blocksIncludingCurrent = [header, ...bftApplicableBlocks];
		while (needleHeight >= searchTillHeight) {
			// We need to ensure that the validator forging header did not forge on any other chain, i.e.,
			// MaxHeightPreviouslyForged always refers to a height with a block forged by the same validator.
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
					!previousBlockHeader.generatorPublicKey.equals(header.generatorPublicKey) ||
					previousBlockHeader.asset.maxHeightPreviouslyForged >= needleHeight
				) {
					return needleHeight + 1;
				}
				previousBlockHeight = previousBlockHeader.asset.maxHeightPreviouslyForged;
				needleHeight = previousBlockHeader.asset.maxHeightPreviouslyForged;
			} else {
				needleHeight -= 1;
			}
		}

		return Math.max(needleHeight + 1, searchTillHeight);
	}

	// eslint-disable-next-line class-methods-use-this
	private async _getVotingLedger(stateStore: StateStore): Promise<VotingLedgerMap> {
		const votingLedgerBuffer = await stateStore.consensus.get(CONSENSUS_STATE_VALIDATOR_LEDGER_KEY);
		return this._decodeVotingLedger(votingLedgerBuffer);
	}

	// eslint-disable-next-line class-methods-use-this
	private _decodeVotingLedger(bftVotingLedgerBuffer: Buffer | undefined): VotingLedgerMap {
		const votingLedger =
			bftVotingLedgerBuffer === undefined
				? {
						ledger: [],
						validators: [],
				  }
				: codec.decode<VotingLedger>(BFTVotingLedgerSchema, bftVotingLedgerBuffer);

		const ledger = votingLedger.ledger.reduce((prev: LedgerMap, curr) => {
			// eslint-disable-next-line no-param-reassign
			prev[curr.height] = {
				preVotes: curr.preVotes,
				preCommits: curr.preCommits,
			};

			return prev;
		}, {});

		const validators = votingLedger.validators.reduce(
			(prev: dataStructures.BufferMap<ValidatorState>, curr) => {
				prev.set(curr.address, {
					maxPreVoteHeight: curr.maxPreVoteHeight,
					maxPreCommitHeight: curr.maxPreCommitHeight,
				});
				return prev;
			},
			new dataStructures.BufferMap<ValidatorsState>(),
		);

		return { ledger, validators };
	}

	// eslint-disable-next-line class-methods-use-this
	private _setVotingLedger(stateStore: StateStore, votingLedgerMap: VotingLedgerMap): void {
		const ledgerState = [];
		for (const height of Object.keys(votingLedgerMap.ledger)) {
			const intHeight = parseInt(height, 10);
			ledgerState.push({
				height: intHeight,
				...votingLedgerMap.ledger[intHeight],
			});
		}

		const validatorsState = [];
		for (const [key, value] of votingLedgerMap.validators.entries()) {
			validatorsState.push({
				address: key,
				...value,
			});
		}

		stateStore.consensus.set(
			CONSENSUS_STATE_VALIDATOR_LEDGER_KEY,
			codec.encode(BFTVotingLedgerSchema, {
				validators: validatorsState,
				ledger: ledgerState,
			}),
		);
	}
}
