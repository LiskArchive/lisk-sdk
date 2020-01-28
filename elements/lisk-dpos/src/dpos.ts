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

import { EVENT_ROUND_CHANGED } from './constants';
import { DelegatesInfo } from './delegates_info';
import { DelegatesList } from './delegates_list';
import { Rounds } from './rounds';
import {
	Block,
	Blocks,
	DPoSProcessingOptions,
	Logger,
	RoundDelegates,
	RoundException,
	Storage,
} from './types';

interface ActiveDelegates {
	// tslint:disable-next-line:readonly-keyword
	[key: string]: number[];
}

interface DposConstructor {
	readonly storage: Storage;
	readonly rounds: Rounds;
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
	private readonly events: EventEmitter;
	private readonly delegateListRoundOffset: number;
	private finalizedBlockRound: number;
	private readonly delegateActiveRoundLimit: number;
	private readonly storage: Storage;
	private readonly delegatesList: DelegatesList;
	private readonly delegatesInfo: DelegatesInfo;
	private readonly logger: Logger;
	private readonly blocks: Blocks;
	public readonly rounds: Rounds;

	public constructor({
		storage,
		activeDelegates,
		delegateListRoundOffset,
		logger,
		blocks,
		exceptions = {},
	}: DposConstructor) {
		this.events = new EventEmitter();
		this.delegateListRoundOffset = delegateListRoundOffset;
		this.finalizedBlockRound = 0;
		// @todo consider making this a constant and reuse it in BFT module.
		// tslint:disable-next-line:no-magic-numbers
		this.delegateActiveRoundLimit = 3;
		this.storage = storage;
		this.logger = logger;
		this.blocks = blocks;
		this.rounds = new Rounds({ blocksPerRound: activeDelegates });

		this.delegatesList = new DelegatesList({
			storage,
			rounds: this.rounds,
			activeDelegates,
			blocksModule: this.blocks,
			exceptions,
		});

		this.delegatesInfo = new DelegatesInfo({
			storage,
			rounds: this.rounds,
			activeDelegates,
			logger,
			events: this.events,
			delegatesList: this.delegatesList,
			exceptions,
		});

		this.events.on(EVENT_ROUND_CHANGED, async () => {
			try {
				await this.onRoundFinish();
			} catch (err) {
				this.logger.error({ err }, 'Failed to apply round finish');
			}
		});
	}

	public async getForgerPublicKeysForRound(
		round: number,
		{
			tx,
			delegateListRoundOffset = this.delegateListRoundOffset,
		}: DPoSProcessingOptions = {},
	): Promise<ReadonlyArray<string>> {
		return this.delegatesList.getForgerPublicKeysForRound(
			round,
			delegateListRoundOffset,
			tx,
		);
	}

	public onBlockFinalized({ height }: { readonly height: number }): void {
		this.finalizedBlockRound = this.rounds.calcRound(height);
	}

	public async onRoundFinish(): Promise<void> {
		const disposableDelegateList =
			this.finalizedBlockRound -
			this.delegateListRoundOffset -
			this.delegateActiveRoundLimit;
		await this.delegatesList.deleteDelegateListUntilRound(
			disposableDelegateList,
		);
	}

