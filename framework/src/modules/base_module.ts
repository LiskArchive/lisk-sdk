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
import { BaseAsset, ReducerHandler, StateStore, Transaction } from './base_asset';

interface Reducers {
	[key: string]: (params: Record<string, unknown>, stateStore: StateStore) => Promise<unknown>;
}

interface Actions {
	[key: string]: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface TransactionApplyInput {
	tx: Transaction;
	stateStore: StateStore;
	reducerHandler: ReducerHandler;
}

export interface AfterGenesisBlockApplyInput<T = unknown> {
	genesisBlock: GenesisBlock<T>;
	stateStore: StateStore;
	reducerHandler: ReducerHandler;
}

export interface BeforeBlockApplyInput {
	block: Block;
	stateStore: StateStore;
	reducerHandler: ReducerHandler;
}

export interface AfterBlockApplyInput extends BeforeBlockApplyInput {
	consensus: Consensus;
}

export abstract class BaseModule<T = unknown> {
	public readonly config: GenesisConfig;
	public readonly transactionAssets: BaseAsset[] = [];
	public reducers: Reducers = {};
	public actions: Actions = {};
	public events: string[] = [];
	public accountSchema?: AccountSchema;

	public abstract name: string;
	public abstract type: number;

	public constructor(config: GenesisConfig) {
		this.config = config;
	}

	public async beforeTransactionApply?(input: TransactionApplyInput): Promise<void>;
	public async afterTransactionApply?(input: TransactionApplyInput): Promise<void>;
	public async afterGenesisBlockApply?(input: AfterGenesisBlockApplyInput<T>): Promise<void>;
	public async beforeBlockApply?(input: BeforeBlockApplyInput): Promise<void>;
	public async afterBlockApply?(input: AfterBlockApplyInput): Promise<void>;
}
