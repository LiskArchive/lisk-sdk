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
import {
	BaseTransaction,
	TransactionJSON,
	TransactionResponse,
} from '@liskhq/lisk-transactions';

// eslint-disable-next-line import/no-cycle
import { Account } from './account';

export interface Indexable {
	readonly [key: string]: unknown;
}

export type IndexableAccount = Account & Indexable;

export type IndexableTransactionJSON = TransactionJSON & Indexable;

export interface AccountVoteJSON {
	readonly delegateAddress: string;
	readonly amount: string;
}

export interface AccountUnlockingJSON {
	readonly delegateAddress: string;
	readonly amount: string;
	readonly unvoteHeight: number;
}

export interface AccountJSON {
	readonly address: string;
	readonly balance: string;
	readonly nonce: string;
	readonly producedBlocks: number;
	readonly publicKey: string | undefined;
	readonly username: string | null;
	readonly fees: string;
	readonly rewards: string;
	readonly totalVotesReceived: string;
	readonly asset: object;
	readonly keys?: {
		readonly mandatoryKeys?: string[];
		readonly optionalKeys?: string[];
		readonly numberOfSignatures?: number;
	};
	readonly votes?: AccountVoteJSON[];
	readonly unlocking?: AccountUnlockingJSON[];
	readonly delegate?: {
		readonly lastForgedHeight: number;
		readonly consecutiveMissedBlocks: number;
		readonly isBanned: boolean;
		readonly pomHeights: number[];
	};

	// TODO: Remove with https://github.com/LiskHQ/lisk-sdk/issues/5058
	readonly missedBlocks: number;
	readonly isDelegate: number;
}

export interface Context {
	readonly blockVersion: number;
	readonly blockHeight: number;
	readonly blockTimestamp: number;
}
export type Contexter = (() => Context) | Context;
export interface BlockHeaderJSON {
	id: string;
	height: number;
	version: number;
	timestamp: number;
	previousBlockId?: string | null;
	seedReveal: string;
	blockSignature: string;
	generatorPublicKey: string;
	numberOfTransactions: number;
	payloadLength: number;
	payloadHash: string;
	totalAmount: string;
	totalFee: string;
	reward: string;
	maxHeightPreviouslyForged: number;
	maxHeightPrevoted: number;
}

export interface BlockJSON extends BlockHeaderJSON {
	transactions: ReadonlyArray<TransactionJSON>;
}

type Modify<T, R> = Omit<T, keyof R> & R;

// All the block properties excluding transactions
export type BlockHeader = Modify<
	BlockHeaderJSON,
	{
		readonly totalAmount: bigint;
		readonly totalFee: bigint;
		readonly reward: bigint;
	}
>;

export interface BlockRewardOptions {
	readonly totalAmount: string;
	readonly distance: number;
	readonly rewardOffset: number;
	readonly milestones: ReadonlyArray<string>;
}

export interface BlockInstance extends BlockHeader {
	readonly transactions: BaseTransaction[];
	readonly receivedAt?: Date;
}

export interface TempBlock {
	readonly height: number;
	readonly id: string;
	readonly fullBlock: BlockJSON;
}

export type MatcherTransaction = BaseTransaction & {
	readonly matcher: (contexter: Context) => boolean;
};

export interface ChainState {
	readonly key: string;
	readonly value: string;
}

export interface StorageTransaction {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly batch: <T = any>(input: any[]) => Promise<T>;
}

export interface StorageFilter {
	readonly [key: string]:
		| string
		| number
		| string[]
		| ReadonlyArray<string>
		| number[]
		| ReadonlyArray<number>
		| boolean
		| null;
}

export type StorageFilters =
	| StorageFilter
	| StorageFilter[]
	| ReadonlyArray<StorageFilter>;

export interface StorageOptions {
	readonly limit?: number | null;
	readonly extended?: boolean;
	readonly offset?: number;
	readonly sort?: string | string[];
}

export interface ChainStateEntity {
	readonly get: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<ChainState[]>;
	readonly getKey: (
		key: string,
		tx?: StorageTransaction,
	) => Promise<string | undefined>;
	readonly setKey: (
		key: string,
		value: string,
		tx?: StorageTransaction,
	) => Promise<void>;
	readonly delete: () => Promise<void>;
}

export interface ConsensusStateEntity {
	readonly get: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<ChainState[]>;
	readonly getKey: (
		key: string,
		tx?: StorageTransaction,
	) => Promise<string | undefined>;
	readonly setKey: (
		key: string,
		value: string,
		tx?: StorageTransaction,
	) => Promise<void>;
	readonly delete: () => Promise<void>;
}

export interface StorageEntity<T> {
	readonly get: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<T[]>;
	readonly getOne: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<T>;
	readonly isPersisted: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<boolean>;
	readonly count: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<number>;
	readonly upsert: (
		filters: StorageFilters,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data: any,
		options: StorageOptions | null,
		tx?: StorageTransaction,
	) => Promise<void>;
	readonly create: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data: any,
		filters?: StorageFilters,
		tx?: StorageTransaction,
	) => Promise<void>;
	readonly delete: (
		filters?: StorageFilters,
		options?: StorageOptions | null,
		tx?: StorageTransaction,
	) => Promise<void>;
}

export interface AccountStorageEntity extends StorageEntity<AccountJSON> {
	readonly resetMemTables: () => Promise<void>;
}

export interface BlockStorageEntity extends StorageEntity<BlockJSON> {
	readonly begin: <T>(
		name: string,
		fn: (tx: StorageTransaction) => Promise<T>,
	) => Promise<T>;
}

export interface TempBlockStorageEntity extends StorageEntity<TempBlock> {
	readonly isEmpty: () => Promise<boolean>;
	readonly truncate: () => Promise<void>;
}

export interface Storage {
	readonly entities: {
		readonly Block: BlockStorageEntity;
		readonly Account: AccountStorageEntity;
		readonly Transaction: StorageEntity<TransactionJSON>;
		readonly ChainState: ChainStateEntity;
		readonly ConsensusState: ConsensusStateEntity;
		readonly TempBlock: TempBlockStorageEntity;
	};
}

export type WriteableTransactionResponse = {
	-readonly [P in keyof TransactionResponse]: TransactionResponse[P];
};
