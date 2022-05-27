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

import { BlockHeader, BlockAssets } from '../../node/state_machine';
import { APIContext, ImmutableAPIContext } from '../../node/state_machine/types';

export type TokenIDReward = Buffer;

export interface ModuleConfig {
	tokenIDReward: TokenIDReward;
	brackets: ReadonlyArray<string>;
	offset: number;
	distance: number;
}

export interface TokenAPI {
	mint: (apiContext: APIContext, address: Buffer, id: Buffer, amount: bigint) => Promise<void>;
}

export interface RandomAPI {
	isSeedRevealValid(
		apiContext: ImmutableAPIContext,
		generatorAddress: Buffer,
		assets: BlockAssets,
	): Promise<boolean>;
}

export interface BFTAPI {
	impliesMaximalPrevotes(
		apiContext: ImmutableAPIContext,
		blockHeader: BlockHeader,
	): Promise<boolean>;
}

export interface DefaultReward {
	reward: string;
}

export interface EndpointInitArgs {
	config: {
		brackets: ReadonlyArray<bigint>;
		offset: number;
		distance: number;
	};
}

export interface APIInitArgs {
	config: {
		brackets: ReadonlyArray<bigint>;
		offset: number;
		distance: number;
	};
}

export interface CalculateDefaultRewardArgs {
	brackets: ReadonlyArray<bigint>;
	offset: number;
	distance: number;
	height: number;
}
