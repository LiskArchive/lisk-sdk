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

import { getAddressFromPublicKey, hash } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';

import * as Debug from 'debug';
import {
	delegatesUserNamesSchema,
	forgerListSchema,
	voteWeightsSchema,
} from './schemas';

import {
	CHAIN_STATE_DELEGATE_USERNAMES,
	CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
	CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
	DEFAULT_ROUND_OFFSET,
	PUNISHMENT_PERIOD,
} from './constants';
import { Rounds } from './rounds';
import {
	Account,
	BlockHeader,
	Chain,
	ChainStateUsernames,
	DecodedUsernames,
	DelegateWeight,
	ForgersList,
	StateStore,
	VoteWeights,
	DecodedForgersList,
	DecodedVoteWeights,
} from './types';

// eslint-disable-next-line new-cap
const debug = Debug('lisk:dpos:delegate_list');

interface DelegatesListConstructor {
	readonly rounds: Rounds;
	readonly activeDelegates: number;
	readonly standbyDelegates: number;
	readonly voteWeightCapRate: number;
	readonly standbyThreshold: bigint;
	readonly chain: Chain;
}

interface DelegateListWithRoundHash {
	readonly address: Buffer;
	roundHash: Buffer;
}

export const getForgersList = async (
	stateStore: StateStore,
): Promise<ForgersList> => {
	const forgersList = await stateStore.consensus.get(
		CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
	);
	if (!forgersList) {
		return [];
	}

	const forgerListDecoded = codec.decode<DecodedForgersList>(
		forgerListSchema,
		forgersList,
	);

	return forgerListDecoded.forgersList;
};

const _setForgersList = (
	stateStore: StateStore,
	forgersList: ForgersList,
): void => {
	stateStore.consensus.set(
		CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
		codec.encode(forgerListSchema, { forgersList }),
	);
};

export const getVoteWeights = async (
	stateStore: StateStore,
): Promise<VoteWeights> => {
	const voteWeights = await stateStore.consensus.get(
		CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
	);
	if (!voteWeights) {
		return [];
	}

	const voteWeightsDecoded = codec.decode<DecodedVoteWeights>(
		voteWeightsSchema,
		voteWeights,
	);
	return voteWeightsDecoded.voteWeights;
};

