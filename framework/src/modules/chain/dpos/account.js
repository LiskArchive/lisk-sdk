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

const BigNum = require('@liskhq/bignum');

const _mergeRewardsAndDelegates = (delegatePublicKeys, rewards) =>
	delegatePublicKeys.reduce((accumulator, currentPublicKey, index) => {
		let delegate = accumulator.find(
			({ publicKey }) => publicKey === currentPublicKey,
		);

		if (!delegate) {
			delegate = {
				publicKey: currentPublicKey,
				reward: new BigNum(0),
				blocksForged: 0,
			};
			accumulator.push(delegate);
		}

		delegate.reward = delegate.reward.plus(rewards[index]);
		delegate.blocksForged += 1;
		delegate.isGettingRemainingFees = index === delegatePublicKeys.length - 1;

		return accumulator;
	}, []);

class Account {
	constructor({
		storage,
		slots,
		activeDelegates,
		logger,
		delegates,
		exceptions,
	}) {
		this.storage = storage;
		this.slots = slots;
		this.activeDelegates = activeDelegates;
		this.logger = logger;
		this.delegates = delegates;
		this.exceptions = exceptions;
	}

	async apply(block, tx) {
		return this._update(block, false, tx);
	}

	async undo(block, tx) {
		return this._update(block, true, tx);
	}

	/**
	 * @param {Block} block
	 */
	async _update(block, undo, tx) {
		// @todo add proper description
		if (block.height === 1) {
			return false;
		}

		await this._updateProducedBlocks(block, undo, tx);

		if (this._isLastBlockOfTheRound(block)) {
			const roundSummary = await this._summarizeRound(block, tx);

			const missedBlocksDelegatePublicKeys = await this._getMissedBlocksDelegatePublicKeys(
				roundSummary,
			);

			await this._updateMissedBlocks(missedBlocksDelegatePublicKeys, undo, tx);

			const updatedDelegates = await this._distributeRewardsAndFees(
				roundSummary,
				undo,
				tx,
			);
			await this._updateVotes(updatedDelegates, undo, tx);
		}

		return true;
	}

	async _updateProducedBlocks(block, undo, tx) {
		const filters = { publicKey_eq: block.generatorPublicKey };
		const field = 'producedBlocks';
		const value = '1';
		const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

		return this.storage.entities.Account[method](filters, field, value, tx);
	}

	async _updateMissedBlocks(missedBlocksDelegatePublicKeys, undo, tx) {
		if (!missedBlocksDelegatePublicKeys.length) {
			return false;
		}

		const filters = { publicKey_in: missedBlocksDelegatePublicKeys };
		const field = 'missedBlocks';
		const value = '1';

		const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

		return this.storage.entities.Account[method](filters, field, value, tx);
	}

	async _updateVotes(updatedDelegates, undo, tx) {
		return updatedDelegates.map(async ({ account, amount }) => {
			const filters = { publicKey_in: account.votedDelegatesPublicKeys };
			const field = 'voteWeightReceived';
			const value = amount.toString();

			const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

			return this.storage.entities.Account[method](filters, field, value, tx);
		});
	}

	async _distributeRewardsAndFees(roundSummary, undo, tx) {
		const delegatesWithEarnings = this._getDelegatesWithTheirEarnings(
			roundSummary,
		);

		const updatedDelegates = delegatesWithEarnings
			// update delegate accounts with their earnings
			.map(async ({ delegatePublicKey, earnings }) => {
				const account = await this.storage.entities.Account.get(
					{ publicKey_eq: delegatePublicKey },
					{ extended: true },
					tx,
				);

				const { fee, reward } = earnings;

				const factor = undo ? -1 : 1;
				const amount = fee.plus(reward);
				const data = {
					...account,
					balance: account.balance.plus(amount.times(factor)),
					fees: account.fees.plus(fee.times(factor)),
					rewards: account.rewards.plus(reward.times(factor)),
				};

				await this.storage.entities.Account.update(
					{ publicKey_eq: delegatePublicKey },
					data,
					tx,
				);

				return {
					account,
					amount,
				};
			});

		return Promise.all(updatedDelegates);
	}

	_isLastBlockOfTheRound(block) {
		const round = this.slots.calcRound(block.height);
		const nextRound = this.slots.calcRound(block.height + 1);

		return round < nextRound || block.height === 1;
	}

	async _summarizeRound(block, tx) {
		const round = this.slots.calcRound(block.height);
		this.logger.debug('Calculating rewards and fees for round: ', round);

		try {
			// summedRound always returns 101 delegates,
			// that means there can be recurring public keys for delegates
			// who forged multiple times.
			const [row] = await this.storage.entities.Round.summedRound(
				round,
				this.activeDelegates,
				tx,
			);

			// Array of unique delegates with their rewards aggregated
			const roundForgerDelegateList = _mergeRewardsAndDelegates(
				row.delegates,
				row.rewards,
			);

			return {
				round,
				totalFee: new BigNum(row.fees),
				roundForgerDelegateList,
			};
		} catch (err) {
			this.logger.error('Failed to sum round', round);
			this.logger.error(err);
			throw err;
		}
	}

	async _getMissedBlocksDelegatePublicKeys({ round, roundForgerDelegateList }) {
		const expectedForgingPublicKeys = await this.delegates.generateActiveDelegateList(
			round,
		);

		return expectedForgingPublicKeys.filter(
			expectedPublicKey =>
				!roundForgerDelegateList.find(
					({ publicKey }) => publicKey === expectedPublicKey,
				),
		);
	}

	/**
	 *  @todo `round` parameter is only necessary for handling
	 * an exception in testnet in
	 * `_calculateRewardAndFeePerDelegate` method. `round` argument
	 * can be safely removed when the exception on testnet was fixed.
	 */
	_calculateRewardAndFeeForDelegate({ totalFee, forgedDelegate, round }) {
		const { rounds = {} } = this.exceptions;
		const exceptionRound = rounds[round.toString()];
		let delegateReward = forgedDelegate.reward;
		if (exceptionRound) {
			// Multiply with rewards factor
			delegateReward = delegateReward.times(exceptionRound.rewards_factor);

			// Multiply with fees factor and add bonus
			totalFee = totalFee
				.times(exceptionRound.fees_factor)
				.plus(exceptionRound.fees_bonus);
		}

		const reward = delegateReward;

		const feePerDelegate = totalFee.div(this.activeDelegates).floor();
		let fee = feePerDelegate.times(forgedDelegate.blocksForged);

		if (forgedDelegate.isGettingRemainingFees) {
			const feesRemaining = totalFee.minus(
				feePerDelegate.times(this.activeDelegates),
			);
			fee = fee.plus(feesRemaining);
		}

		return {
			fee,
			reward,
		};
	}

	_getDelegatesWithTheirEarnings(roundSummary) {
		const { round, totalFee, roundForgerDelegateList } = roundSummary;
		return (
			roundForgerDelegateList
				// calculate delegate earnings
				.map(forgedDelegate => {
					const earnings = this._calculateRewardAndFeeForDelegate({
						totalFee,
						forgedDelegate,
						round,
					});

					return {
						delegatePublicKey: forgedDelegate.publicKey,
						earnings,
					};
				})
		);
	}
}

module.exports = { Account };
