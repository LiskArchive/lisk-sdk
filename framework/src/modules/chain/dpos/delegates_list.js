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
		this.delegateListCache = {};
		this.storage = storage;
		this.slots = slots;
		this.activeDelegates = activeDelegates;
		this.exceptions = exceptions;
	}

	async getRoundDelegates(round) {
		const list = await this.generateActiveDelegateList(round);
		return shuffleDelegateListForRound(round, list);
	}

	async getDelegatePublicKeysSortedByVote() {
		const filters = { isDelegate: true };
		const options = {
			limit: this.activeDelegates,
			sort: ['vote:desc', 'publicKey:asc'],
		};
		const accounts = await this.storage.entities.Account.get(filters, options);
		return accounts.map(account => account.publicKey);
	}

	async generateActiveDelegateList(round) {
		if (this.delegateListCache[round]) {
			return this.delegateListCache[round];
		}

		let delegatePublicKeys = await this.storage.entities.RoundDelegates.getRoundDelegates(
			round,
		);

		if (!delegatePublicKeys.length) {
			const { ignoreDelegateListCacheForRounds = [] } = this.exceptions;
			delegatePublicKeys = await this.getDelegatePublicKeysSortedByVote();

			// If the round is not an exception, create entry in the database and cache the list.
			if (!ignoreDelegateListCacheForRounds.includes(round)) {
				await this.storage.entities.RoundDelegates.create({
					round,
					delegatePublicKeys,
				});
				this.delegateListCache[round] = delegatePublicKeys;
			}
		}

		return delegatePublicKeys;
	}

	async deleteDelegateListUntilRound(round) {
		await this.storage.entities.RoundDelegates.delete({
			round_lt: round,
		});
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
		const delegateList = await this.getRoundDelegates(round);

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
