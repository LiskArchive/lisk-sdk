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

import * as BigNum from '@liskhq/bignum';
import { EventEmitter } from 'events';

import { EVENT_ROUND_CHANGED } from './constants';
import { DelegatesList } from './delegates_list';
import { Slots } from './slots';
import {
	Account,
	BigNumExtended,
	Block,
	DPoSProcessingOptions,
	DPoSProcessingUndoOptions,
	Earnings,
	Logger,
	RoundException,
	Storage,
	StorageTransaction,
} from './types';

interface DelegatesInfoConstructor {
	readonly storage: Storage;
	readonly slots: Slots;
	readonly activeDelegates: number;
	readonly logger: Logger;
	readonly events: EventEmitter;
	readonly delegatesList: DelegatesList;
	readonly exceptions: {
		readonly rounds?: { readonly [key: string]: RoundException };
	};
}

interface UniqueForgerInfo {
	/* tslint:disable:readonly-keyword */
	delegateAccount: Account;
	earnings: Earnings;
	publicKey: string;
}

interface RoundSummary {
	readonly round: number;
	readonly delegateListRoundOffset?: number;
	readonly uniqForgersInfo: ReadonlyArray<UniqueForgerInfo>;
	readonly totalFee: BigNum;
	readonly tx?: StorageTransaction;
}

interface ForgerInfo {
	/* tslint:disable:readonly-keyword */
	publicKey: string;
	reward: BigNum;
	blocksForged: number;
	isGettingRemainingFees: boolean;
}

interface RewardOptions {
	readonly forgerInfo: ForgerInfo;
	readonly totalFee: BigNum;
	readonly round: number;
}

interface AccountSummary {
	readonly delegatePublicKeys: string[];
	readonly uniqDelegateListWithRewardsInfo: ForgerInfo[];
	// tslint:disable-next-line:readonly-keyword
	totalFee: BigNum;
}

interface AccountFees {
	// tslint:disable-next-line:readonly-keyword
	[key: string]: BigNum;
}

const _isGenesisBlock = (block: Block) => block.height === 1;

const _hasVotedDelegatesPublicKeys = (forgerInfo: UniqueForgerInfo) =>
	!!forgerInfo.delegateAccount.votedDelegatesPublicKeys &&
	forgerInfo.delegateAccount.votedDelegatesPublicKeys.length > 0;

const _findDelegate = (
	parsedDelegateAccounts: Account[],
	delegatePublicKey: string,
) => {
	if (
		parsedDelegateAccounts.find(
			({ publicKey }) => publicKey === delegatePublicKey,
		)
	) {
		return parsedDelegateAccounts.filter(
			({ publicKey }) => publicKey === delegatePublicKey,
		)[0];
	}
	throw new Error(
		`Delegate: ${delegatePublicKey} was not found in parsed delegate accounts`,
	);
};

export class DelegatesInfo {
	private readonly storage: Storage;
	private readonly slots: Slots;
	private readonly activeDelegates: number;
	private readonly logger: Logger;
	private readonly events: EventEmitter;
	private readonly delegatesList: DelegatesList;
	private readonly exceptions: {
		readonly rounds?: { readonly [key: string]: RoundException };
	};

	public constructor({
		storage,
		slots,
		activeDelegates,
		logger,
		events,
		delegatesList,
		exceptions,
	}: DelegatesInfoConstructor) {
		this.storage = storage;
		this.slots = slots;
		this.activeDelegates = activeDelegates;
		this.logger = logger;
		this.events = events;
		this.delegatesList = delegatesList;
		this.exceptions = exceptions;
	}

