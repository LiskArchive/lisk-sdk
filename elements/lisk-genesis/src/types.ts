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

import { Account, BlockHeader } from '@liskhq/lisk-chain';

export type GenesisAccountState = Account;

export interface GenesisBlockHeaderAsset {
	readonly accounts: ReadonlyArray<GenesisAccountState>;
	readonly initDelegates: ReadonlyArray<Buffer>;
	readonly initRounds: number;
}

export interface GenesisBlock {
	readonly header: BlockHeader<GenesisBlockHeaderAsset>;
	readonly payload: Buffer;
}

export interface GenesisBlockParams {
	// List of accounts in the genesis
	readonly accounts: ReadonlyArray<GenesisAccountState>;
	// List fo initial delegate addresses used during the bootstrap period to forge blocks
	readonly initDelegates: ReadonlyArray<Buffer>;
	// Number of rounds for bootstrap period, default is 3
	readonly initRounds?: number;
	readonly height?: number;
	readonly timestamp?: number;
	readonly previousBlockID?: Buffer;
}
