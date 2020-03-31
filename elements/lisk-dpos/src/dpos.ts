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
	deleteDelegateListUntilRound,
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
	readonly exceptions?: {
		readonly ignoreDelegateListCacheForRounds?: ReadonlyArray<number>;
	};
}

export class Dpos {
	public readonly rounds: Rounds;
	public readonly events: EventEmitter;

	private readonly delegateListRoundOffset: number;
	private readonly delegateActiveRoundLimit: number;
	private readonly delegatesList: DelegatesList;
	private readonly delegatesInfo: DelegatesInfo;
	private readonly chain: Chain;

	public constructor({
		chain,
		activeDelegates = DEFAULT_ACTIVE_DELEGATE,
		standbyDelegates = DEFAULT_STANDBY_DELEGATE,
		standbyThreshold = DEFAULT_STANDBY_THRESHOLD,
		delegateListRoundOffset = DEFAULT_ROUND_OFFSET,
		voteWeightCapRate = DEFAULT_VOTE_WEIGHT_CAP_RATE,
		exceptions = {},
	}: DposConstructor) {
		this.events = new EventEmitter();
		this.delegateListRoundOffset = delegateListRoundOffset;
		// @todo consider making this a constant and reuse it in BFT module.
		// tslint:disable-next-line:no-magic-numbers
		this.delegateActiveRoundLimit = 3;
		this.chain = chain;
		this.rounds = new Rounds({
			blocksPerRound: activeDelegates + standbyDelegates,
		});

		this.delegatesList = new DelegatesList({
			rounds: this.rounds,
			activeDelegates,
			standbyDelegates,
			standbyThreshold,
			voteWeightCapRate,
			chain: this.chain,
			exceptions,
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

	public async getForgerPublicKeysForRound(
		round: number,
	): Promise<ReadonlyArray<string>> {
		return this.delegatesList.getShuffledDelegateList(round);
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
		await deleteDelegateListUntilRound(disposableDelegateList, stateStore);
		await deleteVoteWeightsUntilRound(disposableDelegateList, stateStore);
	}

	public async getMinActiveHeight(
		height: number,
		publicKey: string,
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
			publicKey,
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
		delegatePublicKey: string,
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

			if (delegates.indexOf(delegatePublicKey) === -1) {
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
}
