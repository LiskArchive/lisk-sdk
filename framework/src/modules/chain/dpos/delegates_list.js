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
const { hash } = require('@liskhq/lisk-cryptography');
// Will be fired once a round is finished
const EVENT_ROUND_FINISHED = 'EVENT_ROUND_FINISHED';

const shuffleDelegateListForRound = (round, list) => {
	const seedSource = round.toString();
	const delegateList = [...list];
	let currentSeed = hash(seedSource, 'utf8');

	// eslint-disable-next-line no-plusplus
	for (let i = 0, delCount = delegateList.length; i < delCount; i++) {
		// eslint-disable-next-line no-plusplus
		for (let x = 0; x < 4 && i < delCount; i++, x++) {
			const newIndex = currentSeed[x] % delCount;
			const b = delegateList[newIndex];
			delegateList[newIndex] = delegateList[i];
			delegateList[i] = b;
		}
		currentSeed = hash(currentSeed);
	}

	return delegateList;
};

class DelegatesList extends EventEmitter {
	constructor({ storage, activeDelegates, slots, exceptions }) {
		super();
		this.storage = storage;
		this.slots = slots;
		this.activeDelegates = activeDelegates;
		this.exceptions = exceptions;
	}

	/**
	 * Get shuffled list of active delegate public keys for a specific round -> forger public keys
	 * @param {number} round
	 */
	async getForgerPublicKeysForRound(round) {
		const delegatePublicKeys = await this.storage.entities.RoundDelegates.getActiveDelegatesForRound(
			round,
		);

		if (!delegatePublicKeys.length) {
			throw new Error(`No delegate list found for round: ${round}`);
		}

		return shuffleDelegateListForRound(round, delegatePublicKeys);
	}

	async getDelegatePublicKeysSortedByVoteWeight(tx) {
		const filters = { isDelegate: true };
		const options = {
			limit: this.activeDelegates,
			sort: ['voteWeight:desc', 'publicKey:asc'],
		};
		const accounts = await this.storage.entities.Account.get(
			filters,
			options,
			tx,
		);
		return accounts.map(account => account.publicKey);
	}

	/**
	 * Generate list of delegate public keys for the next round in database
	 * WARNING: This function should only be called from `apply()` as we don't allow future rounds to be created
	 * @param {number} round
	 * @param {Object} tx - Database transaction object
	 */
	async createRoundDelegateList(round, tx) {
		const delegatePublicKeys = await this.getDelegatePublicKeysSortedByVoteWeight(
			tx,
		);

		// Delete delegate list and create new updated list
		await this.storage.entities.RoundDelegates.delete(
			{
				round,
			},
			tx,
		);
		await this.storage.entities.RoundDelegates.create(
			{
				round,
				delegatePublicKeys,
			},
			{},
			tx,
		);
	}

	async deleteDelegateListUntilRound(round, tx) {
		await this.storage.entities.RoundDelegates.delete(
			{
				round_lt: round,
			},
			tx,
		);
	}

	async deleteDelegateListAfterRound(round, tx) {
		await this.storage.entities.RoundDelegates.delete(
			{
				round_gt: round,
			},
			tx,
		);
	}

	/**
	 * Validates if block was forged by correct delegate
	 *
	 * @param {Object} block
	 * @return {Boolean} - `true`
	 * @throw {Error} Failed to verify slot
	 */
	async verifyBlockForger(block) {
		const currentSlot = this.slots.getSlotNumber(block.timestamp);
		const round = this.slots.calcRound(block.height);
		const delegateList = await this.getForgerPublicKeysForRound(round);

		if (!delegateList.length) {
			throw new Error(
				`Failed to verify slot: ${currentSlot} for block ID: ${
					block.id
				} - No delegateList was found`,
			);
		}

		// Get delegate public key that was supposed to forge the block
		const expectedForgerPublicKey =
			delegateList[currentSlot % this.activeDelegates];

		// Verify if forger exists and matches the generatorPublicKey on block
		if (
			!expectedForgerPublicKey ||
			block.generatorPublicKey !== expectedForgerPublicKey
		) {
			/**
			 * Accepts any forger as valid for the rounds defined in exceptions.ignoreDelegateListCacheForRounds
			 * This is only set for testnet due to `zero vote` active delegate issue (https://github.com/LiskHQ/lisk-sdk/pull/2543#pullrequestreview-178505587)
			 * Should be tackled by https://github.com/LiskHQ/lisk-sdk/issues/4194
			 */
			const { ignoreDelegateListCacheForRounds = [] } = this.exceptions;
			if (ignoreDelegateListCacheForRounds.includes(round)) {
				return true;
			}

			throw new Error(`Failed to verify slot: ${currentSlot}`);
		}

		return true;
	}
}

module.exports = {
	DelegatesList,
	EVENT_ROUND_FINISHED,
	shuffleDelegateListForRound,
};
