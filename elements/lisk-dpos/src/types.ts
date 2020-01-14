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
import * as BigNum from '@liskhq/bignum';

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
	readonly delete: (
		filters?: StorageFilters,
		options?: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<T[]>;
}

export interface Storage {
	readonly entities: {
		readonly RoundDelegates: RoundDelegatesEntity;
		readonly Account: AccountEntity;
		readonly Block: BlockEntity;
	};
}

// Entity
export interface BlockEntity {
	readonly get: (
		filters: StorageFilters,
		_options: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<BlockJSON[]>;
}

export interface AccountEntity extends StorageEntity<Account> {
	readonly decreaseFieldBy: (
		filters: StorageFilters,
		field: string,
		value: string,
		tx?: StorageTransaction,
	) => Promise<Account[]>;
	readonly increaseFieldBy: (
		filters: StorageFilters,
		field: string,
		value: string,
		tx?: StorageTransaction,
	) => Promise<Account[]>;
	readonly update: (
		filters: StorageFilters,
		data: UpdateAccountData,
		_options: StorageOptions,
		tx?: StorageTransaction,
	) => Promise<Account[]>;
}

export interface RoundDelegates {
	readonly round: number;
	readonly delegatePublicKeys: string[];
}

export interface RoundDelegatesEntity extends StorageEntity<RoundDelegates> {
	readonly getActiveDelegatesForRound: (
		roundWithOffset: number,
		tx?: StorageTransaction,
	) => Promise<string[]>;
}

// Typedefs
export interface BigNumExtended extends BigNum {
	readonly floor: () => BigNum;
}

export interface Earnings {
	readonly fee: BigNum;
	readonly reward: BigNum;
}

export interface BlockJSON extends Earnings {
	readonly id: number;
	readonly height: number;
	readonly generatorPublicKey: string;
	readonly totalFee: BigNum;
	readonly timestamp: number;
}

export interface Account {
	readonly id: string;
	readonly balance: BigNum;
	readonly fees: BigNum;
	readonly rewards: BigNum;
	readonly displayName: string;
	readonly publicKey: string;
	readonly votedDelegatesPublicKeys: string[];
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