const _setVoteWeights = (
	stateStore: StateStore,
	voteWeights: VoteWeights,
): void => {
	stateStore.consensus.set(
		CONSENSUS_STATE_DELEGATE_VOTE_WEIGHTS,
		codec.encode(voteWeightsSchema, { voteWeights }),
	);
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

export const deleteVoteWeightsUntilRound = async (
	round: number,
	stateStore: StateStore,
): Promise<void> => {
	debug('Deleting voteWeights until round: ', round);
	const voteWeights = await getVoteWeights(stateStore);
	const newVoteWeights = voteWeights.filter(vw => vw.round >= round);
	_setVoteWeights(stateStore, newVoteWeights);
};

export const shuffleDelegateList = (
	previousRoundSeed1: Buffer,
	addresses: ReadonlyArray<Buffer>,
): ReadonlyArray<Buffer> => {
	const delegateList = [...addresses].map(delegate => ({
		address: delegate,
	})) as DelegateListWithRoundHash[];

	for (const delegate of delegateList) {
		const seedSource = Buffer.concat([previousRoundSeed1, delegate.address]);
		delegate.roundHash = hash(seedSource);
	}

	delegateList.sort((delegate1, delegate2) => {
		const diff = delegate1.roundHash.compare(delegate2.roundHash);
		if (diff !== 0) {
			return diff;
		}

		return delegate1.address.compare(delegate2.address);
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
): Promise<ReadonlyArray<Buffer>> => {
	const forgersList = await getForgersList(stateStore);
	const delegateAddresses = forgersList.find(fl => fl.round === round)
		?.delegates;

	if (!delegateAddresses) {
		throw new Error(`No delegate list found for round: ${round.toString()}`);
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

	let threshold = seedNumber % totalVoteWeight;
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

		codec.addSchema(voteWeightsSchema);
	}

	public async createVoteWeightsSnapshot(
		height: number,
		stateStore: StateStore,
		roundOffset: number = DEFAULT_ROUND_OFFSET,
	): Promise<void> {
		const round = this.rounds.calcRound(height) + roundOffset;
		debug(`Creating vote weight snapshot for round: ${round.toString()}`);

		// Data format for the registered delegates
		// chain:delegateUsernames => { registeredDelegates: { username, address }[] }
		const usernamesBuffer = await stateStore.chain.get(
			CHAIN_STATE_DELEGATE_USERNAMES,
		);

		let usernames = { registeredDelegates: [] } as ChainStateUsernames;

		if (usernamesBuffer) {
			const parsedUsernames = codec.decode<DecodedUsernames>(
				delegatesUserNamesSchema,
				usernamesBuffer,
			);

			usernames = {
				registeredDelegates: parsedUsernames.registeredDelegates.map(
					(names: { address: Buffer; username: string }) => ({
						address: names.address,
						username: names.username,
					}),
				),
			} as ChainStateUsernames;
		}

		const delegates: Account[] = await Promise.all(
			usernames.registeredDelegates.map(async delegate =>
				stateStore.account.get(delegate.address),
			),
		);

		// Update totalVotesReceived to voteWeight equivalent before sorting
		for (const account of delegates) {
			// If the account is being punished, then consider them as vote weight 0
			if (isCurrentlyPunished(height, account.asset.delegate.pomHeights)) {
				account.asset.delegate.totalVotesReceived = BigInt(0);
				// eslint-disable-next-line no-continue
				continue;
			}
			const selfVote = account.asset.sentVotes.find(vote =>
				vote.delegateAddress.equals(account.address),
			);
			const cappedValue =
				(selfVote?.amount ?? BigInt(0)) * BigInt(this.voteWeightCapRate);
			if (account.asset.delegate.totalVotesReceived > cappedValue) {
				account.asset.delegate.totalVotesReceived = cappedValue;
			}
		}

		delegates.sort((a, b) => {
			const diff =
				b.asset.delegate.totalVotesReceived -
				a.asset.delegate.totalVotesReceived;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return a.address.compare(b.address);
		});

		const activeDelegates = [];
		const standbyDelegates = [];
		for (const account of delegates) {
			// If the account is banned, do not include in the list
			if (account.asset.delegate.isBanned) {
				// eslint-disable-next-line no-continue
				continue;
			}

			// Select active delegate first
			if (activeDelegates.length < this.activeDelegates) {
				activeDelegates.push({
					address: account.address,
					voteWeight: account.asset.delegate.totalVotesReceived,
				});
				// eslint-disable-next-line no-continue
				continue;
			}

			// If account has more than threshold, save it as standby
			if (account.asset.delegate.totalVotesReceived >= this.standbyThreshold) {
				standbyDelegates.push({
					address: account.address,
					voteWeight: account.asset.delegate.totalVotesReceived,
				});
				// eslint-disable-next-line no-continue
				continue;
			}

			// From here, it's below threshold
			// Below threshold, but prepared array does not have enough selected delegate
			if (standbyDelegates.length < this.standbyDelegates) {
				// In case there was 1 standby delegate who has more than threshold
				standbyDelegates.push({
					address: account.address,
					voteWeight: account.asset.delegate.totalVotesReceived,
				});
				// eslint-disable-next-line no-continue
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
			throw new Error(
				`Corresponding vote weight for round ${round.toString()} not found`,
			);
		}
		// Expect that voteWeight is stored in order of voteWeight and address
		const hasStandbySlot = voteWeight.delegates.length > this.activeDelegates;
		const activeDelegateAddresses = voteWeight.delegates
			.slice(0, this.activeDelegates)
			.map(vw => vw.address);
		const standbyDelegateAddresses = [];
		const standbyDelegateVoteWeights = hasStandbySlot
			? voteWeight.delegates.slice(this.activeDelegates)
			: [];

		// If standby delegates are less or equal to what required
		// Then don't choose based on random seed and consider those as standby
		if (
			standbyDelegateVoteWeights.length > 0 &&
			standbyDelegateVoteWeights.length <= this.standbyDelegates
		) {
			for (const delegate of standbyDelegateVoteWeights) {
				standbyDelegateAddresses.push(delegate.address);
			}
			// If standby delegates are more than what required then choose based on random seed
		} else if (standbyDelegateVoteWeights.length > this.standbyDelegates) {
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

	public async getDelegateList(round: number): Promise<ReadonlyArray<Buffer>> {
		const forgersListBuffer = await this.chain.dataAccess.getConsensusState(
			CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
		);
		if (!forgersListBuffer) {
			throw new Error(`No delegate list found for round: ${round.toString()}`);
		}

		const { forgersList } = codec.decode<DecodedForgersList>(
			forgerListSchema,
			forgersListBuffer,
		);

		const delegateAddresses = forgersList.find(fl => fl.round === round)
			?.delegates;

		if (!delegateAddresses) {
			throw new Error(`No delegate list found for round: ${round.toString()}`);
		}

		return delegateAddresses;
	}

	public async verifyBlockForger(block: BlockHeader): Promise<boolean> {
		const currentSlot = this.chain.slots.getSlotNumber(block.timestamp);
		const currentRound = this.rounds.calcRound(block.height);

		const delegateList = await this.getDelegateList(currentRound);

		if (!delegateList.length) {
			throw new Error(
				`Failed to verify slot: ${currentSlot.toString()} for block Height: ${
					block.height
				} - No delegateList was found`,
			);
		}

		// Get delegate public key that was supposed to forge the block
		const expectedForgerAddress =
			delegateList[currentSlot % delegateList.length];

		// Verify if forger exists and matches the generatorPublicKey on block
		if (
			!getAddressFromPublicKey(block.generatorPublicKey).equals(
				expectedForgerAddress,
			)
		) {
			throw new Error(
				`Failed to verify slot: ${currentSlot.toString()}. Block Height: ${block.height.toString()}`,
			);
		}

		return true;
	}
}
