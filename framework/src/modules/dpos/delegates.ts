/*
 * Copyright © 2020 Lisk Foundation
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

import * as Debug from 'debug';
import { getAddressFromPublicKey, hash } from '@liskhq/lisk-cryptography';
import { Account } from '@liskhq/lisk-chain';
import { Consensus, StateStore } from '../../types';
import { DelegateWeight, DPOSAccountProps } from './types';
import { getRegisteredDelegates, getVoteWeights, setVoteWeights } from './data_access';
import {
	DEFAULT_ACTIVE_DELEGATE,
	DEFAULT_STANDBY_DELEGATE,
	DEFAULT_STANDBY_THRESHOLD,
	DEFAULT_VOTE_WEIGHT_CAP_RATE,
	MAX_CONSECUTIVE_MISSED_BLOCKS,
	MAX_LAST_FORGED_HEIGHT_DIFF,
} from './constants';
import { isCurrentlyPunished } from './utils';

// eslint-disable-next-line new-cap
const debug = Debug('dpos:delegates');

export const shuffleDelegateList = (
	previousRoundSeed1: Buffer,
	addresses: ReadonlyArray<Buffer>,
): ReadonlyArray<Buffer> => {
	const delegateList = [...addresses].map(delegate => ({
		address: delegate,
	})) as { address: Buffer; roundHash: Buffer }[];

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

export const pickStandByDelegate = (
	delegateWeights: ReadonlyArray<DelegateWeight>,
	randomSeed: Buffer,
): number => {
	const seedNumber = randomSeed.readBigUInt64BE();
	const totalVoteWeight = delegateWeights.reduce(
		(prev, current) => prev + BigInt(current.voteWeight),
		BigInt(0),
	);

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

export const updateDelegateList = async ({
	round,
	randomSeeds,
	stateStore,
	activeDelegates,
	standbyDelegates,
	consensus,
}: {
	round: number;
	randomSeeds: ReadonlyArray<Buffer>;
	consensus: Consensus;
	stateStore: StateStore;
	activeDelegates: number;
	standbyDelegates: number;
}): Promise<void> => {
	if (!randomSeeds.length) {
		throw new Error('Random seed must be provided');
	}

	const voteWeights = await getVoteWeights(stateStore);

	const voteWeight = voteWeights.find(vw => vw.round === round);
	if (!voteWeight) {
		throw new Error(`Corresponding vote weight for round ${round.toString()} not found`);
	}
	// Expect that voteWeight is stored in order of voteWeight and address
	const hasStandbySlot = voteWeight.delegates.length > activeDelegates;
	const activeDelegateAddresses = voteWeight.delegates
		.slice(0, activeDelegates)
		.map(vw => vw.address);
	const standbyDelegateAddresses: Buffer[] = [];
	const standbyDelegateVoteWeights = hasStandbySlot
		? voteWeight.delegates.slice(activeDelegates)
		: [];

	// If standby delegates are less or equal to what required
	// Then don't choose based on random seed and consider those as standby
	if (
		standbyDelegateVoteWeights.length > 0 &&
		standbyDelegateVoteWeights.length <= standbyDelegates
	) {
		for (const delegate of standbyDelegateVoteWeights) {
			standbyDelegateAddresses.push(delegate.address);
		}
		// If standby delegates are more than what required then choose based on random seed
	} else if (standbyDelegateVoteWeights.length > standbyDelegates) {
		for (let i = 0; i < standbyDelegates; i += 1) {
			const standbyDelegateIndex = pickStandByDelegate(
				standbyDelegateVoteWeights,
				randomSeeds[i % randomSeeds.length],
			);
			if (standbyDelegateIndex < 0) {
				throw new Error('Fail to pick standby delegate');
			}
			standbyDelegateAddresses.push(standbyDelegateVoteWeights[standbyDelegateIndex].address);
			standbyDelegateVoteWeights.splice(standbyDelegateIndex, 1);
		}
	}

	const delegates = activeDelegateAddresses.concat(standbyDelegateAddresses);
	const shuffledDelegates = shuffleDelegateList(randomSeeds[0], delegates);

	const delegatesList = shuffledDelegates.map(address => ({
		address,
		isConsensusParticipant: !standbyDelegateAddresses.includes(address),
	}));

	await consensus.updateDelegates(delegatesList);
};

export const createVoteWeightsSnapshot = async ({
	height,
	stateStore,
	round,
	voteWeightCapRate = DEFAULT_VOTE_WEIGHT_CAP_RATE,
	activeDelegates = DEFAULT_ACTIVE_DELEGATE,
	standbyDelegates = DEFAULT_STANDBY_DELEGATE,
	standbyThreshold = DEFAULT_STANDBY_THRESHOLD,
}: {
	height: number;
	stateStore: StateStore;
	round: number;
	voteWeightCapRate?: number;
	activeDelegates?: number;
	standbyDelegates?: number;
	standbyThreshold?: bigint;
}): Promise<void> => {
	debug(`Creating vote weight snapshot for round: ${round.toString()}`);

	const delegateUserNames = await getRegisteredDelegates(stateStore);

	const delegates: Account<DPOSAccountProps>[] = await Promise.all(
		delegateUserNames.registeredDelegates.map(async delegate =>
			stateStore.account.get<Account<DPOSAccountProps>>(delegate.address),
		),
	);

	// Update totalVotesReceived to voteWeight equivalent before sorting
	for (const account of delegates) {
		// If the account is being punished, then consider them as vote weight 0
		if (isCurrentlyPunished(height, account.dpos.delegate.pomHeights)) {
			account.dpos.delegate.totalVotesReceived = BigInt(0);
			continue;
		}
		const selfVote = account.dpos.sentVotes.find(vote =>
			vote.delegateAddress.equals(account.address),
		);
		const cappedValue = (selfVote?.amount ?? BigInt(0)) * BigInt(voteWeightCapRate);
		if (account.dpos.delegate.totalVotesReceived > cappedValue) {
			account.dpos.delegate.totalVotesReceived = cappedValue;
		}
	}

	delegates.sort((a, b) => {
		const diff = b.dpos.delegate.totalVotesReceived - a.dpos.delegate.totalVotesReceived;
		if (diff > BigInt(0)) {
			return 1;
		}
		if (diff < BigInt(0)) {
			return -1;
		}

		return a.address.compare(b.address);
	});

	const activeDelegatesList = [];
	const standbyDelegatesList = [];
	for (const account of delegates) {
		// If the account is banned, do not include in the list
		if (account.dpos.delegate.isBanned) {
			continue;
		}

		// Select active delegate first
		if (activeDelegatesList.length < activeDelegates) {
			activeDelegatesList.push({
				address: account.address,
				voteWeight: account.dpos.delegate.totalVotesReceived,
			});
			continue;
		}

		// If account has more than threshold, save it as standby
		if (account.dpos.delegate.totalVotesReceived >= standbyThreshold) {
			standbyDelegatesList.push({
				address: account.address,
				voteWeight: account.dpos.delegate.totalVotesReceived,
			});
			continue;
		}

		// From here, it's below threshold
		// Below threshold, but prepared array does not have enough selected delegate
		if (standbyDelegatesList.length < standbyDelegates) {
			// In case there was 1 standby delegate who has more than threshold
			standbyDelegatesList.push({
				address: account.address,
				voteWeight: account.dpos.delegate.totalVotesReceived,
			});
			continue;
		}
		break;
	}

	const delegateVoteWeights = activeDelegatesList.concat(standbyDelegatesList);
	const voteWeight = {
		round,
		delegates: delegateVoteWeights,
	};

	// Save result to the chain state with round number
	const voteWeights = await getVoteWeights(stateStore);
	const voteWeightsIndex = voteWeights.findIndex(vw => vw.round === round);

	if (voteWeightsIndex === -1) {
		voteWeights.push(voteWeight);
	} else {
		voteWeights[voteWeightsIndex] = voteWeight;
	}

	setVoteWeights(stateStore, voteWeights);
};

export const updateDelegateProductivity = async ({
	height,
	blockTime,
	generatorPublicKey,
	blockTimestamp,
	stateStore,
	consensus,
}: {
	height: number;
	blockTime: number;
	generatorPublicKey: Buffer;
	blockTimestamp: number;
	stateStore: StateStore;
	consensus: Consensus;
}): Promise<void> => {
	const lastBlock = stateStore.chain.lastBlockHeaders[0];
	const expectedForgingAddresses = (await consensus.getDelegates()).map(d => d.address);

	const missedBlocks = Math.ceil((blockTimestamp - lastBlock.timestamp) / blockTime) - 1;
	const forgerAddress = getAddressFromPublicKey(generatorPublicKey);
	const forgerIndex = expectedForgingAddresses.findIndex(address => address.equals(forgerAddress));
	// Update consecutive missed block
	for (let i = 0; i < missedBlocks; i += 1) {
		const rawIndex = (forgerIndex - 1 - i) % expectedForgingAddresses.length;
		const index = rawIndex >= 0 ? rawIndex : rawIndex + expectedForgingAddresses.length;
		const missedForgerAddress = expectedForgingAddresses[index];
		const missedForger = await stateStore.account.get<DPOSAccountProps>(missedForgerAddress);
		missedForger.dpos.delegate.consecutiveMissedBlocks += 1;

		// Ban the missed forger if both consecutive missed block and last forged block diff condition are met
		if (
			missedForger.dpos.delegate.consecutiveMissedBlocks > MAX_CONSECUTIVE_MISSED_BLOCKS &&
			height - missedForger.dpos.delegate.lastForgedHeight > MAX_LAST_FORGED_HEIGHT_DIFF
		) {
			missedForger.dpos.delegate.isBanned = true;
		}
		stateStore.account.set(missedForgerAddress, missedForger);
	}

	// Reset consecutive missed block
	const forger = await stateStore.account.get<DPOSAccountProps>(forgerAddress);
	forger.dpos.delegate.consecutiveMissedBlocks = 0;
	forger.dpos.delegate.lastForgedHeight = height;
	stateStore.account.set(forgerAddress, forger);
};
