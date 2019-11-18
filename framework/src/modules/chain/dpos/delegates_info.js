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
const { EVENT_ROUND_CHANGED } = require('./constants');

const _isGenesisBlock = block => block.height === 1;

const _hasVotedDelegatesPublicKeys = ({
	delegateAccount: { votedDelegatesPublicKeys },
}) => !!votedDelegatesPublicKeys && votedDelegatesPublicKeys.length > 0;

class DelegatesInfo {
	constructor({
		storage,
		slots,
		activeDelegates,
		logger,
		events,
		delegatesList,
		exceptions,
	}) {
		this.storage = storage;
		this.slots = slots;
		this.activeDelegates = activeDelegates;
		this.logger = logger;
		this.events = events;
		this.delegatesList = delegatesList;
		this.exceptions = exceptions;
	}

	async apply(block, { tx, delegateListRoundOffset }) {
		const undo = false;

		/**
		 * If the block is genesis block, we don't have to
		 * update anything in the accounts.
		 */
		if (_isGenesisBlock(block)) {
			const round = 1;
			await this.delegatesList.createRoundDelegateList(round, tx);
			return false;
		}

		return this._update(block, { undo, tx, delegateListRoundOffset });
	}

	async undo(block, { tx, delegateListRoundOffset }) {
		const undo = true;

		// Never undo genesis block
		if (_isGenesisBlock(block)) {
			throw new Error('Cannot undo genesis block');
		}
		return this._update(block, { undo, tx, delegateListRoundOffset });
	}

	/**
	 * @param {Block} block
	 */
	async _update(block, { undo, tx, delegateListRoundOffset }) {
		await this._updateProducedBlocks(block, undo, tx);

		// Perform updates that only happens in the end of the round
		if (this._isLastBlockOfTheRound(block)) {
			const round = this.slots.calcRound(block.height);

			const roundSummary = await this._summarizeRound(block, {
				tx,
				delegateListRoundOffset,
			});

			// Can NOT execute in parallel as _updateVotedDelegatesVoteWeight uses data updated on _updateBalanceRewardsAndFees
			await this._updateMissedBlocks(roundSummary, undo, tx);
			await this._updateBalanceRewardsAndFees(roundSummary, undo, tx);
			await this._updateVotedDelegatesVoteWeight(roundSummary, undo, tx);

			if (undo) {
				const previousRound = round + 1;
				this.events.emit(EVENT_ROUND_CHANGED, {
					oldRound: previousRound,
					newRound: round,
				});

				/**
				 * If we are reverting the block, new transactions
				 * can change vote weight of delegates, so we need to
				 * invalidate the state store cache for the next rounds.
				 */
				await this.delegatesList.deleteDelegateListAfterRound(round, tx);
			} else {
				const nextRound = round + 1;
				this.events.emit(EVENT_ROUND_CHANGED, {
					oldRound: round,
					newRound: nextRound,
				});

				// Create round delegate list
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
			tx,
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
		const publicKeysToUpdate = uniqForgersInfo
			.filter(_hasVotedDelegatesPublicKeys)
			.reduce((acc, { delegateAccount, earnings: { fee, reward } }) => {
				delegateAccount.votedDelegatesPublicKeys.forEach(publicKey => {
					if (acc[publicKey]) {
						acc[publicKey] = acc[publicKey].plus(fee.plus(reward));
					} else {
						acc[publicKey] = fee.plus(reward);
					}
				});
				return acc;
			}, {});

		return Promise.all(
			Object.keys(publicKeysToUpdate).map(publicKey => {
				const field = 'voteWeight';
				const value = publicKeysToUpdate[publicKey].toString();
				const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

				return this.storage.entities.Account[method](
					{ publicKey },
					field,
					value,
					tx,
				);
			}),
		);
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
	async _summarizeRound(block, { tx, delegateListRoundOffset }) {
		const round = this.slots.calcRound(block.height);
		this.logger.debug('Calculating rewards and fees for round: ', round);

		const blocksInRounds = await this.storage.entities.Block.get(
			{
				height_gte: this.slots.calcRoundStartHeight(round),
				height_lt: this.slots.calcRoundEndHeight(round),
			},
			{ limit: this.activeDelegates, sort: 'height:asc' },
			tx,
		);

		// the blocksInRounds does not contain the last block
		blocksInRounds.push(block);

		if (blocksInRounds.length !== this.activeDelegates) {
			throw new Error(
				'Fetched blocks do not match the size of the active delegates',
			);
		}

		const {
			delegatePublicKeys,
			uniqDelegateListWithRewardsInfo,
			totalFee,
		} = blocksInRounds.reduce(
			(acc, fetchedBlock, i) => {
				acc.totalFee = acc.totalFee.add(fetchedBlock.totalFee);

				const delegate = acc.uniqDelegateListWithRewardsInfo.find(
					({ publicKey }) => publicKey === fetchedBlock.generatorPublicKey,
				);

				if (!delegate) {
					acc.uniqDelegateListWithRewardsInfo.push({
						publicKey: fetchedBlock.generatorPublicKey,
						blocksForged: 1,
						reward: new BigNum(fetchedBlock.reward),
						isGettingRemainingFees: i === blocksInRounds.length - 1,
					});
					acc.delegatePublicKeys.push(fetchedBlock.generatorPublicKey);
					return acc;
				}
				delegate.reward = delegate.reward.add(fetchedBlock.reward);
				delegate.blocksForged += 1;
				delegate.isGettingRemainingFees = i === blocksInRounds.length - 1;
				return acc;
			},
			{
				delegatePublicKeys: [],
				uniqDelegateListWithRewardsInfo: [],
				totalFee: new BigNum(0),
			},
		);

		try {
			const delegateAccounts = await this.storage.entities.Account.get(
				{ publicKey_in: delegatePublicKeys },
				{},
				tx,
			);

			const parsedDelegateAccounts = delegateAccounts.map(account => ({
				...account,
				balance: new BigNum(account.balance),
				rewards: new BigNum(account.rewards),
				fees: new BigNum(account.fees),
			}));

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
				delegateListRoundOffset,
				totalFee,
				uniqForgersInfo,
			};
		} catch (error) {
			this.logger.error({ error, round }, 'Failed to sum round');
			throw error;
		}
	}

	async _getMissedBlocksDelegatePublicKeys({
		round,
		delegateListRoundOffset,
		uniqForgersInfo,
		tx,
	}) {
		const expectedForgingPublicKeys = await this.delegatesList.getForgerPublicKeysForRound(
			round,
			delegateListRoundOffset,
			tx,
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

module.exports = { DelegatesInfo, EVENT_ROUND_CHANGED };
