/*
 * Copyright © 2019 Lisk Foundation
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

export interface StateStore {
	readonly account: {
		readonly get: (primaryValue: string) => Promise<Account>;
		readonly getUpdated: () => Account[];
		readonly set: (primaryValue: string, account: Account) => void;
	};
	readonly chainState: {
		readonly get: (key: string) => Promise<string | undefined>;
		readonly set: (key: string, value: string) => void;
	};
}

export interface Earnings {
	readonly fee: bigint;
	readonly reward: bigint;
}

export interface BlockHeader extends Earnings {
	readonly id: number;
	readonly height: number;
	readonly generatorPublicKey: string;
	readonly totalFee: bigint;
	readonly timestamp: number;
}

// tslint:disable readonly-keyword
export interface Account {
	readonly address: string;
	balance: bigint;
	producedBlocks: number;
	missedBlocks: number;
	fees: bigint;
	rewards: bigint;
	readonly publicKey: string;
	voteWeight: bigint;
	readonly votedDelegatesPublicKeys: ReadonlyArray<string>;
}
// tslint:enable readonly-keyword

export interface DPoSProcessingOptions {
	readonly delegateListRoundOffset: number;
	readonly undo?: boolean;
}

export interface RoundException {
	readonly rewards_factor: number;
	readonly fees_factor: number;
	readonly fees_bonus: number;
}

export interface Chain {
	readonly slots: { readonly getSlotNumber: (epochTime?: number) => number };
	readonly dataAccess: {
		readonly getDelegateAccounts: (limit: number) => Promise<Account[]>;
		readonly getChainState: (key: string) => Promise<string | undefined>;
		readonly getBlockHeadersByHeightBetween: (
			fromHeight: number,
			toHeight: number,
		) => Promise<BlockHeader[]>;
	};
}

export interface ForgerList {
	readonly round: number;
	readonly delegates: ReadonlyArray<string>;
}

export type ForgersList = ForgerList[];
