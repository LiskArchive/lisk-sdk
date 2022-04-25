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

export interface TokenID {
	chainID: number;
	localID: number;
}

export interface ModuleConfig {
	minBalances: {
		tokenID: string;
		amount: string;
	}[];
	supportedTokenIDs: string[];
}

export interface MinBalance {
	tokenID: Buffer;
	amount: bigint;
}

export interface GenesisTokenStore {
	userSubstore: {
		address: Buffer;
		tokenID: {
			chainID: number;
			localID: number;
		};
		availableBalance: bigint;
		lockedBalances: {
			moduleID: number;
			amount: bigint;
		}[];
	}[];
	supplySubstore: {
		localID: number;
		totalSupply: bigint;
	}[];
	escrowSubstore: {
		escrowChainID: Buffer;
		localID: number;
		amount: bigint;
	}[];
	availableLocalIDSubstore: {
		nextAvailableLocalID: number;
	};
	terminatedEscrowSubstore: number[];
}
