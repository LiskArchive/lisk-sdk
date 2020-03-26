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

import { hash } from '@liskhq/lisk-cryptography';
import * as Debug from 'debug';

import {
	CONSENSUS_STATE_FORGERS_LIST_KEY,
	CONSENSUS_STATE_VOTE_WEIGHTS_KEY,
	DEFAULT_ROUND_OFFSET,
	PUNISHMENT_PERIOD,
} from './constants';
import { Rounds } from './rounds';
import {
	Account,
	BlockHeader,
	Chain,
	ForgerList,
	ForgersList,
	StateStore,
	VoteWeights,
} from './types';

const debug = Debug('lisk:dpos:delegate_list');

interface DelegatesListConstructor {
	readonly rounds: Rounds;
	readonly activeDelegates: number;
	readonly standbyDelegates: number;
	readonly voteWeightCapRate: number;
	readonly standbyThreshold: bigint;
	readonly chain: Chain;
	readonly exceptions: {
		readonly ignoreDelegateListCacheForRounds?: ReadonlyArray<number>;
	};
}

export const getForgersList = async (
	stateStore: StateStore,
): Promise<ForgersList> => {
	const forgersListStr = await stateStore.consensus.get(
		CONSENSUS_STATE_FORGERS_LIST_KEY,
	);
	if (!forgersListStr) {
		return [];
	}

	return JSON.parse(forgersListStr) as ForgersList;
};

const _setForgersList = (
	stateStore: StateStore,
	forgersList: ForgersList,
): void => {
	const forgersListStr = JSON.stringify(forgersList);
	stateStore.consensus.set(CONSENSUS_STATE_FORGERS_LIST_KEY, forgersListStr);
};

export const getVoteWeights = async (
	stateStore: StateStore,
): Promise<VoteWeights> => {
	const voteWeightsStr = await stateStore.consensus.get(
		CONSENSUS_STATE_VOTE_WEIGHTS_KEY,
	);
	if (!voteWeightsStr) {
		return [];
	}

	return JSON.parse(voteWeightsStr) as VoteWeights;
};

const _setVoteWeights = (
	stateStore: StateStore,
	voteWeights: VoteWeights,
): void => {
	const voteWeightsStr = JSON.stringify(voteWeights);
	stateStore.consensus.set(CONSENSUS_STATE_VOTE_WEIGHTS_KEY, voteWeightsStr);
};

export const deleteDelegateListUntilRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	debug('Deleting list until round: ', round);
	const forgersList = await getForgersList(stateStore);
	const newForgersList = forgersList.filter(fl => fl.round >= round);
	_setForgersList(stateStore, newForgersList);
};

export const deleteDelegateListAfterRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	debug('Deleting list after round: ', round);
	const forgersList = await getForgersList(stateStore);
	const newForgersList = forgersList.filter(fl => fl.round <= round);
	_setForgersList(stateStore, newForgersList);
};

export const deleteVoteWeightsUntilRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	debug('Deleting voteWeights until round: ', round);
	const voteWeights = await getVoteWeights(stateStore);
	const newVoteWeights = voteWeights.filter(vw => vw.round >= round);
	_setVoteWeights(stateStore, newVoteWeights);
};

export const deleteVoteWeightsAfterRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	debug('Deleting voteWeights after round: ', round);
	const voteWeights = await getVoteWeights(stateStore);
	const newVoteWeights = voteWeights.filter(vw => vw.round <= round);
	_setVoteWeights(stateStore, newVoteWeights);
};

