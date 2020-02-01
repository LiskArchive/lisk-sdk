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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as Debug from 'debug';
import { EventEmitter } from 'events';

import { EVENT_ROUND_CHANGED } from './constants';
import {
	DelegatesList,
	deleteDelegateListAfterRound,
	getForgerPublicKeysForRound,
} from './delegates_list';
import { Rounds } from './rounds';
import {
	Account,
	BlockHeader,
	Blocks,
	DPoSProcessingOptions,
	Earnings,
	RoundException,
	StateStore,
} from './types';

const debug = Debug('lisk:dpos:delegate_info');

interface DelegatesInfoConstructor {
	readonly blocks: Blocks;
	readonly rounds: Rounds;
	readonly activeDelegates: number;
	readonly events: EventEmitter;
	readonly delegatesList: DelegatesList;
	readonly exceptions: {
		readonly rounds?: { readonly [key: string]: RoundException };
	};
}

interface UniqueForgerInfo {
	/* tslint:disable:readonly-keyword */
	delegateAddress: string;
	earnings: Earnings;
	publicKey: string;
}

interface RoundSummary {
	readonly round: number;
	readonly uniqForgersInfo: ReadonlyArray<UniqueForgerInfo>;
	readonly totalFee: bigint;
}

interface ForgerInfo {
	/* tslint:disable:readonly-keyword */
	publicKey: string;
	reward: bigint;
	blocksForged: number;
	isGettingRemainingFees: boolean;
}

interface RewardOptions {
	readonly forgerInfo: ForgerInfo;
	readonly totalFee: bigint;
	readonly round: number;
}

interface AccountSummary {
	readonly uniqDelegateListWithRewardsInfo: ForgerInfo[];
	// tslint:disable-next-line:readonly-keyword
	totalFee: bigint;
}

const _isGenesisBlock = (block: BlockHeader) => block.height === 1;

const _hasVotedDelegatesPublicKeys = (account: Account) =>
	!!account.votedDelegatesPublicKeys &&
	account.votedDelegatesPublicKeys.length > 0;

// Update balance, rewards and fees to the forging delegates
const _updateBalanceRewardsAndFees = async (
	{ uniqForgersInfo }: RoundSummary,
	stateStore: StateStore,
	undo?: boolean,
): Promise<void> => {
	for (const {
		delegateAddress,
		earnings: { fee, reward },
	} of uniqForgersInfo) {
		const account = await stateStore.account.get(delegateAddress);

		const factor = undo ? BigInt(-1) : BigInt(1);
		const amount = fee + reward;
		const balance = BigInt(account.balance) + amount * factor;
		const fees = BigInt(account.fees) + fee * factor;
		const rewards = BigInt(account.rewards) + reward * factor;
		const updatedAccount = {
			...account,
			balance: balance.toString(),
			fees: fees.toString(),
			rewards: rewards.toString(),
		};
		stateStore.account.set(account.address, updatedAccount);
	}
};

// Update VoteWeight to accounts voted by delegates who forged
const _updateVotedDelegatesVoteWeight = async (
	{ uniqForgersInfo }: RoundSummary,
	stateStore: StateStore,
	undo?: boolean,
): Promise<void> => {
	for (const { delegateAddress, earnings } of uniqForgersInfo) {
		const forger = await stateStore.account.get(delegateAddress);
		if (!_hasVotedDelegatesPublicKeys(forger)) {
			continue;
		}
		for (const votedDelegatePublicKey of forger.votedDelegatesPublicKeys) {
			const account = await stateStore.account.get(
				getAddressFromPublicKey(votedDelegatePublicKey),
			);
			const amount = earnings.fee + earnings.reward;
			const factor = undo ? BigInt(-1) : BigInt(1);
			const updatedAccount: Account = {
				...account,
				voteWeight: (BigInt(account.voteWeight) + amount * factor).toString(),
			};
			stateStore.account.set(account.address, updatedAccount);
		}
	}
};

