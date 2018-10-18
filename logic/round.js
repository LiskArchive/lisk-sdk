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

'use strict';

const Promise = require('bluebird');
const Bignum = require('../helpers/bignum.js');
const RoundChanges = require('../helpers/round_changes.js');

/**
 * Validates required scope properties.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires bluebird
 * @requires helpers/round_changes
 * @param {Object} scope
 * @param {Task} t
 * @todo Add description for the params
 */
class Round {
	constructor(scope, t) {
		this.scope = {
			backwards: scope.backwards,
			round: scope.round,
			roundOutsiders: scope.roundOutsiders,
			roundDelegates: scope.roundDelegates,
			roundFees: scope.roundFees,
			roundRewards: scope.roundRewards,
			library: {
				db: scope.library.db,
				logger: scope.library.logger,
			},
			modules: {
				accounts: scope.modules.accounts,
			},
			block: {
				generatorPublicKey: scope.block.generatorPublicKey,
				id: scope.block.id,
				height: scope.block.height,
				timestamp: scope.block.timestamp,
			},
		};
		this.t = t;

		// List of required scope properties
		let requiredProperties = [
			'library',
			'modules',
			'block',
			'round',
			'backwards',
		];

		// Require extra scope properties when finishing round
		if (scope.finishRound) {
			requiredProperties = requiredProperties.concat([
				'roundFees',
				'roundRewards',
				'roundDelegates',
				'roundOutsiders',
			]);
		}

		// Iterate over requiredProperties, checking for undefined scope properties
		requiredProperties.forEach(property => {
			if (scope[property] === undefined) {
				throw `Missing required scope property: ${property}`;
			}
		});
	}

	/**
	 * Returns result from call to mergeAccountAndGet.
	 *
	 * @returns {function} Promise
	 * @todo Check type and description of the return value
	 */
	mergeBlockGenerator() {
		const self = this;

		return new Promise((resolve, reject) => {
			self.scope.modules.accounts.mergeAccountAndGet(
				{
					publicKey: self.scope.block.generatorPublicKey,
					producedBlocks: self.scope.backwards ? -1 : 1,
					round: self.scope.round,
				},
				(err, account) => {
					if (err) {
						reject(err);
					} else {
						resolve(account);
					}
				},
				self.t
			);
		});
	}

	/**
	 * If outsiders content, calls sql updateMissedBlocks.
	 *
	 * @todo Add @returns tag
	 */
	updateMissedBlocks() {
		if (this.scope.roundOutsiders.length === 0) {
			return this.t;
		}

		return this.t.rounds.updateMissedBlocks(
			this.scope.backwards,
			this.scope.roundOutsiders
		);
	}

	/**
	 * Calls sql getVotes from `mem_round` table.
	 *
	 * @todo Round must be a param option
	 * @todo Add @returns tag
	 */
	getVotes() {
		return this.t.rounds.getVotes(this.scope.round);
	}

	/**
	 * Calls getVotes with round.
	 *
	 * @returns {function} Promise
	 * @todo Check type and description of the return value
	 */
	updateVotes() {
		const self = this;

		return self.getVotes(self.scope.round).then(votes => {
			const queries = votes.map(vote =>
				self.t.rounds.updateVotes(
					self.scope.modules.accounts.generateAddressByPublicKey(vote.delegate),
					// Have to revert the logic to not use bignumber. it was causing change
					// in vote amount. More details can be found on the issue.
					// 		new Bignum(vote.amount).integerValue(Bignum.ROUND_FLOOR)
					// TODO: https://github.com/LiskHQ/lisk/issues/2423
					Math.floor(vote.amount)
				)
			);

			if (queries.length > 0) {
				return self.t.batch(queries);
			}
			return self.t;
		});
	}

	/**
	 * Calls sql flush:
	 * - Deletes round from `mem_round` table.
	 *
	 * @returns {function} Promise
	 * @todo Check type and description of the return value
	 */
	flushRound() {
		return this.t.rounds.flush(this.scope.round);
	}

	/**
	 * Calls sql restoreRoundSnapshot:
	 * - Restores mem_round table snapshot.
	 * - Performed only when rollback last block of round.
	 *
	 * @returns {function} Promise
	 * @todo Check type and description of the return value
	 */
	restoreRoundSnapshot() {
		this.scope.library.logger.debug('Restoring mem_round snapshot...');
		return this.t.rounds.restoreRoundSnapshot();
	}

	/**
	 * Calls sql restoreVotesSnapshot:
	 * - Restores mem_accounts.votes snapshot.
	 * - Performed only when rollback last block of round.
	 *
	 * @returns {function} Promise
	 * @todo Check type and description of the return value
	 */
	restoreVotesSnapshot() {
		this.scope.library.logger.debug('Restoring mem_accounts.vote snapshot...');
		return this.t.rounds.restoreVotesSnapshot();
	}

	/**
	 * Checks round snapshot availability for current round.
	 *
	 * @returns {Promise}
	 */
	checkSnapshotAvailability() {
		return this.t.rounds
			.checkSnapshotAvailability(this.scope.round)
			.then(isAvailable => {
				if (!isAvailable) {
					// Snapshot for current round is not available, check if round snapshot table is empty,
					// because we need to allow to restore snapshot in that case (no transactions during entire round)
					return this.t.rounds.countRoundSnapshot().then(count => {
						// Throw an error when round snapshot table is not empty
						if (count) {
							throw new Error(
								`Snapshot for round ${this.scope.round} not available`
							);
						}
					});
				}
			});
	}

