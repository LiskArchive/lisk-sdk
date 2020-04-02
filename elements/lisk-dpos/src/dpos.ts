/*
 * Copyright © 2019 Lisk Foundation
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
import { hash, hexToBuffer } from '@liskhq/lisk-cryptography';
import { EventEmitter } from 'events';

import {
	DEFAULT_ACTIVE_DELEGATE,
	DEFAULT_ROUND_OFFSET,
	DEFAULT_STANDBY_DELEGATE,
	DEFAULT_STANDBY_THRESHOLD,
	DEFAULT_VOTE_WEIGHT_CAP_RATE,
} from './constants';
import { DelegatesInfo } from './delegates_info';
import {
	DelegatesList,
	deleteForgersListUntilRound,
	deleteVoteWeightsUntilRound,
	getForgersList,
} from './delegates_list';
import { Rounds } from './rounds';
import {
	Block,
	BlockHeader,
	Chain,
	DPoSProcessingOptions,
	ForgersList,
	StateStore,
} from './types';

interface DposConstructor {
	readonly chain: Chain;
	readonly activeDelegates?: number;
	readonly standbyDelegates?: number;
	readonly standbyThreshold?: bigint;
	readonly voteWeightCapRate?: number;
	readonly delegateListRoundOffset?: number;
}

export class Dpos {
	public readonly rounds: Rounds;
	public readonly events: EventEmitter;

	private readonly delegateListRoundOffset: number;
	private readonly delegateActiveRoundLimit: number;
	private readonly delegatesList: DelegatesList;
	private readonly delegatesInfo: DelegatesInfo;
	private readonly chain: Chain;
	private readonly _delegatesPerRound: number;

	public constructor({
		chain,
		activeDelegates = DEFAULT_ACTIVE_DELEGATE,
		standbyDelegates = DEFAULT_STANDBY_DELEGATE,
		standbyThreshold = DEFAULT_STANDBY_THRESHOLD,
		delegateListRoundOffset = DEFAULT_ROUND_OFFSET,
		voteWeightCapRate = DEFAULT_VOTE_WEIGHT_CAP_RATE,
	}: DposConstructor) {
		this.events = new EventEmitter();
		this.delegateListRoundOffset = delegateListRoundOffset;
		this._delegatesPerRound = activeDelegates + standbyDelegates;
		// @todo consider making this a constant and reuse it in BFT module.
		// tslint:disable-next-line:no-magic-numbers
		this.delegateActiveRoundLimit = 3;
		this.chain = chain;
		this.rounds = new Rounds({
			blocksPerRound: this._delegatesPerRound,
		});

		this.delegatesList = new DelegatesList({
			rounds: this.rounds,
			activeDelegates,
			standbyDelegates,
			standbyThreshold,
			voteWeightCapRate,
			chain: this.chain,
		});

		this.delegatesInfo = new DelegatesInfo({
			chain: this.chain,
			rounds: this.rounds,
			activeDelegates,
			standbyDelegates,
			events: this.events,
			delegatesList: this.delegatesList,
		});
	}

	public get delegatesPerRound(): number {
		return this._delegatesPerRound;
	}

	public async getForgerAddressesForRound(
		round: number,
	): Promise<ReadonlyArray<string>> {
		return this.delegatesList.getDelegateList(round);
	}

	public async onBlockFinalized(
		stateStore: StateStore,
		finalizedHeight: number,
	): Promise<void> {
		const finalizedBlockRound = this.rounds.calcRound(finalizedHeight);
		const disposableDelegateList =
			finalizedBlockRound -
			this.delegateListRoundOffset -
			this.delegateActiveRoundLimit;
		await deleteForgersListUntilRound(disposableDelegateList, stateStore);
		await deleteVoteWeightsUntilRound(disposableDelegateList, stateStore);
	}

	public async getMinActiveHeight(
		height: number,
		address: string,
		stateStore: StateStore,
		delegateActiveRoundLimit?: number,
	): Promise<number> {
		const forgersList = await getForgersList(stateStore);
		if (!forgersList.length) {
			throw new Error('No delegate list found in the database.');
		}
		// IMPORTANT! All logic below based on ordering rounds in
		// Descending order. Change it at your own discretion!
		forgersList.sort((a, b) => b.round - a.round);

		// Remove the future rounds
		const currentRound = this.rounds.calcRound(height);
		// It should not consider current round
		const previousForgersList = forgersList.filter(
			fl => fl.round < currentRound,
		);

		const activeRounds = this._findEarliestActiveListRound(
			address,
			previousForgersList,
			delegateActiveRoundLimit,
		);

		return this.rounds.calcRoundStartHeight(activeRounds);
	}

	/**
	 * Important: delegateLists must be sorted by round number
	 * in descending order.
	 */
	private _findEarliestActiveListRound(
		address: string,
		previousLists: ForgersList,
		delegateActiveRoundLimit: number = this.delegateActiveRoundLimit,
	): number {
		if (!previousLists.length) {
			return 0;
		}

		// Checking the latest 303 blocks is enough
		const lists = previousLists.slice(0, delegateActiveRoundLimit);

		// tslint:disable-next-line:no-let prefer-for-of
		for (let i = 0; i < lists.length; i += 1) {
			const { round, delegates } = lists[i];

			if (delegates.indexOf(address) === -1) {
				// Since we are iterating backwards,
				// If the delegate is not in this list
				// That means delegate was in the next round :)
				return round + 1;
			}
		}

		// If the loop above is not broken until this point that means,
		// Delegate was always active in the given `previousLists`.
		return lists[lists.length - 1].round;
	}

	public async verifyBlockForger(block: BlockHeader): Promise<boolean> {
		return this.delegatesList.verifyBlockForger(block);
	}

	public async apply(
		block: Block,
		stateStore: StateStore,
		{ delegateListRoundOffset }: DPoSProcessingOptions = {
			delegateListRoundOffset: this.delegateListRoundOffset,
		},
	): Promise<boolean> {
		return this.delegatesInfo.apply(block, stateStore, {
			delegateListRoundOffset,
		});
	}

	public async undo(
		block: Block,
		stateStore: StateStore,
		{ delegateListRoundOffset }: DPoSProcessingOptions = {
			delegateListRoundOffset: this.delegateListRoundOffset,
		},
	): Promise<boolean> {
		return this.delegatesInfo.undo(block, stateStore, {
			delegateListRoundOffset,
		});
	}

	// This function is used in block_processor_v2 to check the dpos compliance and update/validate the reward
	// tslint:disable-next-line: prefer-function-over-method
	public async isDPoSProtocolCompliant(
		blockHeader: BlockHeader,
		store: StateStore,
	): Promise<boolean> {
		const delegateForgedBlocks = store.consensus?.lastBlockHeaders?.filter(
			block => block.generatorPublicKey === blockHeader.generatorPublicKey,
		);

		if (!delegateForgedBlocks.length) {
			// If the forger din't forge any block in the last three rounds
			return true;
		}

		const { seedReveal: previousBlockSeedReveal } = delegateForgedBlocks[0];
		const { seedReveal: newBlockSeedReveal } = blockHeader;
		const SEED_REVEAL_BYTE_SIZE = 16;
		const newBlockSeedRevealBuffer = hash(
			hexToBuffer(newBlockSeedReveal),
		).slice(0, SEED_REVEAL_BYTE_SIZE);

		// Check if last block seedReveal is not a preimage of new block
		if (
			!hexToBuffer(previousBlockSeedReveal).equals(newBlockSeedRevealBuffer)
		) {
			return false;
		}

		// If the seedReveal matches the preimage
		return true;
	}
}
