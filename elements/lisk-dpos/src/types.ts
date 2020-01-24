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

// Storage
export interface StorageFilter {
	readonly [key: string]:
		| string
		| number
		| boolean
		| string[]
		| number[]
		| undefined;
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

export interface StorageTransaction {
	// tslint:disable-next-line no-any
	readonly batch: <T = any>(input: any[]) => Promise<T>;
}

export interface StorageEntity<T> {
	readonly get: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<T[]>;
	readonly create: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<T[]>;
	readonly update: (
		filters: StorageFilters,
		data: UpdateAccountData,
		options: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<T[]>;
	readonly delete: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<T[]>;
}

export interface Storage {
	readonly entities: {
		readonly Account: AccountEntity;
		readonly Block: BlockEntity;
		readonly RoundDelegates: RoundDelegatesEntity;
	};
}

// Entity
export interface BlockEntity {
	readonly get: (
		filters: StorageFilters,
		options: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<BlockJSON[]>;
}

export interface AccountEntity extends StorageEntity<Account> {
	readonly decreaseFieldBy: (
		filters: StorageFilters,
		field: string,
		value: string,
		tx?: StorageTransaction,
	) => Promise<ReadonlyArray<Account>>;
	readonly increaseFieldBy: (
		filters: StorageFilters,
		field: string,
		value: string,
		tx?: StorageTransaction,
	) => Promise<ReadonlyArray<Account>>;
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

export interface BlockJSON {
	readonly id: number;
	readonly height: number;
	readonly generatorPublicKey: string;
	readonly totalFee: string;
	readonly timestamp: number;
	readonly fee: string;
	readonly reward: string;
}

export interface Earnings {
	readonly fee: bigint;
	readonly reward: bigint;
}

export interface Block extends Earnings {
	readonly id: number;
	readonly height: number;
	readonly generatorPublicKey: string;
	readonly totalFee: bigint;
	readonly timestamp: number;
}

export interface Account {
	readonly balance: bigint;
	readonly fees: bigint;
	readonly rewards: bigint;
	readonly publicKey: string;
	readonly voteWeight: bigint;
	readonly votedDelegatesPublicKeys: ReadonlyArray<string>;
}

interface UpdateAccountData {
	readonly balance?: string;
	readonly fees?: string;
	readonly rewards?: string;
}

export interface Logger {
	// tslint:disable-next-line no-any
	readonly debug: (...input: any[]) => void;
	// tslint:disable-next-line no-any
	readonly error: (...input: any[]) => void;
}

export interface DPoSProcessingOptions {
	readonly tx?: StorageTransaction;
	readonly delegateListRoundOffset?: number;
}
export interface DPoSProcessingUndoOptions extends DPoSProcessingOptions {
	readonly undo?: boolean;
}

export interface RoundException {
	readonly rewards_factor: number;
	readonly fees_factor: number;
	readonly fees_bonus: number;
}

export interface Blocks {
	readonly slots: { readonly getSlotNumber: (epochTime?: number) => number };
}
