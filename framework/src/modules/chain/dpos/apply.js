const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const BigNum = require('@liskhq/bignum');
const {
	updateProducedBlocks,
	updateMissedBlocks,
	distributeRewardsAndFees,
} = require('./common');

class Apply {
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

	/**
	 * @param {Block} block
	 */
	async apply(block, tx) {
		const round = this.slots.calcRound(block.height);

		await this.updateProducedBlocks(block, tx);

		if (this.hasRoundFinished(block)) {
			const summarizedRound = await this.summarizeRound(block, tx);
			const nonForgedDelegateAddresses = await this.getNonForgedDelegateAddresses(
				round,
				summarizedRound.delegatePks
			);
			await this.updateMissedBlocks(nonForgedDelegateAddresses, tx);
			const updatedDelegates = await this.distributeRewardsAndFees(
				summarizedRound,
				tx
			);
			await this.updateVotes(updatedDelegates, tx);
		}
	}

	async updateProducedBlocks(block, tx) {
		const address = getAddressFromPublicKey(block.generatorPublicKey);
		const { method, filters, field, value } = updateProducedBlocks(address);

		return this.storage.entities.Account[method](filters, field, value, tx);
	}

	async updateMissedBlocks(nonForgedDelegateAddresses, tx) {
		const { method, filters, field, value } = updateMissedBlocks(
			nonForgedDelegateAddresses
		);

		return this.storage.entities.Account[method](filters, field, value, tx);
	}

	hasRoundFinished(block) {
		const round = this.slots.calcRound(block.height);
		const nextRound = this.slots.calcRound(block.height + 1);

		return round < nextRound || block.height === 1 || block.height === 101;
	}

	async summarizeRound(block, tx) {
		const round = this.slots.calcRound(block.height);
		this.logger.debug('Calculating rewards and fees for round: ', round);

		// When we need to sum round just after genesis block (height: 1)
		// - set data manually to 0, they will be distributed when actual round 1 is summed
		if (block.height === 1) {
			return {
				round,
				totalFee: 0,
				rewards: [0],
				delegatePks: [block.generatorPublicKey],
			};
		}

		try {
			const row = await this.storage.entities.Round.summedRound(
				round,
				this.activeDelegates,
				tx
			)[0];

			return {
				round,
				totalFee: new BigNum(Math.floor(row.fees).toPrecision(15)),
				rewards: row.rewards.map(
					reward => new BigNum(Math.floor(reward).toPrecision(15))
				),
				delegatePks: row.delegates,
			};
		} catch (err) {
			this.logger.error('Failed to sum round', round);
			this.logger.error(err);
			throw err;
		}
	}

	async getNonForgedDelegateAddresses(round, forgedDelegatesPks) {
		const roundDelegatesPks = await this.delegates.generateActiveDelegateList(
			round
		);

		return roundDelegatesPks
			.filter(roundDelegatePk => !forgedDelegatesPks.includes(roundDelegatePk))
			.map(delegate => getAddressFromPublicKey(delegate));
	}

	/**
	 *  @todo `round` parameter is only necessary for handling
	 * an exception in testnet in
	 * `calculateRewardAndFeePerDelegate` method. `round` argument
	 * can be safely removed when the exception on testnet was fixed.
	 */
	calculateRewardAndFeePerDelegate(
		totalFee,
		delegateReward,
		isGettingRemainingFees,
		round
	) {
		const exceptionRound = this.exceptions.rounds[round.toString()];
		if (exceptionRound) {
			// Apply rewards factor
			delegateReward = delegateReward
				.times(exceptionRound.rewards_factor)
				.floor();

			// Apply fees factor and bonus
			totalFee = totalFee
				.times(exceptionRound.fees_factor)
				.plus(exceptionRound.fees_bonus)
				.floor();
		}

		let fee = totalFee.dividedBy(this.activeDelegates).floor();
		const reward = delegateReward.floor() || 0;

		if (isGettingRemainingFees) {
			const feesRemaining = totalFee.minus(
				fee.times(this.scope.constants.activeDelegates)
			);
			fee = fee.plus(feesRemaining);
		}

		return {
			fee,
			reward,
			amount: fee.plus(reward),
		};
	}

	async distributeRewardsAndFees(
		{ round, totalFee, rewards, delegatePks },
		tx
	) {
		const updatedDelegates = delegatePks.map(
			async (delegatePublicKey, index) => {
				const address = getAddressFromPublicKey(delegatePublicKey);
				const isGettingRemainingFees = index === delegatePks.length - 1;

				const earnings = this.calculateRewardAndFeePerDelegate(
					totalFee,
					rewards[index],
					isGettingRemainingFees,
					round
				);

				const account = await this.storage.entities.Account.get(
					{ address },
					{ extended: true },
					tx
				);

				const data = distributeRewardsAndFees(account, earnings);

				await this.storage.entities.Account.update({ address }, data, tx);

				return {
					account,
					data,
				};
			}
		);

		return Promise.all(updatedDelegates);
	}

	async updateVotes(updatedDelegates, tx) {
		return updatedDelegates.forEach(async ({ account, data }) => {
			await this.storage.Account.increaseFieldBy(
				{
					publicKey_in: account.votedDelegatesPublicKeys,
				},
				'vote_new',
				data.amount,
				tx
			);
		});
	}
}

module.exports = { Apply };
