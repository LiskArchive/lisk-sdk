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
import { BaseTransaction, TransactionResponse } from '@liskhq/lisk-transactions';

export interface Context {
	readonly blockVersion: number;
	readonly blockHeight: number;
	readonly blockTimestamp: number;
}
export type Contexter = (() => Context) | Context;

export interface BlockRewardOptions {
	readonly totalAmount: bigint;
	readonly distance: number;
	readonly rewardOffset: number;
	readonly milestones: ReadonlyArray<string>;
}

export type MatcherTransaction = BaseTransaction & {
	readonly matcher: (contexter: Context) => boolean;
};

export type WriteableTransactionResponse = {
	-readonly [P in keyof TransactionResponse]: TransactionResponse[P];
};

export interface BaseBlockHeader {
	readonly id: Buffer;
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly previousBlockID: Buffer;
	readonly transactionRoot: Buffer;
	readonly generatorPublicKey: Buffer;
	readonly reward: bigint;
	readonly signature: Buffer;
}

export type RawBlockHeader = BaseBlockHeader & { asset: Buffer };

export interface RawBlock {
	header: Buffer;
	payload: ReadonlyArray<Buffer>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockHeader<T = any> = BaseBlockHeader & { asset: T };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Block<T = any> {
	header: BlockHeader<T>;
	payload: ReadonlyArray<BaseTransaction>;
}

export interface DiffHistory {
	code: string;
	line: number;
}

export interface StateDiff {
	readonly updated: Array<Readonly<UpdatedDiff>>;
	readonly created: Array<Readonly<string>>;
}

interface UpdatedDiff {
	readonly key: string;
	readonly value: ReadonlyArray<DiffHistory>;
}