const _getMissedBlocksDelegatePublicKeys = async (
	stateStore: StateStore,
	{ round, uniqForgersInfo }: RoundSummary,
): Promise<string[]> => {
	const expectedForgingPublicKeys = await getForgerPublicKeysForRound(
		round,
		stateStore,
	);

	return expectedForgingPublicKeys.filter(
		expectedPublicKey =>
			!uniqForgersInfo.find(({ publicKey }) => publicKey === expectedPublicKey),
	);
};

const _updateMissedBlocks = async (
	roundSummary: RoundSummary,
	stateStore: StateStore,
	undo?: boolean,
): Promise<void> => {
	const missedBlocksDelegatePublicKeys = await _getMissedBlocksDelegatePublicKeys(
		stateStore,
		roundSummary,
	);

	if (!missedBlocksDelegatePublicKeys.length) {
		return;
	}

	for (const publicKey of missedBlocksDelegatePublicKeys) {
		const address = getAddressFromPublicKey(publicKey);
		const account = await stateStore.account.get(address);
		account.missedBlocks += undo ? -1 : 1;
		stateStore.account.set(address, account);
	}
};

export class DelegatesInfo {
	private readonly blocks: Blocks;
	private readonly rounds: Rounds;
	private readonly activeDelegates: number;
	private readonly events: EventEmitter;
	private readonly delegatesList: DelegatesList;
	private readonly exceptions: {
		readonly rounds?: { readonly [key: string]: RoundException };
	};

	public constructor({
		rounds,
		blocks,
		activeDelegates,
		events,
		delegatesList,
		exceptions,
	}: DelegatesInfoConstructor) {
		this.blocks = blocks;
		this.rounds = rounds;
		this.activeDelegates = activeDelegates;
		this.events = events;
		this.delegatesList = delegatesList;
		this.exceptions = exceptions;
	}