	public async getMinActiveHeightsOfDelegates(
		numberOfRounds = 1,
		{
			tx,
			delegateListRoundOffset = this.delegateListRoundOffset,
		}: DPoSProcessingOptions = {},
	): Promise<ActiveDelegates> {
		const limit =
			numberOfRounds + this.delegateActiveRoundLimit + delegateListRoundOffset;

		// TODO: Discuss reintroducing a caching mechanism to avoid fetching
		// Active delegate lists multiple times.
		// tslint:disable-next-line:no-let
		let delegateLists = await this.storage.entities.RoundDelegates.get(
			{},
			{
				// IMPORTANT! All logic below based on ordering rounds in
				// Descending order. Change it at your own discretion!
				sort: 'round:desc',
				limit,
			},
			tx,
		);

		if (!delegateLists.length) {
			throw new Error('No delegate list found in the database.');
		}

		// The latest record in db is also the actual active round on the network.
		const latestRound = delegateLists[0].round;

		if (numberOfRounds > latestRound && latestRound > 1) {
			throw new Error(
				'Number of rounds requested is higher than number of existing rounds.',
			);
		}

		// We need to remove redundant lists that we fetch because of delegateListRoundOffset
		const numberOfListsToRemove = Math.min(
			Math.max(delegateLists.length + 1 - delegateListRoundOffset, 0),
			delegateListRoundOffset,
		);
		delegateLists = delegateLists.slice(numberOfListsToRemove);

		const delegates: ActiveDelegates = {};

		const loops = Math.min(delegateLists.length, numberOfRounds);

		// tslint:disable-next-line:no-let
		for (let i = 0; i < loops; i += 1) {
			const activeRound = latestRound - i;
			const [activeList, ...previousLists] = delegateLists;

			for (const publicKey of activeList.delegatePublicKeys) {
				if (!delegates[publicKey]) {
					delegates[publicKey] = [];
				}

				const earliestListRound =
					this._findEarliestActiveListRound(publicKey, previousLists) ||
					activeList.round;

				/**
				 * In order to calculate the correct min height we need the real round number.
				 * That's why we need to add `delegateListRoundOffset` to the `earliestListRound`.
				 *
				 * Please note that first 5 rounds are exceptions.
				 * For the active round 5 and the delegate is continuously active;
				 * That means `earliestListRound` is 1.
				 * Since we are using the first list for first 3 rounds, we can simply
				 * return 1 as `earliestActiveRound`.
				 */
				const earliestActiveRound =
					earliestListRound === 1
						? Math.max(activeRound - this.delegateActiveRoundLimit, 1)
						: earliestListRound + delegateListRoundOffset;
				const lastActiveMinHeight = this.rounds.calcRoundStartHeight(
					earliestActiveRound,
				);

				if (!delegates[publicKey].includes(lastActiveMinHeight)) {
					delegates[publicKey].push(lastActiveMinHeight);
				}

				delegateLists = previousLists;
			}
		}

		return delegates;
	}

	/**
	 * Important: delegateLists must be sorted by round number
	 * in descending order.
	 */
	private _findEarliestActiveListRound(
		delegatePublicKey: string,
		previousLists: ReadonlyArray<RoundDelegates>,
	): number {
		if (!previousLists.length) {
			return 0;
		}

		// Checking the latest 303 blocks is enough
		const lists = previousLists.slice(0, this.delegateActiveRoundLimit);

		// tslint:disable-next-line:no-let prefer-for-of
		for (let i = 0; i < lists.length; i += 1) {
			const { round, delegatePublicKeys } = lists[i];

			if (delegatePublicKeys.indexOf(delegatePublicKey) === -1) {
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

	public async verifyBlockForger(
		block: Block,
		{
			tx,
			delegateListRoundOffset = this.delegateListRoundOffset,
		}: DPoSProcessingOptions = {},
	): Promise<boolean> {
		return this.delegatesList.verifyBlockForger(block, {
			tx,
			delegateListRoundOffset,
		});
	}

	public async apply(
		block: Block,
		{
			tx,
			delegateListRoundOffset = this.delegateListRoundOffset,
		}: DPoSProcessingOptions = {},
	): Promise<boolean> {
		return this.delegatesInfo.apply(block, { tx, delegateListRoundOffset });
	}

	public async undo(
		block: Block,
		{
			tx,
			delegateListRoundOffset = this.delegateListRoundOffset,
		}: DPoSProcessingOptions = {},
	): Promise<boolean> {
		return this.delegatesInfo.undo(block, { tx, delegateListRoundOffset });
	}
}
