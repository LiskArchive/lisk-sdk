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
/* eslint-disable class-methods-use-this */

import { Schema } from '@liskhq/lisk-codec';
import { StateStore as ChainStateStore, BlockHeader } from '@liskhq/lisk-chain';

// Limit the scope of state store to which module can access

export type AccountDefaultProps = {
	[name: string]: { [key: string]: unknown } | undefined | Buffer;
};

export type Account<T = AccountDefaultProps> = T & { address: Buffer };

export interface AccountStateStore {
	get<T>(key: Buffer): Promise<Account<T>>;
	getOrDefault<T>(key: Buffer): Promise<Account<T>>;
	set(key: Buffer, value: Account): void;
}

export type StateStore = Omit<
	ChainStateStore,
	'account' | 'consensus' | 'finalize' | 'createSnapshot' | 'restoreSnapshot'
> & { chain: { lastBlockHeaders: BlockHeader[] } } & { account: AccountStateStore };

export interface ReducerHandler {
	invoke: (name: string, params: Record<string, unknown>) => Promise<unknown>;
}

export interface ApplyAssetInput<T> {
	senderID: Buffer;
	asset: T;
	stateStore: StateStore;
	reducerHandler: ReducerHandler;
	transaction: Transaction;
}

export interface ValidateAssetInput<T> {
	asset: T;
	transaction: Transaction;
}

// TODO: Replace after #5609 "Update lisk-chain to support the on-chain architecture"
export interface Transaction {
	readonly moduleType: number;
	readonly assetType: number;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly senderPublicKey: Buffer;
	readonly signatures: ReadonlyArray<Buffer>;
	readonly asset: Buffer;
}

export abstract class BaseAsset<T = unknown> {
	public baseFee = BigInt(0);

	public abstract name: string;
	public abstract type: number;
	public abstract assetSchema: Schema;

	public validateAsset?(input: ValidateAssetInput<T>): void;

	public abstract async applyAsset(input: ApplyAssetInput<T>): Promise<void>;
}