	public async apply(
		block: BlockHeader,
		stateStore: StateStore,
		{ delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<boolean> {
		const undo = false;

		return this._update(block, stateStore, { undo, delegateListRoundOffset });
	}

	public async undo(
		block: BlockHeader,
		stateStore: StateStore,
		{ delegateListRoundOffset }: DPoSProcessingOptions,
	): Promise<boolean> {
		const undo = true;

		// Never undo genesis block
		if (_isGenesisBlock(block)) {
			throw new Error('Cannot undo genesis block');
		}

		return this._update(block, stateStore, { undo, delegateListRoundOffset });
	}

	private async _update(
		block: BlockHeader,
		stateStore: StateStore,
		{ delegateListRoundOffset, undo }: DPoSProcessingOptions,
	): Promise<boolean> {
		await this._updateProducedBlocks(block, stateStore, undo);
		if (_isGenesisBlock(block)) {
			const intialRound = 1;
			for (
				// tslint:disable-next-line no-let
				let i = intialRound;
				i <= intialRound + delegateListRoundOffset;
				i += 1
			) {
				await this.delegatesList.createRoundDelegateList(i, stateStore);
			}

			return false;
		}

		if (!this._isLastBlockOfTheRound(block)) {
			return false;
		}

		// Perform updates that only happens in the end of the round
		const round = this.rounds.calcRound(block.height);

		const roundSummary = await this._summarizeRound(block);

		// Can NOT execute in parallel as _updateVotedDelegatesVoteWeight uses data updated on _updateBalanceRewardsAndFees
		await _updateMissedBlocks(roundSummary, stateStore, undo);
		await _updateBalanceRewardsAndFees(roundSummary, stateStore, undo);
		await _updateVotedDelegatesVoteWeight(roundSummary, stateStore, undo);

		if (undo) {
			const previousRound = round + 1;
			this.events.emit(EVENT_ROUND_CHANGED, {
				oldRound: previousRound,
				newRound: round,
			});
			await deleteDelegateListAfterRound(
				round + delegateListRoundOffset,
				stateStore,
			);
		} else {
			const nextRound = round + 1;
			this.events.emit(EVENT_ROUND_CHANGED, {
				oldRound: round,
				newRound: nextRound,
			});
			await this.delegatesList.createRoundDelegateList(
				round + delegateListRoundOffset,
				stateStore,
			);
		}

		return true;
	}

	// tslint:disable-next-line prefer-function-over-method
	private async _updateProducedBlocks(
		block: BlockHeader,
		stateStore: StateStore,
		undo?: boolean,
	): Promise<void> {
		const generator = await stateStore.account.get(
			getAddressFromPublicKey(block.generatorPublicKey),
		);
		generator.producedBlocks += undo ? -1 : 1;
		stateStore.account.set(generator.address, generator);
	}

	private _isLastBlockOfTheRound(block: BlockHeader): boolean {
		const round = this.rounds.calcRound(block.height);
		const nextRound = this.rounds.calcRound(block.height + 1);

		return round < nextRound;
	}

	/**
	 * Return an object that contains the summary of round information
	 * as delegates who forged, their earnings and accounts
	 */
	private async _summarizeRound(block: BlockHeader): Promise<RoundSummary> {
		const round = this.rounds.calcRound(block.height);
		debug('Calculating rewards and fees for round', round);

		const heightFrom = this.rounds.calcRoundStartHeight(round);
		const heightTo = this.rounds.calcRoundEndHeight(round) - 1;

		const blocksInRounds = await this.blocks.dataAccess.getBlockHeadersByHeightBetween(
			heightFrom,
			heightTo,
		);

		// The blocksInRounds does not contain the last block
		blocksInRounds.push(block);

		if (blocksInRounds.length !== this.activeDelegates) {
			throw new Error(
				'Fetched blocks do not match the size of the active delegates',
			);
		}

		const { uniqDelegateListWithRewardsInfo, totalFee } = blocksInRounds.reduce(
			(acc: AccountSummary, fetchedBlock: BlockHeader, i) => {
				acc.totalFee = acc.totalFee + BigInt(fetchedBlock.totalFee);

				const delegate = acc.uniqDelegateListWithRewardsInfo.find(
					({ publicKey }) => publicKey === fetchedBlock.generatorPublicKey,
				);

				if (!delegate) {
					acc.uniqDelegateListWithRewardsInfo.push({
						publicKey: fetchedBlock.generatorPublicKey,
						blocksForged: 1,
						reward: BigInt(fetchedBlock.reward),
						isGettingRemainingFees: i === blocksInRounds.length - 1,
					});

					return acc;
				}

				delegate.reward = delegate.reward + BigInt(fetchedBlock.reward);
				delegate.blocksForged += 1;
				delegate.isGettingRemainingFees = i === blocksInRounds.length - 1;

				return acc;
			},
			{
				uniqDelegateListWithRewardsInfo: [],
				totalFee: BigInt(0),
			},
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
				delegateAddress: getAddressFromPublicKey(forgerInfo.publicKey),
			}),
		);

		debug('Summed round', round, totalFee, uniqForgersInfo);

		return {
			round,
			totalFee,
			uniqForgersInfo,
		};
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
			delegateReward = delegateReward * BigInt(exceptionRound.rewards_factor);
			// Multiply with fees factor and add bonus
			calculatedTotalFee =
				calculatedTotalFee * BigInt(exceptionRound.fees_factor) +
				BigInt(exceptionRound.fees_bonus);
		}

		const feePerDelegate = calculatedTotalFee / BigInt(this.activeDelegates);
		// tslint:disable-next-line:no-let
		let fee = feePerDelegate * BigInt(forgerInfo.blocksForged);

		if (forgerInfo.isGettingRemainingFees) {
			const feesRemaining =
				calculatedTotalFee - feePerDelegate * BigInt(this.activeDelegates);
			fee += feesRemaining;
		}

		return {
			fee,
			reward: delegateReward,
		};
	}
}