	/**
	 * Calls sql updateDelegatesRanks: Update current ranks of all delegates
	 *
	 * @returns {Promise}
	 */
	updateDelegatesRanks() {
		this.scope.library.logger.debug('Updating ranks of all delegates...');
		return this.t.rounds.updateDelegatesRanks();
	}

	/**
	 * Calls sql deleteRoundRewards:
	 * - Removes rewards for entire round from round_rewards table.
	 * - Performed only when rollback last block of round.
	 * @returns {function} Promise
	 */
	deleteRoundRewards() {
		this.scope.library.logger.debug(
			`Deleting rewards for round ${this.scope.round}`
		);
		return this.t.rounds.deleteRoundRewards(this.scope.round);
	}

	/**
	 * For each delegate calls mergeAccountAndGet and creates an address array.
	 *
	 * @returns {function} Promise with address array
	 */
	applyRound() {
		const roundChanges = new RoundChanges(this.scope);
		const queries = [];
		const self = this;
		let changes;
		let delegate;
		let p;
		const roundRewards = [];

		// Reverse delegates if going backwards
		const delegates = self.scope.backwards
			? self.scope.roundDelegates.reverse()
			: self.scope.roundDelegates;

		// Reverse rewards if going backwards
		if (self.scope.backwards) {
			self.scope.roundRewards.reverse();
		}

		// Apply round changes to each delegate
		for (let i = 0; i < self.scope.roundDelegates.length; i++) {
			delegate = self.scope.roundDelegates[i];
			changes = roundChanges.at(i);

			this.scope.library.logger.trace('Delegate changes', {
				delegate,
				changes,
			});

			const accountData = {
				publicKey: delegate,
				balance: self.scope.backwards ? -changes.balance : changes.balance,
				u_balance: self.scope.backwards ? -changes.balance : changes.balance,
				round: self.scope.round,
				fees: self.scope.backwards ? -changes.fees : changes.fees,
				rewards: self.scope.backwards ? -changes.rewards : changes.rewards,
			};

			p = new Promise((resolve, reject) => {
				self.scope.modules.accounts.mergeAccountAndGet(
					accountData,
					(err, account) => {
						if (err) {
							reject(err);
						} else {
							resolve(account);
						}
					},
					self.t
				);
			});

			queries.push(p);

			// Aggregate round rewards data - when going forward
			if (!self.scope.backwards) {
				roundRewards.push({
					timestamp: self.scope.block.timestamp,
					fees: new Bignum(changes.fees).toString(),
					reward: new Bignum(changes.rewards).toString(),
					round: self.scope.round,
					publicKey: delegate,
				});
			}
		}

		// Decide which delegate receives fees remainder
		const remainderIndex = this.scope.backwards ? 0 : delegates.length - 1;
		const remainderDelegate = delegates[remainderIndex];

		// Get round changes for chosen delegate
		changes = roundChanges.at(remainderIndex);

		// Apply fees remaining to chosen delegate
		if (changes.feesRemaining > 0) {
			const feesRemaining = this.scope.backwards
				? -changes.feesRemaining
				: changes.feesRemaining;

			this.scope.library.logger.trace('Fees remaining', {
				index: remainderIndex,
				delegate: remainderDelegate,
				fees: feesRemaining,
			});

			p = new Promise((resolve, reject) => {
				self.scope.modules.accounts.mergeAccountAndGet(
					{
						publicKey: remainderDelegate,
						balance: feesRemaining,
						u_balance: feesRemaining,
						round: self.scope.round,
						fees: feesRemaining,
					},
					(err, account) => {
						if (err) {
							reject(err);
						} else {
							resolve(account);
						}
					},
					self.t
				);
			});

			// Aggregate round rewards data (remaining fees) - when going forward
			if (!self.scope.backwards) {
				roundRewards[roundRewards.length - 1].fees = new Bignum(
					roundRewards[roundRewards.length - 1].fees
				)
					.plus(feesRemaining)
					.toString();
			}

			queries.push(p);
		}

		// Prepare queries for inserting round rewards
		roundRewards.forEach(item => {
			queries.push(
				self.t.rounds.insertRoundRewards(
					item.timestamp,
					item.fees,
					item.reward,
					item.round,
					item.publicKey
				)
			);
		});

		self.scope.library.logger.trace('Applying round', {
			queries_count: queries.length,
			rewards: roundRewards,
		});

		if (queries.length > 0) {
			return this.t.batch(queries);
		}
		return this.t;
	}

	/**
	 * Calls:
	 * - updateVotes
	 * - updateMissedBlocks
	 * - flushRound
	 * - applyRound
	 * - updateVotes
	 * - flushRound
	 *
	 * @returns {function} Call result
	 */
	land() {
		return this.updateVotes()
			.then(this.updateMissedBlocks.bind(this))
			.then(this.flushRound.bind(this))
			.then(this.applyRound.bind(this))
			.then(this.updateVotes.bind(this))
			.then(this.flushRound.bind(this))
			.then(this.updateDelegatesRanks.bind(this))
			.then(() => this.t);
	}

	/**
	 * Calls:
	 * - applyRound
	 * - flushRound
	 * - checkSnapshotAvailability
	 * - restoreRoundSnapshot
	 * - restoreVotesSnapshot
	 * - deleteRoundRewards
	 *
	 * @returns {function} Call result
	 */
	backwardLand() {
		return Promise.resolve()
			.then(this.applyRound.bind(this))
			.then(this.flushRound.bind(this))
			.then(this.checkSnapshotAvailability.bind(this))
			.then(this.restoreRoundSnapshot.bind(this))
			.then(this.restoreVotesSnapshot.bind(this))
			.then(this.deleteRoundRewards.bind(this))
			.then(this.updateDelegatesRanks.bind(this))
			.then(() => this.t);
	}
}

module.exports = Round;
