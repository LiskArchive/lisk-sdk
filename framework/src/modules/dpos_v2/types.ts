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
}

export interface VoteAccountObject {
	readonly delegateAddress: Buffer;
	// Amount for some delegate can be updated
	amount: bigint;
}

export interface UnlockingObject {
	readonly delegateAddress: Buffer;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}

export interface DPOSProps {
	address: Buffer;
	dpos: {
		delegate: {
			username: string;
			pomHeights: number[];
			consecutiveMissedBlocks: number;
			lastForgedHeight: number;
			isBanned: boolean;
			totalVotesReceived: bigint;
		};
		sentVotes: VoteAccountObject[];
		unlocking: UnlockingObject[];
	};
}

export interface UnlockTransactionAssetContext {
	readonly unlockObjects: ReadonlyArray<UnlockingObject>;
}
