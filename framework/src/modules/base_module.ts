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

import { Block } from '@liskhq/lisk-chain';
import { GenesisBlock } from '@liskhq/lisk-genesis';
import { GenesisConfig, Consensus, AccountSchema } from '../types';
import { BaseAsset, StateStore, ReducerHandler } from './base_asset';

interface Reducer {
	[key: string]: (params: Record<string, unknown>, statestore: StateStore) => Promise<unknown>;
}

interface Action {
	[key: string]: (params: Record<string, unknown>) => Promise<unknown>;
}

// TODO: Replace after "Update lisk-chain to support the on-chain architecture"
interface Transaction {
	readonly moduleType: number;
	readonly assetType: number;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly senderPublicKey: Buffer;
	readonly signatures: ReadonlyArray<Buffer>;
	readonly asset: Buffer;
}

export abstract class BaseModule<T = unknown> {
	public readonly config: GenesisConfig;
	public readonly assets: BaseAsset[] = [];
	public reducers: Reducer = {};
	public actions: Action = {};
	public events: string[] = [];
	public accountSchema?: AccountSchema;

	public abstract name: string;
	public abstract type: number;

	public constructor(config: GenesisConfig) {
		this.config = config;
	}

	public beforeTransactionApply?(input: {
		tx: Transaction;
		stateStore: StateStore;
		reducerHandler: ReducerHandler;
	}): Promise<void>;
	public afterTransactionApply?(input: {
		tx: Transaction;
		stateStore: StateStore;
		reducerHandler: ReducerHandler;
	}): Promise<void>;
	public afterGenesisBlockApply?(input: {
		genesisBlock: GenesisBlock<T>;
		stateStore: StateStore;
		reducerHandler: ReducerHandler;
		consensus: Consensus;
	}): Promise<void>;
	public beforeBlockApply?(input: {
		header: Block;
		stateStore: StateStore;
		reducerHandler: ReducerHandler;
	}): Promise<void>;
	public afterBlockApply?(input: {
		header: Block;
		stateStore: StateStore;
		consensus: Consensus;
		reducerHandler: ReducerHandler;
	}): Promise<void>;
}
