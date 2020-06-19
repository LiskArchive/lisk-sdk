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
import * as assert from 'assert';
import { EventEmitter } from 'events';

import { BFT_MIGRATION_ROUND_OFFSET } from './constant';
import {
	EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
	FinalityManager,
} from './finality_manager';
import * as forkChoiceRule from './fork_choice_rule';
import {
	BFTPersistedValues,
	BlockHeader,
	Chain,
	DPoS,
	ForkStatus,
	StateStore,
} from './types';

export const CONSENSUS_STATE_FINALIZED_HEIGHT_KEY = 'finalizedHeight';
export const EVENT_BFT_BLOCK_FINALIZED = 'EVENT_BFT_BLOCK_FINALIZED';

export const BFTFinalizedHeightCodecSchema = {
	type: 'object',
	$id: '/BFT/FinalizedHeight',
	title: 'Lisk BFT Finalized Height',
	properties: {
		finalizedHeight: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
	required: ['finalizedHeight'],
};

codec.addSchema(BFTFinalizedHeightCodecSchema);

/**
 * BFT class responsible to hold integration logic for finality manager with the framework
 */
export class BFT extends EventEmitter {
	public readonly constants: {
		activeDelegates: number;
		startingHeight: number;
	};

	private _finalityManager?: FinalityManager;
	private readonly _chain: Chain;
	private readonly _dpos: DPoS;

	public constructor({
		chain,
		dpos,
		activeDelegates,
		startingHeight,
	}: {
		readonly chain: Chain;
		readonly dpos: DPoS;
		readonly activeDelegates: number;
		readonly startingHeight: number;
	}) {
		super();
		this._chain = chain;
		this._dpos = dpos;
		this.constants = {
			activeDelegates,
			startingHeight,
		};
	}

	public async init(stateStore: StateStore): Promise<void> {
		this._finalityManager = await this._initFinalityManager(stateStore);

		this.finalityManager.on(
			EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
			updatedFinalizedHeight => {
				this.emit(EVENT_BFT_FINALIZED_HEIGHT_CHANGED, updatedFinalizedHeight);
			},
		);
	}

	public get finalityManager(): FinalityManager {
		return this._finalityManager as FinalityManager;
	}

	public async addNewBlock(
		block: BlockHeader,
		stateStore: StateStore,
	): Promise<void> {
		await this.finalityManager.addBlockHeader(block, stateStore);
		const { finalizedHeight } = this.finalityManager;

		stateStore.consensus.set(
			CONSENSUS_STATE_FINALIZED_HEIGHT_KEY,
			codec.encode(BFTFinalizedHeightCodecSchema, { finalizedHeight }),
		);
	}

	public verifyNewBlock(
		blockHeader: BlockHeader,
		stateStore: StateStore,
	): boolean {
		return this.finalityManager.verifyBlockHeaders(
			blockHeader,
			stateStore.consensus.lastBlockHeaders,
		);
	}

	public forkChoice(
		blockHeader: BlockHeader,
		lastBlockHeader: BlockHeader,
	): ForkStatus {
		// Current time since Lisk Epoch
		const receivedBlock = {
			...blockHeader,
			receivedAt: this._chain.slots.timeSinceGenesis(),
		};

		/* Cases are numbered following LIP-0014 Fork choice rule.
		 See: https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#applying-blocks-according-to-fork-choice-rule
			 Case 2 and 1 have flipped execution order for better readability. Behavior is still the same */

		if (forkChoiceRule.isValidBlock(lastBlockHeader, receivedBlock)) {
			// Case 2: correct block received
			return ForkStatus.VALID_BLOCK;
		}

		if (forkChoiceRule.isIdenticalBlock(lastBlockHeader, receivedBlock)) {
			// Case 1: same block received twice
			return ForkStatus.IDENTICAL_BLOCK;
		}

		if (forkChoiceRule.isDoubleForging(lastBlockHeader, receivedBlock)) {
			// Delegates are the same
			// Case 3: double forging different blocks in the same slot.
			// Last Block stands.
			return ForkStatus.DOUBLE_FORGING;
		}

		if (
			forkChoiceRule.isTieBreak({
				slots: this._chain.slots,
				lastAppliedBlock: lastBlockHeader,
				receivedBlock,
			})
		) {
			// Two competing blocks by different delegates at the same height.
			// Case 4: Tie break
			return ForkStatus.TIE_BREAK;
		}

		if (forkChoiceRule.isDifferentChain(lastBlockHeader, receivedBlock)) {
			// Case 5: received block has priority. Move to a different chain.
			return ForkStatus.DIFFERENT_CHAIN;
		}

		// Discard newly received block
		return ForkStatus.DISCARD;
	}

	public isBFTProtocolCompliant(
		blockHeader: BlockHeader,
		stateStore: StateStore,
	): boolean {
		assert(blockHeader, 'No block was provided to be verified');

		const roundsThreshold = 3;
		const heightThreshold = this.constants.activeDelegates * roundsThreshold;

		// Special case to avoid reducing the reward of delegates forging for the first time before the `heightThreshold` height
		if (blockHeader.asset.maxHeightPreviouslyForged === 0) {
			return true;
		}

		const maxHeightPreviouslyForgedBlock = stateStore.consensus.lastBlockHeaders.find(
			bftHeader =>
				bftHeader.height === blockHeader.asset.maxHeightPreviouslyForged,
		);

		if (
			!maxHeightPreviouslyForgedBlock ||
			blockHeader.asset.maxHeightPreviouslyForged >= blockHeader.height ||
			(blockHeader.height - blockHeader.asset.maxHeightPreviouslyForged <=
				heightThreshold &&
				blockHeader.generatorPublicKey !==
					maxHeightPreviouslyForgedBlock.generatorPublicKey)
		) {
			return false;
		}

		return true;
	}

	public get finalizedHeight(): number {
		return this.finalityManager.finalizedHeight;
	}

	public get maxHeightPrevoted(): number {
		return this.finalityManager.chainMaxHeightPrevoted;
	}

	public reset(): void {
		this.finalityManager.reset();
	}

	private async _initFinalityManager(
		stateStore: StateStore,
	): Promise<FinalityManager> {
		// Check what finalized height was stored last time
		const storedFinalizedHeightBuffer = await stateStore.consensus.get(
			CONSENSUS_STATE_FINALIZED_HEIGHT_KEY,
		);

		const finalizedHeightStored =
			storedFinalizedHeightBuffer === undefined
				? 1
				: codec.decode<BFTPersistedValues>(
						BFTFinalizedHeightCodecSchema,
						storedFinalizedHeightBuffer,
				  ).finalizedHeight;

		/* Check BFT migration height
		 https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#backwards-compatibility */
		const bftMigrationHeight =
			this.constants.startingHeight -
			this.constants.activeDelegates * BFT_MIGRATION_ROUND_OFFSET;

		// Choose max between stored finalized height or migration height
		const finalizedHeight = Math.max(finalizedHeightStored, bftMigrationHeight);

		// Initialize consensus manager
		return new FinalityManager({
			dpos: this._dpos,
			finalizedHeight,
			activeDelegates: this.constants.activeDelegates,
		});
	}
}
