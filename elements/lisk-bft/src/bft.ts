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

import {
	EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
	FinalityManager,
} from './finality_manager';
import * as forkChoiceRule from './fork_choice_rule';
import {
	Block,
	BlockEntity,
	BlockHeader,
	ForkStatus,
	HeightOfDelegates,
	Slots,
	StateStore,
	Storage,
} from './types';

export const CHAIN_STATE_FINALIZED_HEIGHT_KEY = 'BFT.finalizedHeight';
export const EVENT_BFT_BLOCK_FINALIZED = 'EVENT_BFT_BLOCK_FINALIZED';

export const extractBFTBlockHeaderFromBlock = (block: Block): BlockHeader => ({
	blockId: block.id,
	height: block.height,
	maxHeightPreviouslyForged: block.maxHeightPreviouslyForged || 0,
	maxHeightPrevoted: block.maxHeightPrevoted,
	delegatePublicKey: block.generatorPublicKey,
	/* This parameter injected to block object to avoid big refactoring
	 for the moment. `delegateMinHeightActive` will be removed from the block
	 object with https://github.com/LiskHQ/lisk-sdk/issues/4413 */
	delegateMinHeightActive: block.delegateMinHeightActive || 0,
});

/**
 * BFT class responsible to hold integration logic for finality manager with the framework
 */
export class BFT extends EventEmitter {
	public _finalityManager?: FinalityManager;
	public storage: Storage;
	public slots: Slots;
	public constants: { activeDelegates: number; startingHeight: number };

	private blockEntity: BlockEntity;

	public constructor({
		storage,
		slots,
		activeDelegates,
		startingHeight,
	}: {
		readonly storage: Storage;
		readonly slots: Slots;
		readonly activeDelegates: number;
		readonly startingHeight: number;
	}) {
		super();
		this.storage = storage;
		this.slots = slots;
		this.constants = {
			activeDelegates,
			startingHeight,
		};

		this.blockEntity = this.storage.entities.Block;
	}

	public async init(
		stateStore: StateStore,
		minActiveHeightsOfDelegates: HeightOfDelegates = {},
	): Promise<void> {
		this._finalityManager = this._initFinalityManager(stateStore);

		this.finalityManager.on(
			EVENT_BFT_FINALIZED_HEIGHT_CHANGED,
			updatedFinalizedHeight => {
				this.emit(EVENT_BFT_FINALIZED_HEIGHT_CHANGED, updatedFinalizedHeight);
			},
		);
		const { finalizedHeight } = this.finalityManager;
		const lastBlockHeight = await this._getLastBlockHeight();

		const loadHeightThreshold = 2;
		const loadFromHeight = Math.max(
			finalizedHeight,
			// Since both limits are inclusive
			// 5 - 3 = 2 but 3, 4, 5 are actually 3
			lastBlockHeight -
				this.constants.activeDelegates * loadHeightThreshold +
				1,
			this.constants.startingHeight,
		);

		await this._loadBlocksFromStorage({
			fromHeight: loadFromHeight,
			tillHeight: lastBlockHeight,
			minActiveHeightsOfDelegates,
		});
	}

	// tslint:disable-next-line prefer-function-over-method
	public serialize(blockInstance: Block): Block {
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
		blocks: Block[],
		minActiveHeightsOfDelegates: HeightOfDelegates = {},
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

		const removeFromHeight = Math.min(...blockHeights);

		this.finalityManager.removeBlockHeaders({
			aboveHeight: removeFromHeight - 1,
		});

		// Make sure there are 2 rounds of block headers available
		const minHeadersThreshold = 2;
		if (
			this.finalityManager.maxHeight - this.finalityManager.minHeight <
			this.constants.activeDelegates * minHeadersThreshold
		) {
			const tillHeight = this.finalityManager.minHeight - 1;
			const fromHeight =
				this.finalityManager.maxHeight -
				this.constants.activeDelegates * minHeadersThreshold;
			await this._loadBlocksFromStorage({
				fromHeight,
				tillHeight,
				minActiveHeightsOfDelegates,
			});
		}
	}

	public addNewBlock(block: Block, stateStore: StateStore): boolean {
		this.finalityManager.addBlockHeader(extractBFTBlockHeaderFromBlock(block));
		const { finalizedHeight } = this.finalityManager;

		return stateStore.chainState.set(
			CHAIN_STATE_FINALIZED_HEIGHT_KEY,
			finalizedHeight,
		);
	}

	public verifyNewBlock(block: Block): boolean {
		return this.finalityManager.verifyBlockHeaders(
			extractBFTBlockHeaderFromBlock(block),
		);
	}