	public async apply(
		block: Block,
		{ tx, delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<boolean> {
		const undo = false;

		return this._update(block, { undo, tx, delegateListRoundOffset });
	}

	public async undo(
		block: Block,
		{ tx, delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<boolean> {
		const undo = true;

		// Never undo genesis block
		if (_isGenesisBlock(block)) {
			throw new Error('Cannot undo genesis block');
		}

		return this._update(block, { undo, tx, delegateListRoundOffset });
	}

	private async _update(
		block: Block,
		{ undo, tx, delegateListRoundOffset }: DPoSProcessingUndoOptions,
	): Promise<boolean> {
		await this._updateProducedBlocks(block, undo, tx);

		/**
		 * Genesis block only affects `producedBlocks` attribute
		 */
		if (_isGenesisBlock(block)) {
			const round = 1;
			await this.delegatesList.createRoundDelegateList(round, tx);

			return false;
		}

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

	private async _updateProducedBlocks(
		block: Block,
		undo?: boolean,
		tx?: StorageTransaction,
	): Promise<void> {
		const filters = { publicKey: block.generatorPublicKey };
		const field = 'producedBlocks';
		const value = '1';
		const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

		await this.storage.entities.Account[method](filters, field, value, tx);
	}

	private async _updateMissedBlocks(
		roundSummary: RoundSummary,
		undo?: boolean,
		tx?: StorageTransaction,
	): Promise<void> {
		const missedBlocksDelegatePublicKeys = await this._getMissedBlocksDelegatePublicKeys(
			roundSummary,
		);

		if (!missedBlocksDelegatePublicKeys.length) {
			return;
		}

		const filters = { publicKey_in: missedBlocksDelegatePublicKeys };
		const field = 'missedBlocks';
		const value = '1';

		const method = undo ? 'decreaseFieldBy' : 'increaseFieldBy';

		await this.storage.entities.Account[method](filters, field, value, tx);
	}

	// Update balance, rewards and fees to the forging delegates
	private async _updateBalanceRewardsAndFees(
		{ uniqForgersInfo }: RoundSummary,
		undo?: boolean,
		tx?: StorageTransaction,
	): Promise<void> {
		const updateDelegatesPromise = uniqForgersInfo.map(
			async ({
				delegateAccount,
				earnings: { fee, reward },
			}: UniqueForgerInfo) => {
				const factor = undo ? -1 : 1;
				const amount = fee.plus(reward);
				const data = {
					balance: delegateAccount.balance.plus(amount.mul(factor)).toString(),
					fees: delegateAccount.fees.plus(fee.mul(factor)).toString(),
					rewards: delegateAccount.rewards.plus(reward.mul(factor)).toString(),
				};

				return this.storage.entities.Account.update(
					{ publicKey: delegateAccount.publicKey },
					data,
					{},
					tx,
				);
			},
		);

		await Promise.all(updateDelegatesPromise);
	}

	// Update VoteWeight to accounts voted by delegates who forged
	private async _updateVotedDelegatesVoteWeight(
		{ uniqForgersInfo }: RoundSummary,
		undo?: boolean,
		tx?: StorageTransaction,
	): Promise<void> {
		const publicKeysToUpdate = uniqForgersInfo
			.filter(_hasVotedDelegatesPublicKeys)
			.reduce(
				(
					acc: AccountFees,
					{ delegateAccount, earnings: { fee, reward } }: UniqueForgerInfo,
				) => {
					(delegateAccount as Account).votedDelegatesPublicKeys.forEach(
						publicKey =>
							(acc[publicKey] = acc[publicKey]
								? acc[publicKey].plus(fee.plus(reward))
								: fee.plus(reward)),
					);

					return acc;
				},
				{},
			);

		await Promise.all(
			Object.keys(publicKeysToUpdate).map(async publicKey => {
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

	private _isLastBlockOfTheRound(block: Block): boolean {
		const round = this.slots.calcRound(block.height);
		const nextRound = this.slots.calcRound(block.height + 1);

		return round < nextRound;
	}

	/**
	 * Return an object that contains the summary of round information
	 * as delegates who forged, their earnings and accounts
	 */
	private async _summarizeRound(
		block: Block,
		{ tx, delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<RoundSummary> {
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

		// The blocksInRounds does not contain the last block
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
			(acc: AccountSummary, fetchedBlock: Block, i) => {
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

			const parsedDelegateAccounts = delegateAccounts.map(
				(account: Account) => ({
					...account,
					balance: new BigNum(account.balance),
					rewards: new BigNum(account.rewards),
					fees: new BigNum(account.fees),
				}),
			);

			// Aggregate forger infor into one object
			const uniqForgersInfo = uniqDelegateListWithRewardsInfo.map(
				(forgerInfo: ForgerInfo) => ({
					...forgerInfo,
					earnings: this._calculateRewardAndFeeForDelegate({
						totalFee,
						forgerInfo,
						round,
					}),
					delegateAccount: _findDelegate(
						parsedDelegateAccounts,
						forgerInfo.publicKey,
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

	private async _getMissedBlocksDelegatePublicKeys({
		round,
		delegateListRoundOffset,
		uniqForgersInfo,
		tx,
	}: RoundSummary): Promise<string[]> {
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
	private _calculateRewardAndFeeForDelegate({
		forgerInfo,
		totalFee,
		round,
	}: RewardOptions): Earnings {
		const { rounds: exceptionsRounds = {} } = this.exceptions;
		const exceptionRound = exceptionsRounds[round.toString()];

		// tslint:disable-next-line:no-let
		let { reward: delegateReward } = forgerInfo;
		// tslint:disable-next-line:no-let
		let calculatedTotalFee = totalFee;

		if (exceptionRound) {
			// Multiply with rewards factor
			delegateReward = delegateReward.mul(exceptionRound.rewards_factor);
			// Multiply with fees factor and add bonus
			calculatedTotalFee = calculatedTotalFee
				.mul(exceptionRound.fees_factor)
				.plus(exceptionRound.fees_bonus);
		}

		const feePerDelegate = (calculatedTotalFee.div(
			this.activeDelegates,
		) as BigNumExtended).floor();
		// tslint:disable-next-line:no-let
		let fee = feePerDelegate.mul(forgerInfo.blocksForged);

		if (forgerInfo.isGettingRemainingFees) {
			const feesRemaining = calculatedTotalFee.sub(
				feePerDelegate.mul(this.activeDelegates),
			);
			fee = fee.plus(feesRemaining);
		}

		return {
			fee,
			reward: delegateReward,
		};
	}
}
