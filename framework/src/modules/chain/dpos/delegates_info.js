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
	delegatePublicKeys
		.map((publicKey, index) => ({
			publicKey,
			reward: new BigNum(rewards[index]),
			blocksForged: 1,
			isGettingRemainingFees: index === delegatePublicKeys.length - 1,
		}))
		.reduce((acc, curr) => {
			const delegate = acc.find(
				({ publicKey }) => publicKey === curr.publicKey,
			);

			if (!delegate) {
				acc.push(curr);
				return acc;
			}

			delegate.reward = delegate.reward.plus(curr.reward);
			delegate.blocksForged += curr.blocksForged;
			delegate.isGettingRemainingFees = curr.isGettingRemainingFees;

			return acc;
		}, []);

const _hasVotedDelegatesPublicKeys = ({
	delegateAccount: { votedDelegatesPublicKeys },
}) => !!votedDelegatesPublicKeys && votedDelegatesPublicKeys.length > 0;

class DelegatesInfo {
	constructor({
		storage,
		slots,
		activeDelegates,
		logger,
		delegatesList,
		exceptions,
	}) {
		this.storage = storage;
		this.slots = slots;
		this.activeDelegates = activeDelegates;
		this.logger = logger;
		this.delegatesList = delegatesList;
		this.exceptions = exceptions;
	}

	async apply(block, tx) {
		const undo = false;

		/**
		 * If the block height is 1, that means the block is
		 * the genesis block, in that case we don't have to
		 * update anything in the accounts.
		 */
		if (this._isGenesisBlock(block)) {
			const round = 1;
			await this.delegatesList.createRoundDelegateList(round, tx);
			return false;
		}

		return this._update(block, undo, tx);
	}

	async undo(block, tx) {
		const undo = true;

		// Never undo genesis block
		if (this._isGenesisBlock(block)) {
			throw new Error('Cannot undo genesis block');
		}
		return this._update(block, undo, tx);
	}

	/**
	 * @param {Block} block
	 */
	async _update(block, undo, tx) {
		await this._updateProducedBlocks(block, undo, tx);

		// Perform updates that only happens in the end of the round
		if (this._isLastBlockOfTheRound(block)) {
			const round = this.slots.calcRound(block.height);

			const roundSummary = await this._summarizeRound(block, tx);

			await Promise.all([
				this._updateMissedBlocks(roundSummary, undo, tx),
				this._updateBalanceRewardsAndFees(roundSummary, undo, tx),
				this._updateVotedDelegatesVoteWeight(roundSummary, undo, tx),
			]);

			if (undo) {
				/**
				 * If we are reverting the block, new transactions
				 * can change vote weight of delegates, so we need to
				 * invalidate the cache for the next rounds.
				 */
				await this.delegatesList.deleteDelegateListAfterRound(round, tx);
			} else {
				// Create round delegate list
				const nextRound = round + 1;
				await this.delegatesList.createRoundDelegateList(nextRound, tx);
			}
		}

		return true;
	}

	async _updateProducedBlocks(block, undo, tx) {
		const filters = { publicKey: block.generatorPublicKey };
		const field = 'producedBlocks';
		const value = '1';
		const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

		return this.storage.entities.Account[method](filters, field, value, tx);
	}

	async _updateMissedBlocks(roundSummary, undo, tx) {
		const missedBlocksDelegatePublicKeys = await this._getMissedBlocksDelegatePublicKeys(
			roundSummary,
		);

		if (!missedBlocksDelegatePublicKeys.length) {
			return false;
		}

		const filters = { publicKey_in: missedBlocksDelegatePublicKeys };
		const field = 'missedBlocks';
		const value = '1';

		const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

		return this.storage.entities.Account[method](filters, field, value, tx);
	}

	// update balance, rewards and fees to the forging delegates
	async _updateBalanceRewardsAndFees({ uniqForgersInfo }, undo, tx) {
		const updateDelegatesPromise = uniqForgersInfo.map(
			({ delegateAccount, earnings: { fee, reward } }) => {
				const factor = undo ? -1 : 1;
				const amount = fee.plus(reward);
				const data = {
					balance: delegateAccount.balance
						.plus(amount.times(factor))
						.toString(),
					fees: delegateAccount.fees.plus(fee.times(factor)).toString(),
					rewards: delegateAccount.rewards
						.plus(reward.times(factor))
						.toString(),
				};

				return this.storage.entities.Account.update(
					{ publicKey: delegateAccount.publicKey },
					data,
					{},
					tx,
				);
			},
		);

		return Promise.all(updateDelegatesPromise);
	}

