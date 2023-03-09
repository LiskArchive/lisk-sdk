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
import { JSONObject } from '../../types';

export interface ModuleConfig {
	tokenID: Buffer;
	brackets: ReadonlyArray<bigint>;
	offset: number;
	distance: number;
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

export interface BFTMethod {
	impliesMaximalPrevotes(methodContext: ImmutableMethodContext): Promise<boolean>;
}

export interface DefaultReward {
	reward: string;
}

export interface InflationRate {
	tokenID: string;
	rate: string;
}
