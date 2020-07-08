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
		readonly get: (primaryValue: Buffer) => Promise<Account>;
		readonly getUpdated: () => ReadonlyArray<Account>;
		// eslint-disable-next-line @typescript-eslint/method-signature-style
		set(key: Buffer, value: Account): void;
	};
	readonly consensus: {
		readonly get: (key: string) => Promise<Buffer | undefined>;
		readonly set: (key: string, value: Buffer) => void;
		readonly lastBlockHeaders: ReadonlyArray<BlockHeader>;
	};
	readonly chain: {
		readonly get: (key: string) => Promise<Buffer | undefined>;
		readonly set: (key: string, value: Buffer) => void;
	};
}

export interface BlockHeader {
	readonly height: number;
	readonly version: number;
	readonly generatorPublicKey: Buffer;
	readonly reward: bigint;
	readonly timestamp: number;
	readonly asset: {
		readonly seedReveal: Buffer;
	};
}

export interface AccountAsset {
	delegate: DelegateAccountAsset;
	sentVotes: VoteAccountAsset[];
	unlocking: UnlockingAccountAsset[];
}

export interface DelegateAccountAsset {
	username: string;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
	lastForgedHeight: number;
	isBanned: boolean;
	totalVotesReceived: bigint;
}

export interface VoteAccountAsset {
	delegateAddress: Buffer;
	amount: bigint;
}

export interface UnlockingAccountAsset {
	delegateAddress: Buffer;
	amount: bigint;
	unvoteHeight: number;
}

export interface Account {
	readonly address: Buffer;
	balance: bigint;
	asset: {
		delegate: DelegateAccountAsset;
		sentVotes: VoteAccountAsset[];
		unlocking: UnlockingAccountAsset[];
	};
}

export interface DPoSProcessingOptions {
	readonly delegateListRoundOffset: number;
}

export interface Chain {
	readonly slots: {
		readonly getSlotNumber: (genesisBlockTimestamp?: number) => number;
		readonly blockTime: () => number;
	};
	readonly dataAccess: {
		getConsensusState(key: string): Promise<Buffer | undefined>;
		getBlockHeadersByHeightBetween(fromHeight: number, toHeight: number): Promise<BlockHeader[]>;
	};
}

export interface DelegateWeight {
	readonly address: Buffer;
	readonly voteWeight: bigint;
}

export interface VoteWeight {
	readonly round: number;
	readonly delegates: ReadonlyArray<DelegateWeight>;
}

export interface ForgerList {
	readonly round: number;
	readonly delegates: ReadonlyArray<Buffer>;
	readonly standby: ReadonlyArray<Buffer>;
}

export type ForgersList = ForgerList[];
export type VoteWeights = VoteWeight[];

type Grow<T, A extends T[]> = ((x: T, ...xs: A) => void) extends (...a: infer X) => void
	? X
	: never;
type GrowToSize<T, A extends T[], N extends number> = {
	readonly 0: A;
	readonly 1: GrowToSize<T, Grow<T, A>, N>;
}[A['length'] extends N ? 0 : 1];

export type FixedLengthArray<T, N extends number> = GrowToSize<T, [], N>;

// Look for a way to define buffer type with fixed size
export type RandomSeed = Buffer;

export interface ChainStateRegisteredDelegate {
	readonly username: string;
	readonly address: Buffer;
}
export interface ChainStateUsernames {
	readonly registeredDelegates: ChainStateRegisteredDelegate[];
}

export interface DecodedForgersList {
	forgersList: ForgersList;
}

export interface DecodedVoteWeights {
	voteWeights: VoteWeights;
}

export interface DecodedUsernames {
	registeredDelegates: [
		{
			username: string;
			address: Buffer;
		},
	];
}
