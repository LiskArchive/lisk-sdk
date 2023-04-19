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

import { BlockAssets, MethodContext, ImmutableMethodContext } from '../../state_machine';
import { Validator } from '../../state_machine/types';
import { JSONObject } from '../../types';
import { ModuleConfig as RewardModuleConfig } from '../reward/types';

export interface ModuleConfig extends RewardModuleConfig {
	factorMinimumRewardActiveValidators: number;
}

export type ModuleConfigJSON = JSONObject<ModuleConfig>;

export interface TokenMethod {
	mint(methodContext: MethodContext, address: Buffer, id: Buffer, amount: bigint): Promise<void>;
	userAccountExists(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<boolean>;
}

export interface RandomMethod {
	isSeedRevealValid(
		methodContext: ImmutableMethodContext,
		generatorAddress: Buffer,
		assets: BlockAssets,
	): Promise<boolean>;
}

export interface ValidatorsMethod {
	getGeneratorsBetweenTimestamps(
		methodContext: ImmutableMethodContext,
		startTimestamp: number,
		endTimestamp: number,
	): Promise<Record<string, number>>;
	getValidatorsParams(methodContext: ImmutableMethodContext): Promise<{
		preCommitThreshold: bigint;
		certificateThreshold: bigint;
		validators: Validator[];
	}>;
}

export interface PoSMethod {
	getRoundLength(methodContext: ImmutableMethodContext): number;
	getNumberOfActiveValidators(methodContext: ImmutableMethodContext): number;
	updateSharedRewards(
		methodContext: MethodContext,
		generatorAddress: Buffer,
		tokenID: Buffer,
		reward: bigint,
	): Promise<void>;
	isEndOfRound(methodContext: ImmutableMethodContext, height: number): Promise<boolean>;
}

export interface DefaultReward {
	reward: string;
}

export interface GetExpectedValidatorRewardsResponse {
	blockReward: string;
	dailyReward: string;
	monthlyReward: string;
	yearlyReward: string;
}
