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

const Promise = require('bluebird');
const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const BigNum = require('@liskhq/bignum');

/**
 * Validates required scope properties.
 *
 * @class
 * @memberof rounds
 * @see Parent: {@link rounds}
 * @requires bluebird
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
				account: scope.library.account,
				logger: scope.library.logger,
				storage: scope.library.storage,
			},
			block: {
				generatorPublicKey: scope.block.generatorPublicKey,
				id: scope.block.id,
				height: scope.block.height,
				timestamp: scope.block.timestamp,
			},
			constants: scope.library.constants,
			exceptions: scope.library.exceptions,
		};
		this.t = t;

		// List of required scope properties
		let requiredProperties = ['library', 'block', 'round', 'backwards'];

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
				throw new Error(`Missing required scope property: ${property}`);
			}
		});
	}

	/**
	 * Returns result from call to logic.account.merge.
	 *
	 * @returns {function} Promise
	 * @todo Check type and description of the return value
	 */
	mergeBlockGenerator() {
		const self = this;
		return new Promise((resolve, reject) => {
			const data = {
				publicKey: self.scope.block.generatorPublicKey,
				producedBlocks: self.scope.backwards ? -1 : 1,
				round: self.scope.round,
			};

			const address = getAddressFromPublicKey(data.publicKey);

			self.scope.library.account.merge(
				address,
				data,
				(err, account) => {
					if (err) {
						return reject(err);
					}
					return resolve(account);
				},
				self.t,
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

		const filters = { address_in: this.scope.roundOutsiders };
		const field = 'missedBlocks';
		const value = '1';

		if (this.scope.backwards) {
			return this.scope.library.storage.entities.Account.decreaseFieldBy(
				filters,
				field,
				value,
				this.t,
			);
		}

		return this.scope.library.storage.entities.Account.increaseFieldBy(
			filters,
			field,
			value,
			this.t,
		);
	}

	/**
	 * Calls sql getVotes from `mem_round` table.
	 *
	 * @todo Round must be a param option
	 * @todo Add @returns tag
	 */
	getVotes() {
		return this.scope.library.storage.entities.Round.getTotalVotedAmount(
			{ round: this.scope.round },
			{},
			this.t,
		);
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
				self.scope.library.storage.entities.Account.increaseFieldBy(
					{
						address: getAddressFromPublicKey(vote.delegate),
					},
					'vote',
					// Have to revert the logic to not use bignumber. it was causing change
					// in vote amount. More details can be found on the issue.
					// 		new Bignum(vote.amount).integerValue(Bignum.ROUND_FLOOR)
					// TODO: https://github.com/LiskHQ/lisk/issues/2423
					Math.floor(vote.amount),
					this.t,
				),
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
		return this.scope.library.storage.entities.Round.delete(
			{
				round: this.scope.round,
			},
			{},
			this.t,
		);
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
		return this.scope.library.storage.entities.Round.restoreRoundSnapshot(
			this.t,
		);
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
		return this.scope.library.storage.entities.Round.restoreVotesSnapshot(
			this.t,
		);
	}

	/**
	 * Checks round snapshot availability for current round.
	 *
	 * @returns {Promise}
	 */
	checkSnapshotAvailability() {
		return this.scope.library.storage.entities.Round.checkSnapshotAvailability(
			this.scope.round,
			this.t,
		).then(isAvailable => {
			if (!isAvailable) {
				// Snapshot for current round is not available, check if round snapshot table is empty,
				// because we need to allow to restore snapshot in that case (no transactions during entire round)
				return this.scope.library.storage.entities.Round.countRoundSnapshot(
					this.t,
				).then(count => {
					// Throw an error when round snapshot table is not empty
					if (count) {
						throw new Error(
							`Snapshot for round ${this.scope.round} not available`,
						);
					}
				});
			}
			return null;
		});
	}

	/**
	 * Calls sql updateDelegatesRanks: Update current ranks of all delegates
	 *
	 * @returns {Promise}
	 */
	updateDelegatesRanks() {
		this.scope.library.logger.debug('Updating ranks of all delegates...');
		return this.scope.library.storage.entities.Account.syncDelegatesRanks(
			this.t,
		);
	}

	/**
	 * Calls sql deleteRoundRewards:
	 * - Removes rewards for entire round from round_rewards table.
	 * - Performed only when rollback last block of round.
	 * @returns {function} Promise
	 */
	deleteRoundRewards() {
		this.scope.library.logger.debug(
			`Deleting rewards for round ${this.scope.round}`,
		);
		return this.scope.library.storage.entities.Round.deleteRoundRewards(
			this.scope.round,
			this.t,
		);
	}

	/**
	 * Calculates rewards at round position.
	 * Fees and feesRemaining based on slots.
	 *
	 * @param {number} index
	 * @returns {Object} With fees, feesRemaining, rewards, balance
	 */
	rewardsAtRound(index) {
		let roundFees = Math.floor(this.scope.roundFees) || 0;
		const roundRewards = [...this.scope.roundRewards] || [];

		// Apply exception for round if required
		if (this.scope.exceptions.rounds[this.scope.round.toString()]) {
			// Apply rewards factor
			roundRewards.forEach((reward, subIndex) => {
				roundRewards[subIndex] = new BigNum(reward.toPrecision(15))
					.times(
						this.scope.exceptions.rounds[this.scope.round.toString()]
							.rewards_factor,
					)
					.floor();
			});

			// Apply fees factor and bonus
			roundFees = new BigNum(roundFees.toPrecision(15))
				.times(
					this.scope.exceptions.rounds[this.scope.round.toString()].fees_factor,
				)
				.plus(
					this.scope.exceptions.rounds[this.scope.round.toString()].fees_bonus,
				)
				.floor();
		}

		const fees = new BigNum(roundFees.toPrecision(15))
			.dividedBy(this.scope.constants.activeDelegates)
			.floor();
		const feesRemaining = new BigNum(roundFees.toPrecision(15)).minus(
			fees.times(this.scope.constants.activeDelegates),
		);
		const rewards =
			new BigNum(roundRewards[index].toPrecision(15)).floor() || 0;

		return {
			fees: Number(fees.toFixed()),
			feesRemaining: Number(feesRemaining.toFixed()),
			rewards: Number(rewards.toFixed()),
			balance: Number(fees.plus(rewards).toFixed()),
		};
	}

	/**
	 * For each delegate calls logic.account.merge and creates an address array.
	 *
	 * @returns {function} Promise with address array
	 */
	applyRound() {
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
		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < self.scope.roundDelegates.length; i++) {
			delegate = self.scope.roundDelegates[i];
			changes = this.rewardsAtRound(i);

			this.scope.library.logger.trace('Delegate changes', {
				delegate,
				changes,
			});

			const accountData = {
				publicKey: delegate,
				balance: self.scope.backwards ? -changes.balance : changes.balance,
				round: self.scope.round,
				fees: self.scope.backwards ? -changes.fees : changes.fees,
				rewards: self.scope.backwards ? -changes.rewards : changes.rewards,
			};

			const address = getAddressFromPublicKey(accountData.publicKey);

			p = new Promise((resolve, reject) => {
				self.scope.library.account.merge(
					address,
					accountData,
					(err, account) => {
						if (err) {
							return reject(err);
						}
						return resolve(account);
					},
					self.t,
				);
			});

			queries.push(p);

			// Aggregate round rewards data - when going forward
			if (!self.scope.backwards) {
				roundRewards.push({
					timestamp: self.scope.block.timestamp,
					fees: new BigNum(changes.fees).toString(),
					reward: new BigNum(changes.rewards).toString(),
					round: self.scope.round,
					publicKey: delegate,
				});
			}
		}

		// Decide which delegate receives fees remainder
		const remainderIndex = this.scope.backwards ? 0 : delegates.length - 1;
		const remainderDelegate = delegates[remainderIndex];

		// Get round changes for chosen delegate
		changes = this.rewardsAtRound(remainderIndex);

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
				const data = {
					publicKey: remainderDelegate,
					balance: feesRemaining,
					round: self.scope.round,
					fees: feesRemaining,
				};

				const address = getAddressFromPublicKey(data.publicKey);

				self.scope.library.account.merge(
					address,
					data,
					(err, account) => {
						if (err) {
							return reject(err);
						}
						return resolve(account);
					},
					self.t,
				);
			});

			// Aggregate round rewards data (remaining fees) - when going forward
			if (!self.scope.backwards) {
				roundRewards[roundRewards.length - 1].fees = new BigNum(
					roundRewards[roundRewards.length - 1].fees,
				)
					.plus(feesRemaining)
					.toString();
			}

			queries.push(p);
		}

		// Prepare queries for inserting round rewards
		roundRewards.forEach(item => {
			queries.push(
				self.scope.library.storage.entities.Round.createRoundRewards(
					{
						timestamp: item.timestamp,
						fees: item.fees,
						reward: item.reward,
						round: item.round,
						publicKey: item.publicKey,
					},
					self.t,
				),
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