	// update VoteWeight to accounts voted by delegates who forged
	async _updateVotedDelegatesVoteWeight({ uniqForgersInfo }, undo, tx) {
		return Promise.all(
			uniqForgersInfo
				.filter(_hasVotedDelegatesPublicKeys)
				.map(({ delegateAccount, earnings: { fee, reward } }) => {
					const amount = fee.plus(reward);

					const filters = {
						publicKey_in: delegateAccount.votedDelegatesPublicKeys,
					};
					const field = 'voteWeight';
					const value = amount.toString();

					const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

					return this.storage.entities.Account[method](
						filters,
						field,
						value,
						tx,
					);
				}),
		);
	}

	// eslint-disable-next-line class-methods-use-this
	_isGenesisBlock(block) {
		return block.height === 1;
	}

	_isLastBlockOfTheRound(block) {
		const round = this.slots.calcRound(block.height);
		const nextRound = this.slots.calcRound(block.height + 1);

		return round < nextRound;
	}

	/**
	 * Return an object that contains the summary of round information
	 * as delegates who forged, their earnings and accounts
	 *
	 * @private
	 * @param {block} block - Current block
	 * @param {Object} [tx] - SQL transaction
	 * @returns {Object} { round, totalFee, uniqForgersInfo }
	 * @returns {Object} { uniqForgersInfo: [{ publicKey, reward, blocksForged, isGettingRemainingFees, earnings, delegateAccount }] }
	 * @returns {Object} { earnings: { fee, reward } }
	 * @returns {Object} { delegateAccount: AccountEntity }
	 */
	async _summarizeRound(block, tx) {
		const round = this.slots.calcRound(block.height);
		this.logger.debug('Calculating rewards and fees for round: ', round);

		try {
			// summedRound always returns 101 delegates,
			// that means there can be recurring public keys for delegates
			// who forged multiple times.
			const [
				summedRound,
			] = await this.storage.entities.RoundDelegates.summedRound(
				round,
				this.activeDelegates,
				tx,
			);

			// Array of unique delegates with their rewards aggregated
			const uniqDelegateListWithRewardsInfo = _mergeRewardsAndDelegates(
				summedRound.delegates,
				summedRound.rewards,
			);

			const delegateAccounts = await this.storage.entities.Account.get(
				{ publicKey_in: summedRound.delegates },
				{ extended: true },
				tx,
			);

			const parsedDelegateAccounts = delegateAccounts.map(account => ({
				...account,
				balance: new BigNum(account.balance),
				rewards: new BigNum(account.rewards),
				fees: new BigNum(account.fees),
			}));

			const totalFee = new BigNum(summedRound.fees);

			// Aggregate forger infor into one object
			const uniqForgersInfo = uniqDelegateListWithRewardsInfo.map(
				forgerInfo => ({
					...forgerInfo,
					earnings: this._calculateRewardAndFeeForDelegate({
						totalFee,
						forgerInfo,
						round,
					}),
					delegateAccount: parsedDelegateAccounts.find(
						({ publicKey }) => publicKey === forgerInfo.publicKey,
					),
				}),
			);

			return {
				round,
				totalFee,
				uniqForgersInfo,
			};
		} catch (error) {
			this.logger.error({ error, round }, 'Failed to sum round');
			throw error;
		}
	}

	async _getMissedBlocksDelegatePublicKeys({ round, uniqForgersInfo }) {
		const expectedForgingPublicKeys = await this.delegatesList.getForgerPublicKeysForRound(
			round,
		);

		return expectedForgingPublicKeys.filter(
			expectedPublicKey =>
				!uniqForgersInfo.find(
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
	_calculateRewardAndFeeForDelegate({ forgerInfo, totalFee, round }) {
		const { rounds: exceptionsRounds = {} } = this.exceptions;
		const exceptionRound = exceptionsRounds[round.toString()];

		let { reward: delegateReward } = forgerInfo;
		let calculatedTotalFee = totalFee;

		if (exceptionRound) {
			// Multiply with rewards factor
			delegateReward = delegateReward.times(exceptionRound.rewards_factor);
			// Multiply with fees factor and add bonus
			calculatedTotalFee = calculatedTotalFee
				.times(exceptionRound.fees_factor)
				.plus(exceptionRound.fees_bonus);
		}

		const feePerDelegate = calculatedTotalFee.div(this.activeDelegates).floor();
		let fee = feePerDelegate.times(forgerInfo.blocksForged);

		if (forgerInfo.isGettingRemainingFees) {
			const feesRemaining = calculatedTotalFee.minus(
				feePerDelegate.times(this.activeDelegates),
			);
			fee = fee.plus(feesRemaining);
		}

		return {
			fee,
			reward: delegateReward,
		};
	}
}

module.exports = { DelegatesInfo };