export const shuffleDelegateListForRound = (
	round: number,
	list: ReadonlyArray<string>,
): ReadonlyArray<string> => {
	const seedSource = round.toString();
	const delegateList = [...list];
	// tslint:disable-next-line:no-let
	let currentSeed = hash(seedSource, 'utf8');

	// tslint:disable-next-line one-variable-per-declaration no-let increment-decrement
	for (let i = 0, delCount = delegateList.length; i < delCount; i++) {
		// tslint:disable-next-line no-let increment-decrement no-magic-numbers
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

/**
 * Get shuffled list of active delegate public keys (forger public keys) for a specific round.
 * The list of delegates used is the one computed at the begging of the round `r - delegateListRoundOffset`
 */
export const getForgerPublicKeysForRound = async (
	round: number,
	stateStore: StateStore,
): Promise<ReadonlyArray<string>> => {
	const forgersList = await getForgersList(stateStore);
	const delegatePublicKeys = forgersList.find(fl => fl.round === round)
		?.delegates;

	if (!delegatePublicKeys) {
		throw new Error(`No delegate list found for round: ${round}`);
	}

	return shuffleDelegateListForRound(round, delegatePublicKeys);
};

export const isCurrentlyPunished = (
	height: number,
	pomHeights: ReadonlyArray<number>,
): boolean => {
	if (pomHeights.length === 0) {
		return false;
	}
	const lastPomHeight = Math.max(...pomHeights);
	if (height - lastPomHeight < PUNISHMENT_PERIOD) {
		return true;
	}

	return false;
};

export class DelegatesList {
	private readonly rounds: Rounds;
	private readonly chain: Chain;
	private readonly activeDelegates: number;
	private readonly standbyDelegates: number;
	private readonly voteWeightCapRate: number;
	private readonly standbyThreshold: bigint;
	private readonly exceptions: {
		readonly ignoreDelegateListCacheForRounds?: ReadonlyArray<number>;
	};

	public constructor({
		activeDelegates,
		standbyDelegates,
		standbyThreshold,
		voteWeightCapRate,
		rounds,
		chain,
		exceptions,
	}: DelegatesListConstructor) {
		this.activeDelegates = activeDelegates;
		this.standbyDelegates = standbyDelegates;
		this.standbyThreshold = standbyThreshold;
		this.voteWeightCapRate = voteWeightCapRate;
		this.rounds = rounds;
		this.exceptions = exceptions;
		this.chain = chain;
	}

	public async createVoteWeightsSnapshot(
		height: number,
		stateStore: StateStore,
		roundOffset: number = DEFAULT_ROUND_OFFSET,
	): Promise<void> {
		const round = this.rounds.calcRound(height) + roundOffset;
		debug(`Creating vote weight snapshot for round: ${round}`);
		// This list is before executing the current block in process
		const originalDelegates = await this.chain.dataAccess.getDelegates();

		// Merge updated delegate accounts
		const updatedAccounts = stateStore.account.getUpdated();
		// tslint:disable-next-line readonly-keyword
		const updatedAccountsMap: { [address: string]: Account } = {};
		// Convert updated accounts to map for better search
		for (const account of updatedAccounts) {
			// Insert only if account is a delegate
			if (account.username) {
				updatedAccountsMap[account.address] = account;
			}
		}
		// Inject delegate account if it doesn't exist
		for (const delegate of originalDelegates) {
			if (updatedAccountsMap[delegate.address] === undefined) {
				updatedAccountsMap[delegate.address] = delegate;
			}
		}
		const delegates = [...Object.values(updatedAccountsMap)];

		// Update totalVotesReceived to voteWeight equivalent before sorting
		for (const account of delegates) {
			// If the account is being punished, then consider them as vote weight 0
			if (isCurrentlyPunished(height, account.delegate.pomHeights)) {
				account.totalVotesReceived = BigInt(0);
				continue;
			}
			const selfVote = account.votes.find(
				vote => vote.delegateAddress === account.address,
			);
			const cappedValue =
				(selfVote?.amount ?? BigInt(0)) * BigInt(this.voteWeightCapRate);
			if (account.totalVotesReceived > cappedValue) {
				account.totalVotesReceived = cappedValue;
			}
		}

		delegates.sort((a, b) => {
			const diff = b.totalVotesReceived - a.totalVotesReceived;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return a.address.localeCompare(b.address, 'en');
		});

		const activeDelegates = [];
		const standbyDelegates = [];
		for (const account of delegates) {
			// If the account is banned, do not include in the list
			if (account.delegate.isBanned) {
				continue;
			}

			// Select active delegate first
			if (activeDelegates.length < this.activeDelegates) {
				activeDelegates.push({
					address: account.address,
					voteWeight: account.totalVotesReceived.toString(),
				});
				continue;
			}

			// If account has more than threshold, save it as standby
			if (account.totalVotesReceived >= this.standbyThreshold) {
				standbyDelegates.push({
					address: account.address,
					voteWeight: account.totalVotesReceived.toString(),
				});
				continue;
			}

			// From here, it's below threshold
			// Below threshold, but prepared array does not have enough slected delegate
			if (
				activeDelegates.length + standbyDelegates.length <
				this.activeDelegates + this.standbyDelegates
			) {
				// In case there was 1 standby delegate who has more than threshold
				standbyDelegates.push({
					address: account.address,
					voteWeight: account.totalVotesReceived.toString(),
				});
				continue;
			}
			break;
		}

		const result = activeDelegates.concat(standbyDelegates);
		const voteWeight = {
			round,
			delegates: result,
		};
		// Save result to the chain state with round number
		const voteWeights = await getVoteWeights(stateStore);
		const voteWeightsIndex = voteWeights.findIndex(vw => vw.round === round);
		if (voteWeightsIndex > 0) {
			voteWeights[voteWeightsIndex] = voteWeight;
		} else {
			voteWeights.push(voteWeight);
		}
		_setVoteWeights(stateStore, voteWeights);
	}

	/**
	 * Generate list of delegate public keys for the next round in database
	 * WARNING: This function should only be called from `apply()` as we don't allow future rounds to be created
	 */
	public async createRoundDelegateList(
		round: number,
		stateStore: StateStore,
	): Promise<void> {
		debug(`Creating delegate list for round: ${round}`);
		const forgersList = await getForgersList(stateStore);
		const forgerListIndex = forgersList.findIndex(fl => fl.round === round);
		// This gets the list before current block is executed
		const delegateAccounts = await this.chain.dataAccess.getDelegateAccounts(
			this.activeDelegates,
		);
		const updatedAccounts = stateStore.account.getUpdated();
		// tslint:disable-next-line readonly-keyword
		const updatedAccountsMap: { [address: string]: Account } = {};
		// Convert updated accounts to map for better search
		for (const account of updatedAccounts) {
			updatedAccountsMap[account.address] = account;
		}
		// Inject delegate account if it doesn't exist
		for (const delegate of delegateAccounts) {
			if (updatedAccountsMap[delegate.address] === undefined) {
				updatedAccountsMap[delegate.address] = delegate;
			}
		}
		const updatedAccountArray = [...Object.values(updatedAccountsMap)];
		// Re-sort based on VoteWeight with desc and publickey with asc
		updatedAccountArray.sort((a, b) => {
			if (BigInt(b.voteWeight) > BigInt(a.voteWeight)) {
				return 1;
			}
			if (BigInt(b.voteWeight) < BigInt(a.voteWeight)) {
				return -1;
			}

			if (!a.publicKey) {
				return 0;
			}

			// In the tie break compare publicKey
			return a.publicKey.localeCompare(b.publicKey);
		});
		// Slice with X delegates
		const delegatePublicKeys = updatedAccountArray
			.slice(0, this.activeDelegates)
			.map(account => account.publicKey);

		const forgerList: ForgerList = {
			round,
			delegates: delegatePublicKeys,
		};
		if (forgerListIndex > 0) {
			forgersList[forgerListIndex] = forgerList;
		} else {
			forgersList.push(forgerList);
		}
		_setForgersList(stateStore, forgersList);
		debug(`Created delegate list for round: ${round}`);
	}

	public async getShuffledDelegateList(
		round: number,
	): Promise<ReadonlyArray<string>> {
		const forgersListStr = await this.chain.dataAccess.getConsensusState(
			CONSENSUS_STATE_FORGERS_LIST_KEY,
		);
		const forgersList =
			forgersListStr !== undefined
				? (JSON.parse(forgersListStr) as ForgersList)
				: [];
		const delegatePublicKeys = forgersList.find(fl => fl.round === round)
			?.delegates;

		if (!delegatePublicKeys) {
			throw new Error(`No delegate list found for round: ${round}`);
		}

		return shuffleDelegateListForRound(round, delegatePublicKeys);
	}

	public async verifyBlockForger(block: BlockHeader): Promise<boolean> {
		const currentSlot = this.chain.slots.getSlotNumber(block.timestamp);
		const currentRound = this.rounds.calcRound(block.height);

		const delegateList = await this.getShuffledDelegateList(currentRound);

		if (!delegateList.length) {
			throw new Error(
				`Failed to verify slot: ${currentSlot} for block ID: ${block.id} - No delegateList was found`,
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
			/**
			 * Accepts any forger as valid for the rounds defined in exceptions.ignoreDelegateListCacheForRounds
			 * This is only set for testnet due to `zero vote` active delegate issue (https://github.com/LiskHQ/lisk-sdk/pull/2543#pullrequestreview-178505587)
			 * Should be tackled by https://github.com/LiskHQ/lisk-sdk/issues/4194
			 */
			const { ignoreDelegateListCacheForRounds = [] } = this.exceptions;
			if (ignoreDelegateListCacheForRounds.includes(currentRound)) {
				return true;
			}

			throw new Error(
				`Failed to verify slot: ${currentSlot}. Block ID: ${block.id}. Block Height: ${block.height}`,
			);
		}

		return true;
	}
}