	public forkChoice(block: Block, lastBlock: Block): ForkStatus {
		// Current time since Lisk Epoch
		const receivedBlock = {
			...block,
			receivedAt: this.slots.getEpochTime(),
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
				slots: this.slots,
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

	private _initFinalityManager(stateStore: StateStore): FinalityManager {
		// Check what finalized height was stored last time
		const finalizedHeightStored =
			parseInt(
				stateStore.chainState.get(CHAIN_STATE_FINALIZED_HEIGHT_KEY as string),
				10,
			) || 1;

		/* Check BFT migration height
		 https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#backwards-compatibility */
		const bftMigrationHeightThreshold = 2;
		const bftMigrationHeight =
			this.constants.startingHeight -
			this.constants.activeDelegates * bftMigrationHeightThreshold;

		// Choose max between stored finalized height or migration height
		const finalizedHeight = Math.max(finalizedHeightStored, bftMigrationHeight);

		// Initialize consensus manager
		return new FinalityManager({
			finalizedHeight,
			activeDelegates: this.constants.activeDelegates,
		});
	}

	private async _getLastBlockHeight(): Promise<number> {
		const lastBlock = await this.blockEntity.get(
			{},
			{ limit: 1, sort: 'height:desc' },
		);

		return lastBlock.length ? lastBlock[0].height : 0;
	}

	private async _loadBlocksFromStorage({
		fromHeight,
		tillHeight,
		minActiveHeightsOfDelegates,
	}: {
		readonly fromHeight: number;
		readonly tillHeight: number;
		readonly minActiveHeightsOfDelegates: HeightOfDelegates;
	}): Promise<void> {
		// If blocks to be loaded on tail
		const sortOrder =
			this.finalityManager.minHeight === Math.max(fromHeight, tillHeight) + 1
				? 'height:desc'
				: 'height:asc';

		const rows = await this.blockEntity.get(
			{ height_gte: fromHeight, height_lte: tillHeight },
			{ limit: undefined, sort: sortOrder },
		);

		const BLOCK_VERSION2 = 2;

		rows.forEach(row => {
			if (row.height !== 1 && row.version !== BLOCK_VERSION2) {
				return;
			}

			// If it's genesis block, skip the logic and set
			// `delegateMinHeightActive` to 1.
			if (row.height === 1) {
				this.finalityManager.addBlockHeader(
					extractBFTBlockHeaderFromBlock({
						...row,
						delegateMinHeightActive: 1,
					}),
				);

				return;
			}

			const activeHeights = minActiveHeightsOfDelegates[row.generatorPublicKey];
			if (!activeHeights) {
				throw new Error(
					`Minimum active heights were not found for delegate "${row.generatorPublicKey}".`,
				);
			}

			// If there is no minHeightActive until this point, we can set the value to 0
			const activeHeightThreshold = 3;
			const minimumPossibleActiveHeight = this.slots.calcRoundStartHeight(
				this.slots.calcRound(
					Math.max(
						row.height - this.constants.activeDelegates * activeHeightThreshold,
						1,
					),
				),
			);
			const [delegateMinHeightActive] = activeHeights.filter(
				height => height >= minimumPossibleActiveHeight,
			);

			const blockHeaders = {
				...row,
				delegateMinHeightActive,
			};

			this.finalityManager.addBlockHeader(
				extractBFTBlockHeaderFromBlock(blockHeaders),
			);
		});
	}

	public isBFTProtocolCompliant(block: Block): boolean {
		assert(block, 'No block was provided to be verified');

		const roundsThreshold = 3;
		const heightThreshold = this.constants.activeDelegates * roundsThreshold;
		const blockHeader = extractBFTBlockHeaderFromBlock(block);

		// Special case to avoid reducing the reward of delegates forging for the first time before the `heightThreshold` height
		if (blockHeader.maxHeightPreviouslyForged === 0) {
			return true;
		}

		const bftHeaders = this.finalityManager.headers;

		const maxHeightPreviouslyForgedBlock = bftHeaders.get(
			blockHeader.maxHeightPreviouslyForged,
		);

		if (
			!maxHeightPreviouslyForgedBlock ||
			blockHeader.maxHeightPreviouslyForged >= blockHeader.height ||
			(blockHeader.height - blockHeader.maxHeightPreviouslyForged <=
				heightThreshold &&
				blockHeader.delegatePublicKey !==
					maxHeightPreviouslyForgedBlock.delegatePublicKey)
		) {
			return false;
		}

		return true;
	}

	public get finalizedHeight(): number {
		return this.finalityManager.finalizedHeight;
	}

	public get maxHeightPrevoted(): number {
		return this.finalityManager.prevotedConfirmedHeight;
	}
}
