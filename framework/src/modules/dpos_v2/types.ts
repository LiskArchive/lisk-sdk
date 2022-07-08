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

import { APIContext, ImmutableAPIContext } from '../../state_machine/types';

export type TokenIDDPoS = Buffer;

export interface ModuleConfig {
	factorSelfVotes: number;
	maxLengthName: number;
	maxNumberSentVotes: number;
	maxNumberPendingUnlocks: number;
	failSafeMissedBlocks: number;
	failSafeInactiveWindow: number;
	punishmentWindow: number;
	roundLength: number;
	bftThreshold: number;
	minWeightStandby: bigint;
	numberActiveDelegates: number;
	numberStandbyDelegates: number;
	tokenIDDPoS: TokenIDDPoS;
}

export interface RandomAPI {
	getRandomBytes(
		apiContext: ImmutableAPIContext,
		height: number,
		numberOfSeeds: number,
	): Promise<Buffer>;
}

export interface ValidatorsAPI {
	setValidatorGeneratorKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean>;
	registerValidatorKeys(
		apiContext: APIContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		generatorKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean>;
	getValidatorAccount(apiContext: ImmutableAPIContext, address: Buffer): Promise<ValidatorKeys>;
	getGeneratorsBetweenTimestamps(
		apiContext: ImmutableAPIContext,
		startTimestamp: number,
		endTimestamp: number,
		validators: { address: Buffer }[],
	): Promise<Record<string, number>>;
}

export interface TokenAPI {
	lock(
		apiContext: APIContext,
		address: Buffer,
		moduleID: Buffer,
		tokenID: TokenIDDPoS,
		amount: bigint,
	): Promise<void>;
	getAvailableBalance(
		apiContext: ImmutableAPIContext,
		address: Buffer,
		tokenID: TokenIDDPoS,
	): Promise<bigint>;
	transfer(
		apiContext: APIContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		tokenID: TokenIDDPoS,
		amount: bigint,
	): Promise<void>;
	unlock(
		apiContext: APIContext,
		address: Buffer,
		moduleID: Buffer,
		tokenID: TokenIDDPoS,
		amount: bigint,
	): Promise<void>;
	getLockedAmount(
		apiContext: ImmutableAPIContext,
		address: Buffer,
		tokenID: TokenIDDPoS,
		moduleID: Buffer,
	): Promise<bigint>;
}

export interface UnlockingObject {
	readonly delegateAddress: Buffer;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}

export interface UpdateGeneratorKeyParams {
	generatorKey: Buffer;
}

export interface DelegateRegistrationParams {
	name: string;
	blsKey: Buffer;
	proofOfPossession: Buffer;
	generatorKey: Buffer;
}

export interface DelegateAccount {
	name: string;
	totalVotesReceived: bigint;
	selfVotes: bigint;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
}

export interface DelegateAccountJSON {
	name: string;
	totalVotesReceived: string;
	selfVotes: string;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
}

export interface VoterDataJSON {
	sentVotes: {
		delegateAddress: string;
		amount: string;
	}[];
	pendingUnlocks: {
		delegateAddress: string;
		amount: string;
		unvoteHeight: number;
	}[];
}

export interface VoteObject {
	delegateAddress: Buffer;
	amount: bigint;
}
export interface VoterData {
	sentVotes: VoteObject[];
	pendingUnlocks: UnlockingObject[];
}

export interface NameStore {
	delegateAddress: Buffer;
}

export interface VoteTransactionParams {
	votes: VoteObject[];
}

export interface VoteCommandDependencies {
	tokenAPI: TokenAPI;
}

export interface BlockHeaderAssetForDPOS {
	seedReveal: Buffer;
	maxHeightPreviouslyForged: number;
	maxHeightPrevoted: number;
}

export interface PomTransactionParams {
	header1: Buffer;
	header2: Buffer;
}

export interface PomCommandDependencies {
	tokenAPI: TokenAPI;
	validatorsAPI: ValidatorsAPI;
}

export interface ValidatorKeys {
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface UnlockCommandDependencies {
	tokenAPI: TokenAPI;
}

export interface SnapshotStoreData {
	activeDelegates: Buffer[];
	delegateWeightSnapshot: {
		delegateAddress: Buffer;
		delegateWeight: bigint;
	}[];
}

export interface PreviousTimestampData {
	timestamp: number;
}

export interface GenesisData {
	height: number;
	initRounds: number;
	initDelegates: Buffer[];
}

export interface GenesisStore {
	validators: {
		address: Buffer;
		name: string;
		blsKey: Buffer;
		proofOfPossession: Buffer;
		generatorKey: Buffer;
		lastGeneratedHeight: number;
		isBanned: Buffer;
		pomHeights: number[];
		consecutiveMissedBlocks: number;
	}[];
	voters: {
		address: Buffer;
		sentVotes: {
			delegateAddress: Buffer;
			amount: bigint;
		}[];
		pendingUnlocks: {
			delegateAddress: Buffer;
			amount: bigint;
			unvoteHeight: number;
		}[];
	}[];
	snapshots: {
		roundNumber: number;
		activeDelegates: Buffer[];
		delegateWeightSnapshot: {
			delegateAddress: Buffer;
			delegateWeight: bigint;
		}[];
	}[];
	genesisData: {
		initRounds: number;
		initDelegates: Buffer[];
	};
}
