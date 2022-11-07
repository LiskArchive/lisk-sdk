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
import { DelegateAccountJSON } from './stores/delegate';

export type TokenID = Buffer;

export interface ModuleConfig {
	factorSelfVotes: number;
	maxLengthName: number;
	maxNumberSentVotes: number;
	maxNumberPendingUnlocks: number;
	failSafeMissedBlocks: number;
	failSafeInactiveWindow: number;
	punishmentWindow: number;
	roundLength: number;
	minWeightStandby: bigint;
	numberActiveDelegates: number;
	numberStandbyDelegates: number;
	governanceTokenID: TokenID;
	tokenIDFee: Buffer;
	delegateRegistrationFee: bigint;
	maxBFTWeightCap: number;
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
	delegateRegistrationFee: bigint;
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

export interface NameStoreData {
	delegateAddress: Buffer;
}

export interface VoteTransactionParams {
	votes: VoteObject[];
}

export interface VoteCommandDependencies {
	tokenMethod: TokenMethod;
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
	tokenMethod: TokenMethod;
	validatorsMethod: ValidatorsMethod;
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
		isBanned: boolean;
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
	genesisData: {
		initRounds: number;
		initDelegates: Buffer[];
	};
}

export interface GetUnlockHeightResponse {
	pendingUnlocks: {
		delegateAddress: string;
		amount: string;
		unvoteHeight: number;
		expectedUnlockableHeight: number;
		unlockable: boolean;
	}[];
}

export interface GetGovernanceTokenIDResponse {
	tokenID: string;
}

export interface GetValidatorsByStakeRequest {
	limit?: number;
}

export interface GetValidatorsByStakeResponse {
	validators: (DelegateAccountJSON & { address: string })[];
}

export interface GetLockedRewardsRequest {
	address: string;
	tokenID: string;
}

export interface GetLockedRewardsResponse {
	reward: string;
}
