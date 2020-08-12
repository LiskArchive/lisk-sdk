/*
 * Copyright © 2020 Lisk Foundation
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

import { AccountSchema, Account, GenesisBlockHeader } from '@liskhq/lisk-chain';

export type PartialReq<T, Keys extends keyof T = keyof T> = Pick<
	Partial<T>,
	Exclude<keyof T, Keys>
> &
	{
		[K in Keys]: T[K];
	};

export type GenesisBlockHeaderWithoutId = Omit<GenesisBlockHeader, 'id'>;

export interface GenesisBlockParams {
	// List of accounts in the genesis
	readonly accounts: ReadonlyArray<Account>;
	// List fo initial delegate addresses used during the bootstrap period to forge blocks
	readonly initDelegates: ReadonlyArray<Buffer>;
	// Number of blocks per round
	readonly roundLength: number;
	// Account Schema for the genesis block
	readonly accountAssetSchemas: { [moduleName: string]: AccountSchema };
	// Number of rounds for bootstrap period, default is 3
	readonly initRounds?: number;
	readonly height?: number;
	readonly timestamp?: number;
	readonly previousBlockID?: Buffer;
}
