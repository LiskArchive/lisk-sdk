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

import {
	AccountSchema,
	Account,
	GenesisBlockHeader,
	GenesisBlock,
	AccountDefaultProps,
} from '@liskhq/lisk-chain';

export type PartialReq<T, Keys extends keyof T = keyof T> = Pick<
	Partial<T>,
	Exclude<keyof T, Keys>
> &
	{
		[K in Keys]: T[K];
	};

export type GenesisBlockHeaderWithoutId<T> = Omit<GenesisBlockHeader<T>, 'id'>;

export type accountAssetSchemas = { [moduleName: string]: AccountSchema };

export interface GenesisBlockJSONParams {
	readonly genesisBlock: GenesisBlock;
	readonly accountAssetSchemas: accountAssetSchemas;
}

export interface GenesisBlockParams<T = AccountDefaultProps> {
	// List of accounts in the genesis
	readonly accounts: ReadonlyArray<Partial<Account<T>> & { address: Buffer }>;
	// List fo initial delegate addresses used during the bootstrap period to forge blocks
	readonly initDelegates: ReadonlyArray<Buffer>;
	// Account Schema for the genesis block
	readonly accountAssetSchemas: accountAssetSchemas;
	// Number of rounds for bootstrap period, default is 3
	readonly initRounds?: number;
	readonly height?: number;
	readonly timestamp?: number;
	readonly previousBlockID?: Buffer;
}
