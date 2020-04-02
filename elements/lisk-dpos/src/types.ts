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
	readonly consensus: {
		readonly get: (key: string) => Promise<string | undefined>;
		readonly set: (key: string, value: string) => void;
		readonly lastBlockHeaders: ReadonlyArray<BlockHeader>;
	};
}

export interface BlockHeader {
	readonly id: string;
	readonly height: number;
	readonly generatorPublicKey: string;
	readonly seedReveal: string;
	readonly reward: bigint;
	readonly totalFee: bigint;
	readonly timestamp: number;
}

export interface Block extends BlockHeader {
	// Temporally required to create this type, since total reward and fee are required to calculated in the DPoS for vote weight change
	// tslint:disable-next-line: no-any
	readonly transactions: any[];
}

interface Vote {
	readonly delegateAddress: string;
	readonly amount: bigint;
}

// tslint:disable readonly-keyword
export interface Account {
	readonly address: string;
	totalVotesReceived: bigint;
	readonly delegate: {
		readonly isBanned: boolean;
		readonly pomHeights: number[];
	};
	readonly votes: Vote[];
	readonly username?: string;
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

export interface Chain {
	readonly slots: { readonly getSlotNumber: (epochTime?: number) => number };
	// tslint:disable-next-line no-mixed-interface
	readonly getTotalEarningAndBurnt: (
		block: BlockHeader,
	) => { readonly totalEarning: bigint; readonly totalBurnt: bigint };
	// tslint:disable-next-line no-mixed-interface
	readonly dataAccess: {
		readonly getDelegates: () => Promise<Account[]>;
		readonly getConsensusState: (key: string) => Promise<string | undefined>;
		readonly getBlockHeadersByHeightBetween: (
			fromHeight: number,
			toHeight: number,
		) => Promise<BlockHeader[]>;
		// TODO: Remove after implementing new DPoS #4951
		readonly getDelegateAccounts: (limit: number) => Promise<Account[]>;
	};
}

export interface DelegateWeight {
	readonly address: string;
	readonly voteWeight: string;
}

export interface VoteWeight {
	readonly round: number;
	readonly delegates: ReadonlyArray<DelegateWeight>;
}

export interface ForgerList {
	readonly round: number;
	readonly delegates: ReadonlyArray<string>;
	readonly standby: ReadonlyArray<string>;
}

export type ForgersList = ForgerList[];
export type VoteWeights = VoteWeight[];

type Grow<T, A extends T[]> = ((x: T, ...xs: A) => void) extends (
	...a: infer X
) => void
	? X
	: never;
type GrowToSize<T, A extends T[], N extends number> = {
	readonly 0: A;
	readonly 1: GrowToSize<T, Grow<T, A>, N>;
}[A['length'] extends N ? 0 : 1];

export type FixedLengthArray<T, N extends number> = GrowToSize<T, [], N>;

// Look for a way to define buffer type with fixed size
export type RandomSeed = Buffer;
