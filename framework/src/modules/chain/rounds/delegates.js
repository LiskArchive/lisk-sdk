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

const { hash } = require('@liskhq/lisk-cryptography');

/**
 * Gets delegate public keys sorted by vote descending.
 *
 * @private
 * @param {function} cb - Callback function
 * @param {Object} tx - Database transaction/task object
 * @returns {setImmediateCallback} cb
 * @todo Add description for the return value
 */
const getKeysSortByVote = async (storage, numOfActiveDelegates, tx) => {
	const filters = { isDelegate: true };
	const options = {
		limit: numOfActiveDelegates,
		sort: ['vote:desc', 'publicKey:asc'],
	};
	const accounts = await storage.entities.Account.get(filters, options, tx);
	return accounts.map(account => account.publicKey);
};

/**
 * Gets delegate public keys from previous round, sorted by vote descending.
 *
 * @private
 * @param {function} cb - Callback function
 * @param {Object} tx - Database transaction/task object
 * @returns {setImmediateCallback} cb
 * @todo Add description for the return value
 */
const getDelegatesFromPreviousRound = async (
	storage,
	numOfActiveDelegates,
	tx,
) => {
	const rows = await storage.entities.Round.getDelegatesSnapshot(
		numOfActiveDelegates,
		tx,
	);
	return rows.map(({ publicKey }) => publicKey);
};

/**
 * Compare delegate list and checks if block generator publicKey matches delegate id.
 *
 * @param {block} block
 * @param {function} source - Source function for get delegates
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
const validateBlockSlot = (
	block,
	slots,
	activeDelegates,
	numOfActiveDelegates,
) => {
	const currentSlot = slots.getSlotNumber(block.timestamp);
	const delegateId = activeDelegates[currentSlot % numOfActiveDelegates];

	if (delegateId && block.generatorPublicKey === delegateId) {
		return true;
	}
	throw new Error(`Failed to verify slot: ${currentSlot}`);
};

/**
 * Main delegates methods. Initializes library with scope content and generates a Delegate instance.
 *
 * @class
 * @memberof modules
 * @requires logic/delegate
 * @param {scope} scope - App instance
 */
class Delegates {
	constructor(scope) {
		this.delegatesListCache = {};
		this.logger = scope.logger;
		this.storage = scope.storage;
		this.channel = scope.channel;
		this.slots = scope.slots;
		this.constants = scope.constants;
		this.exceptions = scope.exceptions;
	}

	/**
	 * Gets delegate list based on input function by vote and changes order.
	 *
	 * @param {number} round
	 * @param {function} source - Source function for get delegates
	 * @param {function} cb - Callback function
	 * @param {Object} tx - Database transaction/task object
	 * @returns {setImmediateCallback} cb, err, truncated delegate list
	 * @todo Add description for the params
	 */
	async generateDelegateList(round, source, tx) {
		if (this.delegatesListCache[round]) {
			this.logger.debug('Using delegate list from the cache for round', round);
			return this.delegatesListCache[round];
		}

		const truncDelegateList = source
			? await source(this.storage, this.constants.activeDelegates, tx)
			: await getKeysSortByVote(
					this.storage,
					this.constants.activeDelegates,
					tx,
			  );

		const seedSource = round.toString();
		let currentSeed = hash(seedSource, 'utf8');

		// eslint-disable-next-line no-plusplus
		for (let i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
			// eslint-disable-next-line no-plusplus
			for (let x = 0; x < 4 && i < delCount; i++, x++) {
				const newIndex = currentSeed[x] % delCount;
				const b = truncDelegateList[newIndex];
				truncDelegateList[newIndex] = truncDelegateList[i];
				truncDelegateList[i] = b;
			}
			currentSeed = hash(currentSeed);
		}

		// If the round is not an exception, cache the round.
		if (!this.exceptions.ignoreDelegateListCacheForRounds.includes(round)) {
			this.updateDelegateListCache(round, truncDelegateList);
		}
		return truncDelegateList;
	}

	/**
	 * Generates delegate list and checks if block generator public key matches delegate id.
	 *
	 * @param {block} block
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb, err
	 * @todo Add description for the params
	 */
	async validateBlockSlot(block) {
		const round = this.slots.calcRound(block.height);
		const activeDelegates = await this.generateDelegateList(
			round,
			getKeysSortByVote,
		);
		validateBlockSlot(
			block,
			this.slots,
			activeDelegates,
			this.constants.activeDelegates,
		);
	}

	/**
	 * Generates delegate list and checks if block generator public key matches delegate id - against previous round.
	 *
	 * @param {block} block
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb, err
	 * @todo Add description for the params
	 */
	async validateBlockSlotAgainstPreviousRound(block) {
		const round = this.slots.calcRound(block.height);
		const activeDelegates = await this.generateDelegateList(
			round,
			getDelegatesFromPreviousRound,
		);
		validateBlockSlot(
			block,
			this.slots,
			activeDelegates,
			this.constants.activeDelegates,
		);
	}

	/**
	 * Inserts a fork into 'forks_stat' table and emits a 'delegates/fork' socket signal with fork data: cause + block.
	 *
	 * @param {block} block
	 * @param {string} cause
	 * @todo Add description for the params
	 */
	async fork(block, cause) {
		this.logger.info('Fork', {
			delegate: block.generatorPublicKey,
			block: {
				id: block.id,
				timestamp: block.timestamp,
				height: block.height,
				previousBlock: block.previousBlock,
			},
			cause,
		});

		const fork = {
			delegatePublicKey: block.generatorPublicKey,
			blockTimestamp: block.timestamp,
			blockId: block.id,
			blockHeight: block.height,
			previousBlockId: block.previousBlock,
			cause,
		};

		try {
			await this.storage.entities.Account.insertFork(fork);
		} catch (err) {
			this.logger.warn(err, 'Failed to insert fork info');
		}
		this.channel.publish('chain:delegates:fork', fork);
	}

	/**
	 * Caches delegate list for last 2 rounds.
	 *
	 * @private
	 * @param {number} round - Round Number
	 * @param {array} delegatesList - Delegate list
	 */
	updateDelegateListCache(round, delegatesList) {
		this.logger.debug('Updating delegate list cache for round', round);
		this.delegatesListCache[round] = delegatesList;
		// We want to cache delegates for only last 2 rounds and get rid of old ones
		this.delegatesListCache = Object.keys(this.delegatesListCache)
			// sort round numbers in ascending order so we can have most recent 2 rounds at the end of the list.
			.sort((a, b) => a - b)
			// delete all round cache except last two rounds.
			.slice(-2)
			.reduce((acc, current) => {
				acc[current] = this.delegatesListCache[current];
				return acc;
			}, {});
	}

	/**
	 * Invalidates the cached delegate list.
	 *
	 */
	clearDelegateListCache() {
		this.logger.debug('Clearing delegate list cache.');
		this.delegatesListCache = {};
	}
}

// Export
module.exports = {
	Delegates,
	validateBlockSlot,
	getKeysSortByVote,
	getDelegatesFromPreviousRound,
};
