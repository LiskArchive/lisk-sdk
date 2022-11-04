/*
 * Copyright © 2021 Lisk Foundation
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

import { utils, ed } from '@liskhq/lisk-cryptography';
import { math } from '@liskhq/lisk-utils';
import { ModuleConfig, ModuleConfigJSON, UnlockingObject, VoteSharingCoefficient } from './types';
import {
	PUNISHMENT_PERIOD,
	VOTER_PUNISH_TIME,
	SELF_VOTE_PUNISH_TIME,
	WAIT_TIME_SELF_VOTE,
	WAIT_TIME_VOTE,
} from './constants';

const { q96 } = math;

export const sortUnlocking = (unlocks: UnlockingObject[]): void => {
	unlocks.sort((a, b) => {
		if (!a.delegateAddress.equals(b.delegateAddress)) {
			return a.delegateAddress.compare(b.delegateAddress);
		}
		if (a.unvoteHeight !== b.unvoteHeight) {
			return b.unvoteHeight - a.unvoteHeight;
		}
		const diff = b.amount - a.amount;
		if (diff > BigInt(0)) {
			return 1;
		}
		if (diff < BigInt(0)) {
			return -1;
		}

		return 0;
	});
};

export const equalUnlocking = (a: UnlockingObject, b: UnlockingObject): boolean =>
	a.delegateAddress.equals(b.delegateAddress) &&
	a.amount === b.amount &&
	a.unvoteHeight === b.unvoteHeight;

export const isNullCharacterIncluded = (input: string): boolean =>
	new RegExp(/\\0|\\u0000|\\x00/).test(input);

export const isUsername = (username: string): boolean => {
	if (isNullCharacterIncluded(username)) {
		return false;
	}

	if (username !== username.trim().toLowerCase()) {
		return false;
	}

	return /^[a-z0-9!@$&_.]+$/g.test(username);
};

export const validateSignature = (
	tag: string,
	chainID: Buffer,
	publicKey: Buffer,
	signature: Buffer,
	bytes: Buffer,
): boolean => ed.verifyData(tag, chainID, bytes, signature, publicKey);

export interface ValidatorWeight {
	readonly address: Buffer;
	weight: bigint;
}

export const pickStandByDelegate = (
	delegateWeights: ReadonlyArray<ValidatorWeight>,
	randomSeed: Buffer,
): number => {
	const seedNumber = randomSeed.readBigUInt64BE();
	const totalVoteWeight = delegateWeights.reduce(
		(prev, current) => prev + BigInt(current.weight),
		BigInt(0),
	);

	let threshold = seedNumber % totalVoteWeight;
	for (let i = 0; i < delegateWeights.length; i += 1) {
		const voteWeight = BigInt(delegateWeights[i].weight);
		if (voteWeight > threshold) {
			return i;
		}
		threshold -= voteWeight;
	}

	return -1;
};

export const shuffleDelegateList = (
	previousRoundSeed1: Buffer,
	addresses: ValidatorWeight[],
): ValidatorWeight[] => {
	const delegateList = [...addresses].map(delegate => ({
		...delegate,
	})) as { address: Buffer; roundHash: Buffer; weight: bigint }[];

	for (const delegate of delegateList) {
		const seedSource = Buffer.concat([previousRoundSeed1, delegate.address]);
		delegate.roundHash = utils.hash(seedSource);
	}

	delegateList.sort((delegate1, delegate2) => {
		const diff = delegate1.roundHash.compare(delegate2.roundHash);
		if (diff !== 0) {
			return diff;
		}

		return delegate1.address.compare(delegate2.address);
	});

	return delegateList;
};

export const selectStandbyDelegates = (
	delegateWeights: ValidatorWeight[],
	randomSeed1: Buffer,
	randomSeed2?: Buffer,
): ValidatorWeight[] => {
	const numberOfCandidates = 1 + (randomSeed2 !== undefined ? 1 : 0);
	// if delegate weights is smaller than number selecting, select all
	if (delegateWeights.length <= numberOfCandidates) {
		return delegateWeights;
	}
	const result: ValidatorWeight[] = [];
	const index = pickStandByDelegate(delegateWeights, randomSeed1);
	const [selected] = delegateWeights.splice(index, 1);
	result.push(selected);
	// if seed2 is missing, return only 1
	if (!randomSeed2) {
		return result;
	}
	const secondIndex = pickStandByDelegate(delegateWeights, randomSeed2);
	const [secondStandby] = delegateWeights.splice(secondIndex, 1);
	result.push(secondStandby);

	return result;
};

export const isCurrentlyPunished = (height: number, pomHeights: ReadonlyArray<number>): boolean => {
	if (pomHeights.length === 0) {
		return false;
	}
	const lastPomHeight = Math.max(...pomHeights);
	if (height - lastPomHeight < PUNISHMENT_PERIOD) {
		return true;
	}

	return false;
};

export const getWaitTime = (senderAddress: Buffer, delegateAddress: Buffer): number =>
	delegateAddress.equals(senderAddress) ? WAIT_TIME_SELF_VOTE : WAIT_TIME_VOTE;

export const getPunishTime = (senderAddress: Buffer, delegateAddress: Buffer): number =>
	delegateAddress.equals(senderAddress) ? PUNISHMENT_PERIOD : VOTER_PUNISH_TIME;

export const hasWaited = (
	unlockingObject: UnlockingObject,
	senderAddress: Buffer,
	height: number,
) => {
	const delayedAvailability = getWaitTime(senderAddress, unlockingObject.delegateAddress);

	return !(height - unlockingObject.unvoteHeight < delayedAvailability);
};

export const isPunished = (
	unlockingObject: UnlockingObject,
	pomHeights: ReadonlyArray<number>,
	senderAddress: Buffer,
	height: number,
) => {
	if (!pomHeights.length) {
		return false;
	}

	const lastPomHeight = pomHeights[pomHeights.length - 1];
	const waitTime = getWaitTime(senderAddress, unlockingObject.delegateAddress);
	const punishTime = getPunishTime(senderAddress, unlockingObject.delegateAddress);
	return (
		height - lastPomHeight < punishTime && lastPomHeight < unlockingObject.unvoteHeight + waitTime
	);
};

const lastHeightOfRound = (height: number, genesisHeight: number, roundLength: number) => {
	const roundNumber = Math.ceil((height - genesisHeight) / roundLength);

	return roundNumber * roundLength + genesisHeight;
};

export const isCertificateGenerated = (options: {
	unlockObject: UnlockingObject;
	genesisHeight: number;
	maxHeightCertified: number;
	roundLength: number;
}): boolean =>
	lastHeightOfRound(
		options.unlockObject.unvoteHeight + 2 * options.roundLength,
		options.genesisHeight,
		options.roundLength,
	) <= options.maxHeightCertified;

export const getMinPunishedHeight = (
	senderAddress: Buffer,
	delegateAddress: Buffer,
	pomHeights: number[],
): number => {
	if (pomHeights.length === 0) {
		return 0;
	}

	const lastPomHeight = Math.max(...pomHeights);

	// https://github.com/LiskHQ/lips/blob/master/proposals/lip-0024.md#update-to-validity-of-unlock-transaction
	return senderAddress.equals(delegateAddress)
		? lastPomHeight + SELF_VOTE_PUNISH_TIME
		: lastPomHeight + VOTER_PUNISH_TIME;
};

export const getPunishmentPeriod = (
	senderAddress: Buffer,
	delegateAddress: Buffer,
	pomHeights: number[],
	currentHeight: number,
): number => {
	const minPunishedHeight = getMinPunishedHeight(senderAddress, delegateAddress, pomHeights);
	const remainingBlocks = minPunishedHeight - currentHeight;

	return remainingBlocks < 0 ? 0 : remainingBlocks;
};

export const getIDAsKeyForStore = (id: number) => utils.intToBuffer(id, 4);

export function getModuleConfig(config: ModuleConfigJSON): ModuleConfig {
	return {
		...config,
		minWeightStandby: BigInt(config.minWeightStandby),
		governanceTokenID: Buffer.from(config.governanceTokenID, 'hex'),
		tokenIDFee: Buffer.from(config.tokenIDFee, 'hex'),
		delegateRegistrationFee: BigInt(config.delegateRegistrationFee),
	};
}

export const getDelegateWeight = (
	factorSelfVotes: bigint,
	selfVotes: bigint,
	totalVotesReceived: bigint,
) => {
	const cap = selfVotes * factorSelfVotes;
	if (cap < totalVotesReceived) {
		return cap;
	}
	return totalVotesReceived;
};

export const isSharingCoefficientSorted = (
	sharingCoefficients: VoteSharingCoefficient[],
): boolean => {
	const sharingCoefficientsCopy = [...sharingCoefficients];
	sharingCoefficientsCopy.sort((a, b) => a.tokenID.compare(b.tokenID));
	for (let i = 0; i < sharingCoefficients.length; i += 1) {
		if (!sharingCoefficientsCopy[i].tokenID.equals(sharingCoefficients[i].tokenID)) {
			return false;
		}
	}
	return true;
};
export const calculateVoteRewards = (
	voteSharingCoefficient: VoteSharingCoefficient,
	amount: bigint,
	delegateSharingCoefficient: VoteSharingCoefficient,
): bigint => {
	const qAmount = q96(amount);
	const qVoteSharingCoefficient = q96(voteSharingCoefficient.coefficient);
	const qDelegateSharingCoefficient = q96(delegateSharingCoefficient.coefficient);
	const reward = qDelegateSharingCoefficient.sub(qVoteSharingCoefficient).mul(qAmount);
	return reward.floor();
};
