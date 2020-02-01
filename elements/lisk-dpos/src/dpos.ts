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

import { CHAIN_STATE_FORGERS_LIST_KEY } from './constants';
import { DelegatesInfo } from './delegates_info';
import {
	DelegatesList,
	deleteDelegateListUntilRound,
	getForgersList,
	shuffleDelegateListForRound,
} from './delegates_list';
import { Rounds } from './rounds';
import {
	BlockHeader,
	Blocks,
	DPoSProcessingOptions,
	ForgersList,
	Logger,
	RoundException,
	StateStore,
} from './types';

interface ActiveDelegates {
	// tslint:disable-next-line:readonly-keyword
	[key: string]: number[];
}

interface DposConstructor {
	readonly activeDelegates: number;
	readonly delegateListRoundOffset: number;
	readonly logger: Logger;
	readonly blocks: Blocks;
	readonly exceptions?: {
		readonly ignoreDelegateListCacheForRounds?: ReadonlyArray<number>;
		readonly rounds?: { readonly [key: string]: RoundException };
	};
}

export class Dpos {
	public readonly rounds: Rounds;

	private readonly events: EventEmitter;
	private readonly delegateListRoundOffset: number;
	private readonly delegateActiveRoundLimit: number;
	private readonly delegatesList: DelegatesList;
	private readonly delegatesInfo: DelegatesInfo;
	private readonly blocks: Blocks;

	public constructor({
		activeDelegates,
		delegateListRoundOffset,
		logger,
		blocks,
		exceptions = {},
	}: DposConstructor) {
		this.events = new EventEmitter();
		this.delegateListRoundOffset = delegateListRoundOffset;
		// @todo consider making this a constant and reuse it in BFT module.
		// tslint:disable-next-line:no-magic-numbers
		this.delegateActiveRoundLimit = 3;
		this.blocks = blocks;
		this.rounds = new Rounds({ blocksPerRound: activeDelegates });

		this.delegatesList = new DelegatesList({
			rounds: this.rounds,
			activeDelegates,
			blocks: this.blocks,
			exceptions,
		});

		this.delegatesInfo = new DelegatesInfo({
			blocks: this.blocks,
			rounds: this.rounds,
			activeDelegates,
			logger,
			events: this.events,
			delegatesList: this.delegatesList,
			exceptions,
		});
	}

	// tslint:disable-next-line prefer-function-over-method
	public async getForgerPublicKeysForRound(
		round: number,
	): Promise<ReadonlyArray<string>> {
		const forgersListStr = await this.blocks.dataAccess.getChainState(
			CHAIN_STATE_FORGERS_LIST_KEY,
		);
		const forgersList =
			forgersListStr !== undefined
				? (JSON.parse(forgersListStr) as ForgersList)
				: [];
		const delegatePublicKeys = forgersList.find(fl => fl.round === round)
			?.delegates;

		if (!delegatePublicKeys) {
			throw new Error(`No delegate list found for round: ${round}`);
		}

		return shuffleDelegateListForRound(round, delegatePublicKeys);
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
	}

	public async getMinActiveHeightsOfDelegates(
		height: number,
		stateStore: StateStore,
		numberOfRounds = 1,
	): Promise<ActiveDelegates> {
		const forgersList = await getForgersList(stateStore);
		if (!forgersList.length) {
			throw new Error('No delegate list found in the database.');
		}
		// IMPORTANT! All logic below based on ordering rounds in
		// Descending order. Change it at your own discretion!
		forgersList.sort((a, b) => b.round - a.round);

		// Remove the future rounds
		const currentRound = this.rounds.calcRound(height);
		const limit = currentRound - numberOfRounds - this.delegateActiveRoundLimit;
		// tslint:disable-next-line:no-let
		let currentForgersList = forgersList.filter(
			fl => fl.round <= currentRound && fl.round > limit,
		);

		if (numberOfRounds > currentRound && currentRound > 1) {
			throw new Error(
				'Number of rounds requested is higher than number of existing rounds.',
			);
		}

		const delegates: ActiveDelegates = {};

		const loops = Math.min(currentForgersList.length, numberOfRounds);

		// tslint:disable-next-line:no-let
		for (let i = 0; i < loops; i += 1) {
			const [activeList, ...previousLists] = currentForgersList;

			for (const publicKey of activeList.delegates) {
				if (!delegates[publicKey]) {
					delegates[publicKey] = [];
				}

				const earliestListRound = this._findEarliestActiveListRound(
					publicKey,
					previousLists,
				);

				const lastActiveMinHeight = this.rounds.calcRoundStartHeight(
					earliestListRound,
				);

				if (!delegates[publicKey].includes(lastActiveMinHeight)) {
					delegates[publicKey].push(lastActiveMinHeight);
				}

				currentForgersList = previousLists;
			}
		}

		return delegates;
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
		block: BlockHeader,
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
		block: BlockHeader,
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
