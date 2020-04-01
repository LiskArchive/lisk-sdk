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

import {
	getAddressFromPublicKey,
	hash,
	intToBuffer,
} from '@liskhq/lisk-cryptography';
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
	DelegateWeight,
	ForgersList,
	StateStore,
	VoteWeights,
} from './types';

const debug = Debug('lisk:dpos:delegate_list');
const SIZE_UINT64 = 8;

interface DelegatesListConstructor {
	readonly rounds: Rounds;
	readonly activeDelegates: number;
	readonly standbyDelegates: number;
	readonly voteWeightCapRate: number;
	readonly standbyThreshold: bigint;
	readonly chain: Chain;
}

interface DelegateListWithRoundHash {
	readonly address: string;
	// tslint:disable-next-line readonly-keyword
	roundHash: Buffer;
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

export const deleteForgersListUntilRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	debug('Deleting list until round: ', round);
	const forgersList = await getForgersList(stateStore);
	const newForgersList = forgersList.filter(fl => fl.round >= round);
	_setForgersList(stateStore, newForgersList);
};

export const deleteForgersListAfterRound = async (
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

export const shuffleDelegateList = (
	previousRoundSeed1: Buffer,
	addresses: ReadonlyArray<string>,
): ReadonlyArray<string> => {
	const delegateList = [...addresses].map(delegate => ({
		address: delegate,
	})) as DelegateListWithRoundHash[];

	for (const delegate of delegateList) {
		const addressBuffer = intToBuffer(
			delegate.address.slice(0, -1),
			SIZE_UINT64,
		);
		const seedSource = Buffer.concat([previousRoundSeed1, addressBuffer]);
		delegate.roundHash = hash(seedSource);
	}

	delegateList.sort((delegate1, delegate2) => {
		const diff = delegate1.roundHash.compare(delegate2.roundHash);
		if (diff !== 0) {
			return diff;
		}

		return delegate1.address.localeCompare(delegate2.address, 'en');
	});

	return delegateList.map(delegate => delegate.address);
};

/**
 * Get shuffled list of active delegate public keys (forger public keys) for a specific round.
 * The list of delegates used is the one computed at the begging of the round `r - delegateListRoundOffset`
 */
export const getForgerAddressesForRound = async (
	round: number,
	stateStore: StateStore,
): Promise<ReadonlyArray<string>> => {
	const forgersList = await getForgersList(stateStore);
	const delegateAddresses = forgersList.find(fl => fl.round === round)
		?.delegates;

	if (!delegateAddresses) {
		throw new Error(`No delegate list found for round: ${round}`);
	}

	return delegateAddresses;
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

const _getTotalVoteWeight = (
	delegateWeights: ReadonlyArray<DelegateWeight>,
): bigint =>
	delegateWeights.reduce(
		(prev, current) => prev + BigInt(current.voteWeight),
		BigInt(0),
	);

const _pickStandByDelegate = (
	delegateWeights: ReadonlyArray<DelegateWeight>,
	randomSeed: Buffer,
): number => {
	const seedNumber = randomSeed.readBigUInt64BE();
	const totalVoteWeight = _getTotalVoteWeight(delegateWeights);
	// tslint:disable-next-line no-let
	let threshold = seedNumber % totalVoteWeight;
	// tslint:disable-next-line no-let
	for (let i = 0; i < delegateWeights.length; i += 1) {
		const voteWeight = BigInt(delegateWeights[i].voteWeight);
		if (voteWeight > threshold) {
			return i;
		}
		threshold -= voteWeight;
	}

	return -1;
};

export class DelegatesList {
	private readonly rounds: Rounds;
	private readonly chain: Chain;
	private readonly activeDelegates: number;
	private readonly standbyDelegates: number;
	private readonly voteWeightCapRate: number;
	private readonly standbyThreshold: bigint;

	public constructor({
		activeDelegates,
		standbyDelegates,
		standbyThreshold,
		voteWeightCapRate,
		rounds,
		chain,
	}: DelegatesListConstructor) {
		this.activeDelegates = activeDelegates;
		this.standbyDelegates = standbyDelegates;
		this.standbyThreshold = standbyThreshold;
		this.voteWeightCapRate = voteWeightCapRate;
		this.rounds = rounds;
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
			if (standbyDelegates.length < this.standbyDelegates) {
				// In case there was 1 standby delegate who has more than threshold
				standbyDelegates.push({
					address: account.address,
					voteWeight: account.totalVotesReceived.toString(),
				});
				continue;
			}
			break;
		}

		const delegateVoteWeights = activeDelegates.concat(standbyDelegates);
		const voteWeight = {
			round,
			delegates: delegateVoteWeights,
		};
		// Save result to the chain state with round number
		const voteWeights = await getVoteWeights(stateStore);
		const voteWeightsIndex = voteWeights.findIndex(vw => vw.round === round);
		if (voteWeightsIndex > -1) {
			voteWeights[voteWeightsIndex] = voteWeight;
		} else {
			voteWeights.push(voteWeight);
		}
		_setVoteWeights(stateStore, voteWeights);
	}

	public async updateForgersList(
		round: number,
		randomSeed: ReadonlyArray<Buffer>,
		stateStore: StateStore,
	): Promise<void> {
		if (!randomSeed.length) {
			throw new Error(`Random seed must be provided`);
		}
		const voteWeights = await getVoteWeights(stateStore);
		const voteWeight = voteWeights.find(vw => vw.round === round);
		if (!voteWeight) {
			throw new Error(`Corresponding vote weight for round ${round} not found`);
		}
		// Expect that voteWeight is stored in order of voteWeight and address
		const hasStandbySlot =
			voteWeight.delegates.length >
			this.activeDelegates + this.standbyDelegates;
		const activeDelegateSlots = hasStandbySlot
			? this.activeDelegates
			: this.activeDelegates + this.standbyDelegates;
		const activeDelegateAddresses = voteWeight.delegates
			.slice(0, activeDelegateSlots)
			.map(vw => vw.address);
		const standbyDelegateAddresses = [];
		const standbyDelegateVoteWeights = hasStandbySlot
			? voteWeight.delegates.slice(activeDelegateSlots)
			: [];

		// Only choose standby delegate if it exists
		if (standbyDelegateVoteWeights.length !== 0) {
			// tslint:disable-next-line no-let
			for (let i = 0; i < this.standbyDelegates; i += 1) {
				const standbyDelegateIndex = _pickStandByDelegate(
					standbyDelegateVoteWeights,
					randomSeed[i % randomSeed.length],
				);
				if (standbyDelegateIndex < 0) {
					throw new Error('Fail to pick standby delegate');
				}
				standbyDelegateAddresses.push(
					standbyDelegateVoteWeights[standbyDelegateIndex].address,
				);
				standbyDelegateVoteWeights.splice(standbyDelegateIndex, 1);
			}
		}

		const delegates = activeDelegateAddresses.concat(standbyDelegateAddresses);
		const shuffledDelegates = shuffleDelegateList(randomSeed[0], delegates);
		const forgerList = {
			round,
			delegates: shuffledDelegates,
			standby: standbyDelegateAddresses,
		};
		const forgersList = await getForgersList(stateStore);
		const existingIndex = forgersList.findIndex(fl => fl.round === round);
		if (existingIndex > -1) {
			forgersList[existingIndex] = forgerList;
		} else {
			forgersList.push(forgerList);
		}
		_setForgersList(stateStore, forgersList);
	}

	public async getDelegateList(round: number): Promise<ReadonlyArray<string>> {
		const forgersListStr = await this.chain.dataAccess.getConsensusState(
			CONSENSUS_STATE_FORGERS_LIST_KEY,
		);
		const forgersList =
			forgersListStr !== undefined
				? (JSON.parse(forgersListStr) as ForgersList)
				: [];
		const delegateAddresses = forgersList.find(fl => fl.round === round)
			?.delegates;

		if (!delegateAddresses) {
			throw new Error(`No delegate list found for round: ${round}`);
		}

		return delegateAddresses;
	}

	public async verifyBlockForger(block: BlockHeader): Promise<boolean> {
		const currentSlot = this.chain.slots.getSlotNumber(block.timestamp);
		const currentRound = this.rounds.calcRound(block.height);

		const delegateList = await this.getDelegateList(currentRound);

		if (!delegateList.length) {
			throw new Error(
				`Failed to verify slot: ${currentSlot} for block ID: ${block.id} - No delegateList was found`,
			);
		}

		// Get delegate public key that was supposed to forge the block
		const expectedForgerAddress =
			delegateList[currentSlot % delegateList.length];

		// Verify if forger exists and matches the generatorPublicKey on block
		if (
			!expectedForgerAddress ||
			getAddressFromPublicKey(block.generatorPublicKey) !==
				expectedForgerAddress
		) {
			throw new Error(
				`Failed to verify slot: ${currentSlot}. Block ID: ${block.id}. Block Height: ${block.height}`,
			);
		}

		return true;
	}
}
