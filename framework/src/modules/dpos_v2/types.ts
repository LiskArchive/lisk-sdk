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

import { BlockHeader } from '@liskhq/lisk-chain';
import { Validator } from '../../node/consensus/types';
import { APIContext, ImmutableAPIContext } from '../../node/state_machine/types';

export interface TokenIDDPoS {
	chainID: number;
	localID: number;
}

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

export interface BFTAPI {
	setBFTParameters(
		apiContext: APIContext,
		precommitThreshold: number,
		certificateThreshold: number,
		validators: Validator[],
	): Promise<void>;
	areHeadersContradicting(bftHeader1: BlockHeader, bftHeader2: BlockHeader): boolean;
}

export interface RandomAPI {
	getRandomBytes(
		apiContext: ImmutableAPIContext,
		height: number,
		numberOfSeeds: number,
	): Promise<Buffer>;
}

export interface ValidatorsAPI {
	setGeneratorList(apiContext: APIContext, generatorAddresses: Buffer[]): Promise<void>;
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
}

export interface TokenAPI {
	lock(
		apiContext: APIContext,
		address: Buffer,
		moduleID: number,
		tokenID: TokenIDDPoS,
		amount: bigint,
	): Promise<void>;
	getAvailableBalance(
		apiContext: ImmutableAPIContext,
		address: Buffer,
		tokenID: TokenIDDPoS,
	): Promise<bigint>;
	getMinRemainingBalance(apiContext: ImmutableAPIContext): Promise<bigint>;
	transfer(
		apiContext: ImmutableAPIContext,
		senderAddress: Buffer,
		recipientAddress: Buffer,
		tokenID: TokenIDDPoS,
		amount: bigint,
	): Promise<void>;
	unlock(
		apiContext: APIContext,
		address: Buffer,
		moduleID: number,
		tokenID: TokenIDDPoS,
		amount: bigint,
	): Promise<void>;
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
	tokenIDDPoS: TokenIDDPoS;
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
	bftAPI: BFTAPI;
	tokenAPI: TokenAPI;
	validatorsAPI: ValidatorsAPI;
	tokenIDDPoS: TokenIDDPoS;
}

export interface ValidatorKeys {
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface UnlockCommandDependencies {
	tokenIDDPoS: TokenIDDPoS;
	tokenAPI: TokenAPI;
}

export interface SnapshotStoreData {
	activeDelegates: Buffer[];
	delegateWeightSnapshot: {
		delegateAddress: Buffer;
		delegateWeight: bigint;
	}[];
}
