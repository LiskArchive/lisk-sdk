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

import {
	MethodContext,
	ImmutableMethodContext,
	NextValidatorsSetter,
} from '../../state_machine/types';
import { JSONObject } from '../../types';

export type TokenID = Buffer;

export interface ModuleConfig {
	factorSelfStakes: number;
	maxLengthName: number;
	maxNumberSentStakes: number;
	maxNumberPendingUnlocks: number;
	failSafeMissedBlocks: number;
	failSafeInactiveWindow: number;
	punishmentWindow: number;
	roundLength: number;
	minWeightStandby: bigint;
	numberActiveValidators: number;
	numberStandbyValidators: number;
	posTokenID: TokenID;
	tokenIDFee: Buffer;
	validatorRegistrationFee: bigint;
	maxBFTWeightCap: number;
	commissionIncreasePeriod: number;
	maxCommissionIncreaseRate: number;
}

export type ModuleConfigJSON = JSONObject<ModuleConfig>;

export interface RandomMethod {
	getRandomBytes(
		methodContext: ImmutableMethodContext,
		height: number,
		numberOfSeeds: number,
	): Promise<Buffer>;
}

export interface ValidatorsMethod {
	setValidatorGeneratorKey(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean>;
	registerValidatorKeys(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		generatorKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean>;
	getValidatorKeys(methodContext: ImmutableMethodContext, address: Buffer): Promise<ValidatorKeys>;
	getGeneratorsBetweenTimestamps(
		methodContext: ImmutableMethodContext,
		startTimestamp: number,
		endTimestamp: number,
	): Promise<Record<string, number>>;
	setValidatorsParams(
		methodContext: MethodContext,
		validatorSetter: NextValidatorsSetter,
		preCommitThreshold: bigint,
		certificateThreshold: bigint,
		validators: { address: Buffer; bftWeight: bigint }[],
	): Promise<void>;
}

export interface TokenMethod {
	lock(
		methodContext: MethodContext,
		address: Buffer,
		module: string,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void>;
	getAvailableBalance(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: TokenID,
	): Promise<bigint>;
	burn(
		methodContext: MethodContext,
		address: Buffer,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void>;
	transfer(
		methodContext: MethodContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void>;
	unlock(
		methodContext: MethodContext,
		address: Buffer,
		module: string,
		tokenID: TokenID,
		amount: bigint,
	): Promise<void>;
	getLockedAmount(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: TokenID,
		module: string,
	): Promise<bigint>;
}

export interface UnlockingObject {
	readonly validatorAddress: Buffer;
	readonly amount: bigint;
	readonly unstakeHeight: number;
}

export interface UpdateGeneratorKeyParams {
	generatorKey: Buffer;
}

export interface ValidatorRegistrationParams {
	name: string;
	blsKey: Buffer;
	proofOfPossession: Buffer;
	generatorKey: Buffer;
	validatorRegistrationFee: bigint;
}

export interface StakeSharingCoefficient {
	tokenID: Buffer;
	coefficient: Buffer;
}

export interface ValidatorAccount {
	name: string;
	totalStakeReceived: bigint;
	selfStake: bigint;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
	commission: number;
	lastCommissionIncreaseHeight: number;
	sharingCoefficients: StakeSharingCoefficient[];
}

export interface ValidatorAccountJSON {
	name: string;
	totalStakeReceived: string;
	selfStake: string;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
	address: string;
}

export interface StakerDataJSON {
	sentStakes: {
		validatorAddress: string;
		amount: string;
	}[];
	pendingUnlocks: {
		validatorAddress: string;
		amount: string;
		unstakeHeight: number;
	}[];
}

export interface StakeObject {
	validatorAddress: Buffer;
	amount: bigint;
	stakeSharingCoefficients: StakeSharingCoefficient[];
}

export interface StakerData {
	sentStakes: StakeObject[];
	pendingUnlocks: UnlockingObject[];
}

export interface NameStoreData {
	validatorAddress: Buffer;
}

export interface StakeTransactionParams {
	stakes: StakeObject[];
}

export interface BlockHeaderAssetForPOS {
	seedReveal: Buffer;
	maxHeightPreviouslyForged: number;
	maxHeightPrestaked: number;
}

export interface PomTransactionParams {
	header1: Buffer;
	header2: Buffer;
}

export interface PomCommandDependencies {
	tokenMethod: TokenMethod;
	validatorsMethod: ValidatorsMethod;
}

export interface ChangeCommissionParams {
	newCommission: number;
}

export interface ValidatorKeys {
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface UnlockCommandDependencies {
	tokenMethod: TokenMethod;
}

export interface PreviousTimestampData {
	timestamp: number;
}

export interface GenesisData {
	height: number;
	initRounds: number;
	initValidators: Buffer[];
}

export interface GenesisStore {
	validators: {
		address: Buffer;
		name: string;
		blsKey: Buffer;
		proofOfPossession: Buffer;
		generatorKey: Buffer;
		lastGeneratedHeight: number;
		isBanned: boolean;
		pomHeights: number[];
		consecutiveMissedBlocks: number;
		commission: number;
		lastCommissionIncreaseHeight: number;
		sharingCoefficients: StakeSharingCoefficient[];
	}[];
	stakers: {
		address: Buffer;
		sentStakes: {
			validatorAddress: Buffer;
			amount: bigint;
			stakeSharingCoefficients: StakeSharingCoefficient[];
		}[];
		pendingUnlocks: {
			validatorAddress: Buffer;
			amount: bigint;
			unstakeHeight: number;
		}[];
	}[];
	genesisData: {
		initRounds: number;
		initValidators: Buffer[];
	};
}

export interface GetUnlockHeightResponse {
	pendingUnlocks: {
		validatorAddress: string;
		amount: string;
		unstakeHeight: number;
		expectedUnlockableHeight: number;
		unlockable: boolean;
	}[];
}

export interface GetPoSTokenIDResponse {
	tokenID: string;
}

export interface GetValidatorsByStakeRequest {
	limit?: number;
}

export interface GetValidatorsByStakeResponse {
	validators: (ValidatorAccountJSON & { address: string })[];
}

export interface GetLockedRewardsRequest {
	address: string;
	tokenID: string;
}

export interface GetLockedRewardsResponse {
	reward: string;
}

export interface GetClaimableRewardsRequest {
	address: string;
}

export interface ClaimableReward {
	tokenID: string;
	reward: string;
}
