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

'use strict';

const EventEmitter = require('events');
const { EVENT_ROUND_CHANGED } = require('./constants');
const { DelegatesList } = require('./delegates_list');
const { DelegatesInfo } = require('./delegates_info');

module.exports = class Dpos {
	constructor({
		storage,
		slots,
		activeDelegates,
		delegateListRoundOffset,
		logger,
		exceptions = {},
	}) {
		this.events = new EventEmitter();
		this.delegateListRoundOffset = delegateListRoundOffset;
		this.finalizedBlockRound = 0;
		// @todo consider making this a constant and reuse it in BFT module.
		this.delegateActiveRoundLimit = 3;
		this.slots = slots;
		this.storage = storage;

		this.delegatesList = new DelegatesList({
			storage,
			logger,
			slots,
			activeDelegates,
			exceptions,
		});

		this.delegatesInfo = new DelegatesInfo({
			storage,
			slots,
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

	async getForgerPublicKeysForRound(
		round,
		{ tx, delegateListRoundOffset = this.delegateListRoundOffset } = {},
	) {
		return this.delegatesList.getForgerPublicKeysForRound(
			round,
			delegateListRoundOffset,
			tx,
		);
	}

	async onBlockFinalized({ height }) {
		this.finalizedBlockRound = this.slots.calcRound(height);
	}

	async onRoundFinish() {
		const disposableDelegateList =
			this.finalizedBlockRound -
			this.delegateListRoundOffset -
			this.delegateActiveRoundLimit;
		await this.delegatesList.deleteDelegateListUntilRound(
			disposableDelegateList,
		);
	}

	async getMinActiveHeightsOfDelegates(
		numberOfRounds = 1,
		{ tx, delegateListRoundOffset = this.delegateListRoundOffset } = {},
	) {
		const limit =
			numberOfRounds + this.delegateActiveRoundLimit + delegateListRoundOffset;

		// TODO: Discuss reintroducing a caching mechanism to avoid fetching
		// active delegate lists multiple times.
		let delegateLists = await this.storage.entities.RoundDelegates.get(
			{},
			{
				// IMPORTANT! All logic below based on ordering rounds in
				// descending order. Change it at your own discretion!
				sort: 'round:desc',
				limit,
			},
			tx,
		);

		if (!delegateLists.length) {
			throw new Error('No delegate list found in the database.');
		}

		// the latest record in db is also the actual active round on the network.
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

		const delegates = {};

		const loops = Math.min(delegateLists.length, numberOfRounds);

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
				const lastActiveMinHeight = this.slots.calcRoundStartHeight(
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
	_findEarliestActiveListRound(delegatePublicKey, previousLists) {
		if (!previousLists.length) {
			return 0;
		}

		// Checking the latest 303 blocks is enough
		const lists = previousLists.slice(0, this.delegateActiveRoundLimit);

		for (let i = 0; i < lists.length; i += 1) {
			const { round, delegatePublicKeys } = lists[i];

			if (delegatePublicKeys.indexOf(delegatePublicKey) === -1) {
				// since we are iterating backwards,
				// if the delegate is not in this list
				// that means delegate was in the next round :)
				return round + 1;
			}
		}

		// If the loop above is not broken until this point that means,
		// delegate was always active in the given `previousLists`.
		return lists[lists.length - 1].round;
	}

	async verifyBlockForger(
		block,
		{ tx, delegateListRoundOffset = this.delegateListRoundOffset } = {},
	) {
		return this.delegatesList.verifyBlockForger(block, {
			tx,
			delegateListRoundOffset,
		});
	}

	async apply(
		block,
		{ tx, delegateListRoundOffset = this.delegateListRoundOffset } = {},
	) {
		return this.delegatesInfo.apply(block, { tx, delegateListRoundOffset });
	}

	async undo(
		block,
		{ tx, delegateListRoundOffset = this.delegateListRoundOffset } = {},
	) {
		return this.delegatesInfo.undo(block, { tx, delegateListRoundOffset });
	}
};
