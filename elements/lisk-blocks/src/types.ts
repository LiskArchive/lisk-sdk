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

export interface Account {
	readonly address: string;
	readonly balance: string;
	readonly missedBlocks: number;
	readonly producedBlocks: number;
	readonly publicKey?: string;
	readonly secondPublicKey?: string;
	readonly secondSignature?: number;
	readonly username?: string;
	readonly isDelegate?: number;
	readonly fees: string;
	readonly rewards: string;
	// tslint:disable-next-line readonly-keyword
	voteWeight: string;
	readonly nameExist: false;
	readonly multiMin: number;
	readonly multiLifetime: number;
	readonly asset: object;
	// tslint:disable-next-line readonly-keyword
	votedDelegatesPublicKeys?: string[];
}

export interface Context {
	readonly blockVersion: number;
	readonly blockHeight: number;
	readonly blockTimestamp: number;
}
export type Contexter = (() => Context) | Context;
export interface BlockHeaderJSON {
	/* tslint:disable:readonly-keyword */
	id: string;
	height: number;
	version: number;
	timestamp: number;
	previousBlockId?: string | null;
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
	/* tslint:enable:readonly-keyword */
}

export type BlockRound = Pick<BlockHeaderJSON, 'id' | 'height'> & {
	// tslint:disable-next-line readonly-keyword
	round?: number;
};

export interface BlockJSON extends BlockHeaderJSON {
	// tslint:disable-next-line readonly-keyword
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
	// tslint:disable-next-line readonly-keyword
	[key: string]: string;
}

export interface StorageTransaction {
	// tslint:disable-next-line no-any
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
	) => Promise<string | string>;
	readonly setKey: (
		key: string,
		value: string,
		tx?: StorageTransaction,
	) => Promise<void>;
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
		// tslint:disable-next-line no-any
		data: any,
		options: StorageOptions | null,
		tx?: StorageTransaction,
	) => Promise<void>;
	readonly create: (
		// tslint:disable-next-line no-any
		data: any,
		filters?: StorageFilters,
		tx?: StorageTransaction,
	) => Promise<void>;
	readonly delete: (
		// tslint:disable-next-line no-any
		filters?: StorageFilters,
		options?: StorageOptions | null,
		tx?: StorageTransaction,
	) => Promise<void>;
}

export interface AccountStorageEntity extends StorageEntity<Account> {
	readonly resetMemTables: () => Promise<void>;
}

export interface BlockStorageEntity extends StorageEntity<BlockJSON> {
	readonly getFirstBlockIdOfLastRounds: (input: {
		readonly height: number;
		readonly numberOfRounds: number;
		readonly numberOfDelegates: number;
	}) => Promise<BlockRound[]>;
	readonly begin: <T>(
		name: string,
		fn: (tx: StorageTransaction) => Promise<T>,
	) => Promise<T>;
}

export interface TempBlockStorageEntity extends StorageEntity<TempBlock> {
	readonly isEmpty: () => Promise<boolean>;
	readonly truncate: () => void;
}

export interface RoundDelegates {
	readonly round: number;
	readonly delegatePublicKeys: string[];
}

export interface RoundDelegatesEntity extends StorageEntity<RoundDelegates> {
	readonly getActiveDelegatesForRound: (
		roundWithOffset: number,
		tx?: StorageTransaction,
	) => Promise<ReadonlyArray<string>>;
}

export interface Storage {
	readonly entities: {
		readonly Block: BlockStorageEntity;
		readonly Account: AccountStorageEntity;
		readonly Transaction: StorageEntity<TransactionJSON>;
		readonly ChainState: ChainStateEntity;
		readonly TempBlock: TempBlockStorageEntity;
		readonly RoundDelegates: RoundDelegatesEntity;
	};
}

export interface ExceptionOptions {
	readonly senderPublicKey?: ReadonlyArray<string>;
	readonly signatures?: ReadonlyArray<string>;
	readonly signSignature?: ReadonlyArray<string>;
	readonly transactionWithNullByte?: ReadonlyArray<string>;
	readonly multisignatures?: ReadonlyArray<string>;
	readonly votes?: ReadonlyArray<string>;
	readonly inertTransactions?: ReadonlyArray<string>;
	readonly roundVotes?: ReadonlyArray<string>;
	readonly blockRewards?: ReadonlyArray<string>;
	readonly recipientLeadingZero?: { readonly [key: string]: string };
	readonly recipientExceedingUint64?: { readonly [key: string]: string };
	readonly duplicatedSignatures?: { readonly [key: string]: string };
}

export type WriteableTransactionResponse = {
	-readonly [P in keyof TransactionResponse]: TransactionResponse[P];
};

export interface Logger {
	// tslint:disable-next-line no-any
	readonly info: (...input: any[]) => void;
	// tslint:disable-next-line no-any
	readonly error: (...input: any[]) => void;
}

export interface SignatureObject {
	readonly signature: string;
	readonly transactionId: string;
	readonly publicKey: string;
}
