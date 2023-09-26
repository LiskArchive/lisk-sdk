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

import { ed } from '@liskhq/lisk-cryptography';
import { math } from '@liskhq/lisk-utils';
import {
	ModuleConfig,
	ModuleConfigJSON,
	UnlockingObject,
	StakeSharingCoefficient,
	PunishmentLockingPeriods,
} from './types';

const { q96 } = math;

export const sortUnlocking = (unlocks: UnlockingObject[]): void => {
	unlocks.sort((a, b) => {
		if (!a.validatorAddress.equals(b.validatorAddress)) {
			return a.validatorAddress.compare(b.validatorAddress);
		}
		if (a.unstakeHeight !== b.unstakeHeight) {
			return b.unstakeHeight - a.unstakeHeight;
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
	a.validatorAddress.equals(b.validatorAddress) &&
	a.amount === b.amount &&
	a.unstakeHeight === b.unstakeHeight;

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

export const pickStandByValidator = (
	validatorWeights: ReadonlyArray<ValidatorWeight>,
	randomSeed: Buffer,
): number => {
	const seedNumber = randomSeed.readBigUInt64BE();
	const totalStakeWeight = validatorWeights.reduce(
		(prev, current) => prev + BigInt(current.weight),
		BigInt(0),
	);

	let threshold = seedNumber % totalStakeWeight;
	for (let i = 0; i < validatorWeights.length; i += 1) {
		const validatorWeight = BigInt(validatorWeights[i].weight);
		if (validatorWeight > threshold) {
			return i;
		}
		threshold -= validatorWeight;
	}

	return -1;
};

export const selectStandbyValidators = (
	validatorWeights: ValidatorWeight[],
	randomSeed1: Buffer,
	randomSeed2?: Buffer,
): ValidatorWeight[] => {
	const numberOfCandidates = 1 + (randomSeed2 !== undefined ? 1 : 0);
	// if validator weights is smaller than number selecting, select all
	if (validatorWeights.length <= numberOfCandidates) {
		return validatorWeights.map(v => ({
			address: v.address,
			weight: BigInt(0),
		}));
	}
	const result: ValidatorWeight[] = [];
	const index = pickStandByValidator(validatorWeights, randomSeed1);
	const [selected] = validatorWeights.splice(index, 1);
	result.push({
		address: selected.address,
		weight: BigInt(0),
	});
	// if seed2 is missing, return only 1
	if (!randomSeed2) {
		return result;
	}
	const secondIndex = pickStandByValidator(validatorWeights, randomSeed2);
	const [secondStandby] = validatorWeights.splice(secondIndex, 1);
	result.push({
		address: secondStandby.address,
		weight: BigInt(0),
	});

	return result;
};

export const isCurrentlyPunished = (
	height: number,
	pomHeights: ReadonlyArray<number>,
	punishmentWindowSelfStaking: number,
): boolean => {
	if (pomHeights.length === 0) {
		return false;
	}
	const lastPomHeight = Math.max(...pomHeights);
	if (height - lastPomHeight < punishmentWindowSelfStaking) {
		return true;
	}

	return false;
};

export const getWaitTime = (
	senderAddress: Buffer,
	validatorAddress: Buffer,
	punishmentLockingPeriods: PunishmentLockingPeriods,
): number =>
	validatorAddress.equals(senderAddress)
		? punishmentLockingPeriods.lockingPeriodSelfStaking
		: punishmentLockingPeriods.lockingPeriodStaking;

export const getPunishTime = (
	senderAddress: Buffer,
	validatorAddress: Buffer,
	punishmentLockingPeriods: PunishmentLockingPeriods,
): number =>
	validatorAddress.equals(senderAddress)
		? punishmentLockingPeriods.punishmentWindowSelfStaking
		: punishmentLockingPeriods.punishmentWindowStaking;

export const hasWaited = (
	unlockingObject: UnlockingObject,
	senderAddress: Buffer,
	height: number,
	punishmentLockingPeriods: PunishmentLockingPeriods,
) => {
	const delayedAvailability = getWaitTime(
		senderAddress,
		unlockingObject.validatorAddress,
		punishmentLockingPeriods,
	);

	return !(height - unlockingObject.unstakeHeight < delayedAvailability);
};

export const isPunished = (
	unlockingObject: UnlockingObject,
	pomHeights: ReadonlyArray<number>,
	senderAddress: Buffer,
	height: number,
	punishmentLockingPeriods: PunishmentLockingPeriods,
) => {
	if (!pomHeights.length) {
		return false;
	}

	const lastPomHeight = pomHeights[pomHeights.length - 1];
	const waitTime = getWaitTime(
		senderAddress,
		unlockingObject.validatorAddress,
		punishmentLockingPeriods,
	);
	const punishTime = getPunishTime(
		senderAddress,
		unlockingObject.validatorAddress,
		punishmentLockingPeriods,
	);
	return (
		height - lastPomHeight < punishTime && lastPomHeight < unlockingObject.unstakeHeight + waitTime
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
		options.unlockObject.unstakeHeight + 2 * options.roundLength,
		options.genesisHeight,
		options.roundLength,
	) <= options.maxHeightCertified;

export const getMinPunishedHeight = (pomHeights: number[], punishmentWindow: number): number => {
	if (pomHeights.length === 0) {
		return 0;
	}

	const lastPomHeight = Math.max(...pomHeights);

	// https://github.com/LiskHQ/lips/blob/master/proposals/lip-0024.md#update-to-validity-of-unlock-transaction
	return lastPomHeight + punishmentWindow;
};

export const getPunishmentPeriod = (
	senderAddress: Buffer,
	validatorAddress: Buffer,
	pomHeights: number[],
	currentHeight: number,
	punishmentLockingPeriods: PunishmentLockingPeriods,
): number => {
	const punishmentWindow = senderAddress.equals(validatorAddress)
		? punishmentLockingPeriods.punishmentWindowSelfStaking
		: punishmentLockingPeriods.punishmentWindowStaking;
	const minPunishedHeight = getMinPunishedHeight(pomHeights, punishmentWindow);
	const remainingBlocks = minPunishedHeight - currentHeight;

	return remainingBlocks < 0 ? 0 : remainingBlocks;
};

export const getModuleConfig = (config: ModuleConfigJSON): ModuleConfig => {
	const roundLength = config.numberActiveValidators + config.numberStandbyValidators;

	return {
		...config,
		roundLength,
		minWeightStandby: BigInt(config.minWeightStandby),
		posTokenID: Buffer.from(config.posTokenID, 'hex'),
		validatorRegistrationFee: BigInt(config.validatorRegistrationFee),
		baseStakeAmount: BigInt(config.baseStakeAmount),
		reportMisbehaviorReward: BigInt(config.reportMisbehaviorReward),
		weightScaleFactor: BigInt(config.weightScaleFactor),
	};
};

export const getValidatorWeight = (
	factorSelfStakes: number,
	selfStake: bigint,
	totalStakeReceived: bigint,
) => {
	const cap = selfStake * BigInt(factorSelfStakes);
	if (cap < totalStakeReceived) {
		return cap;
	}
	return totalStakeReceived;
};

export const isSharingCoefficientSorted = (
	sharingCoefficients: StakeSharingCoefficient[],
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

export const calculateStakeRewards = (
	stakeSharingCoefficient: StakeSharingCoefficient,
	amount: bigint,
	validatorSharingCoefficient: StakeSharingCoefficient,
): bigint => {
	const qAmount = q96(amount);
	const qStakeSharingCoefficient = q96(stakeSharingCoefficient.coefficient);
	const qValidatorSharingCoefficient = q96(validatorSharingCoefficient.coefficient);
	const reward = qValidatorSharingCoefficient.sub(qStakeSharingCoefficient).mul(qAmount);
	return reward.floor();
};
