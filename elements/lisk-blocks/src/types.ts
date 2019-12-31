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
import { TransactionJSON } from "@liskhq/lisk-transactions";

export interface Account {
    readonly address: string;
	readonly balance: string,
	readonly missedBlocks: number,
	readonly producedBlocks: number,
    readonly publicKey: string | null;
    readonly secondPublicKey: string | null,
	readonly secondSignature: boolean,
	readonly username: string | null,
	readonly isDelegate: boolean,
	readonly fees: string,
	readonly rewards: string,
	readonly voteWeight: string,
	readonly nameExist: false,
	readonly multiMin: number,
	readonly multiLifetime: number,
	readonly asset: object,
};

// tslint:disable-next-line readonly-keyword
export interface ChainState { [key: string]: string };

export type StorageTransaction = object;

export interface StorageFilters {
    readonly [key: string]: string | number;
};

export interface StorageOptions {
    readonly limit?: number | null;
    readonly extended?: boolean;
    readonly offset?: number;
};

export interface ChainStateEntity {
    readonly get: (filters?: StorageFilters, options?: StorageOptions, tx?: StorageTransaction) => Promise<ChainState[]>;
    readonly getKey: (key: string, tx?: StorageTransaction) => Promise<string>;
    readonly setKey: (key: string, value: string, tx?: StorageTransaction) => Promise<void>;
};

export interface StorageEntity<T> {
    readonly get: (filters?: StorageFilters, options?: StorageOptions, tx?: StorageTransaction) => Promise<T[]>;
    readonly getOne: (filters?: StorageFilters, options?: StorageOptions, tx?: StorageTransaction) => Promise<T>;
    // tslint:disable-next-line no-any
    readonly upsert: (filters: StorageFilters, data: any, options: StorageOptions | null, tx?: StorageTransaction) => Promise<void>;
};

export interface Storage {
    readonly entities: {
        readonly Account: StorageEntity<Account>,
        readonly Transaction: StorageEntity<TransactionJSON>,
        readonly ChainState: ChainStateEntity,
    },
};