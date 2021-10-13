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
	minWeightStandby: number;
	numberActiveDelegates: number;
	tokenIDDPoS: TokenIDDPoS;
}

export interface BFTAPI {
	setBFTParameters(
		apiContext: APIContext,
		precommitThreshold: number,
		certificateThreshold: number,
		validators: Validator[],
	): Promise<void>;
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
}

export interface UnlockingObject {
	readonly delegateAddress: Buffer;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}

export interface UpdateGeneratorKeyParams {
	generatorKey: Buffer;
}

export interface DelegateAccount {
	name: string;
	totalVotesReceived: bigint;
	selfVotes: bigint;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: ReadonlyArray<number>;
	consecutiveMissedBlocks: number;
}

export interface DelegateAccountJSON {
	name: string;
	totalVotesReceived: string;
	selfVotes: string;
	lastGeneratedHeight: number;
	isBanned: boolean;
	pomHeights: ReadonlyArray<number>;
	consecutiveMissedBlocks: number;
}

export interface VoterData {
	sentVotes: {
		delegateAddress: Buffer;
		amount: bigint;
	}[];
	pendingUnlocks: {
		delegateAddress: Buffer;
		amount: bigint;
		unvoteHeight: number;
	}[];
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
