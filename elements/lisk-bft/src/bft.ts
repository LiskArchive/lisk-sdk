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
import { EventEmitter } from 'events';

import { BFT_MIGRATION_ROUND_OFFSET } from './constant';
import {
	EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
	FinalityManager,
} from './finality_manager';
import * as forkChoiceRule from './fork_choice_rule';
import { BlockHeader, Chain, DPoS, ForkStatus, StateStore } from './types';
import { validateBlockHeader } from './utils';

export const CHAIN_STATE_FINALIZED_HEIGHT_KEY = 'BFT.finalizedHeight';
export const EVENT_BFT_BLOCK_FINALIZED = 'EVENT_BFT_BLOCK_FINALIZED';

/**
 * BFT class responsible to hold integration logic for finality manager with the framework
 */
export class BFT extends EventEmitter {
	private _finalityManager?: FinalityManager;
	private readonly _chain: Chain;
	private readonly _dpos: DPoS;
	public readonly constants: {
		activeDelegates: number;
		startingHeight: number;
	};

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
		const lastBlock = await this._chain.dataAccess.getLastBlockHeader();
		await this.finalityManager.recompute(lastBlock.height, stateStore);
	}

	// tslint:disable-next-line prefer-function-over-method
	public serialize(blockInstance: BlockHeader): BlockHeader {
		return {
			...blockInstance,
			maxHeightPreviouslyForged: blockInstance.maxHeightPreviouslyForged || 0,
			maxHeightPrevoted: blockInstance.maxHeightPrevoted || 0,
		};
	}

	public get finalityManager(): FinalityManager {
		return this._finalityManager as FinalityManager;
	}

	public async deleteBlocks(
		blocks: ReadonlyArray<BlockHeader>,
		stateStore: StateStore,
	): Promise<void> {
		assert(blocks, 'Must provide blocks which are deleted');
		assert(Array.isArray(blocks), 'Must provide list of blocks');

		// We need only height to delete the blocks
		// But for future extension we accept full blocks in BFT
		// We may need to utilize some other attributes for internal processing
		const blockHeights = blocks.map(({ height }) => height);

		assert(
			!blockHeights.some(h => h <= this.finalityManager.finalizedHeight),
			'Can not delete block below or same as finalized height',
		);

		const minimumHeight = Math.min(...blockHeights);

		await this.finalityManager.recompute(minimumHeight - 1, stateStore);
	}

	public async addNewBlock(
		block: BlockHeader,
		stateStore: StateStore,
	): Promise<void> {
		await this.finalityManager.addBlockHeader(block, stateStore);
		const { finalizedHeight } = this.finalityManager;

		stateStore.chainState.set(
			CHAIN_STATE_FINALIZED_HEIGHT_KEY,
			String(finalizedHeight),
		);
	}

	public async verifyNewBlock(blockHeader: BlockHeader): Promise<boolean> {
		const bftHeaders = await this.finalityManager.getBFTApplicableBlockHeaders(
			blockHeader.height - 1,
		);

		return this.finalityManager.verifyBlockHeaders(blockHeader, bftHeaders);
	}

	public forkChoice(block: BlockHeader, lastBlock: BlockHeader): ForkStatus {
		// Current time since Lisk Epoch
		const receivedBlock = {
			...block,
			receivedAt: this._chain.slots.getEpochTime(),
		};

		/* Cases are numbered following LIP-0014 Fork choice rule.
		 See: https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#applying-blocks-according-to-fork-choice-rule
			 Case 2 and 1 have flipped execution order for better readability. Behavior is still the same */

		if (forkChoiceRule.isValidBlock(lastBlock, receivedBlock)) {
			// Case 2: correct block received
			return ForkStatus.VALID_BLOCK;
		}

		if (forkChoiceRule.isIdenticalBlock(lastBlock, receivedBlock)) {
			// Case 1: same block received twice
			return ForkStatus.IDENTICAL_BLOCK;
		}

		if (forkChoiceRule.isDoubleForging(lastBlock, receivedBlock)) {
			// Delegates are the same
			// Case 3: double forging different blocks in the same slot.
			// Last Block stands.
			return ForkStatus.DOUBLE_FORGING;
		}

		if (
			forkChoiceRule.isTieBreak({
				slots: this._chain.slots,
				lastAppliedBlock: lastBlock,
				receivedBlock,
			})
		) {
			// Two competing blocks by different delegates at the same height.
			// Case 4: Tie break
			return ForkStatus.TIE_BREAK;
		}

		if (forkChoiceRule.isDifferentChain(lastBlock, receivedBlock)) {
			// Case 5: received block has priority. Move to a different chain.
			return ForkStatus.DIFFERENT_CHAIN;
		}

		// Discard newly received block
		return ForkStatus.DISCARD;
	}

	private async _initFinalityManager(
		stateStore: StateStore,
	): Promise<FinalityManager> {
		// Check what finalized height was stored last time
		const storedFinalizedHeight = await stateStore.chainState.get(
			CHAIN_STATE_FINALIZED_HEIGHT_KEY,
		);
		const finalizedHeightStored = storedFinalizedHeight
			? parseInt(storedFinalizedHeight, 10)
			: 1;

		/* Check BFT migration height
		 https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#backwards-compatibility */
		const bftMigrationHeight =
			this.constants.startingHeight -
			this.constants.activeDelegates * BFT_MIGRATION_ROUND_OFFSET;

		// Choose max between stored finalized height or migration height
		const finalizedHeight = Math.max(finalizedHeightStored, bftMigrationHeight);

		// Initialize consensus manager
		return new FinalityManager({
			chain: this._chain,
			dpos: this._dpos,
			finalizedHeight,
			activeDelegates: this.constants.activeDelegates,
		});
	}

	public async isBFTProtocolCompliant(
		blockHeader: BlockHeader,
	): Promise<boolean> {
		assert(blockHeader, 'No block was provided to be verified');

		const roundsThreshold = 3;
		const heightThreshold = this.constants.activeDelegates * roundsThreshold;

		// Special case to avoid reducing the reward of delegates forging for the first time before the `heightThreshold` height
		if (blockHeader.maxHeightPreviouslyForged === 0) {
			return true;
		}

		const bftHeaders = await this.finalityManager.getBFTApplicableBlockHeaders(
			blockHeader.height - 1,
		);

		const maxHeightPreviouslyForgedBlock = bftHeaders.find(
			bftHeader => bftHeader.height === blockHeader.maxHeightPreviouslyForged,
		);

		if (
			!maxHeightPreviouslyForgedBlock ||
			blockHeader.maxHeightPreviouslyForged >= blockHeader.height ||
			(blockHeader.height - blockHeader.maxHeightPreviouslyForged <=
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

	// tslint:disable-next-line prefer-function-over-method
	public validateBlock(block: BlockHeader): void {
		validateBlockHeader(block);
	}
}
