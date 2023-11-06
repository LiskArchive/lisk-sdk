/*
 * Copyright © 2021 Lisk Foundation
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

import { BlockAssets, Transaction } from '@liskhq/lisk-chain';
import { Logger } from '../logger';
import { createMethodContext, createImmutableMethodContext } from './method_context';
import { EVENT_INDEX_AFTER_TRANSACTIONS, EVENT_INDEX_BEFORE_TRANSACTIONS } from './constants';
import { EventQueue } from './event_queue';
import { PrefixedStateReadWriter } from './prefixed_state_read_writer';
import { TransactionContext } from './transaction_context';
import {
	BlockAfterExecuteContext,
	BlockExecuteContext,
	BlockVerifyContext,
	BlockHeader,
	Validator,
} from './types';

export interface ContextParams {
	chainID: Buffer;
	stateStore: PrefixedStateReadWriter;
	contextStore: Map<string, unknown>;
	header: BlockHeader;
	assets: BlockAssets;
	logger: Logger;
	eventQueue: EventQueue;
	transactions?: ReadonlyArray<Transaction>;
}

export class BlockContext {
	private readonly _stateStore: PrefixedStateReadWriter;
	private readonly _chainID: Buffer;
	private readonly _logger: Logger;
	private readonly _eventQueue: EventQueue;
	private readonly _header: BlockHeader;
	private readonly _assets: BlockAssets;
	private readonly _contextStore: Map<string, unknown>;
	private _transactions?: ReadonlyArray<Transaction>;
	private _nextValidators?: {
		precommitThreshold: bigint;
		certificateThreshold: bigint;
		validators: Validator[];
	};

	public constructor(params: ContextParams) {
		this._logger = params.logger;
		this._chainID = params.chainID;
		this._stateStore = params.stateStore;
		this._eventQueue = params.eventQueue;
		this._header = params.header;
		this._assets = params.assets;
		this._transactions = params.transactions;
		this._contextStore = params.contextStore;
	}

	public get transactions(): ReadonlyArray<Transaction> {
		if (!this._transactions) {
			throw new Error('Transactions are not set');
		}
		return this._transactions;
	}

	public setTransactions(transactions: Transaction[]): void {
		this._transactions = transactions;
	}

	public getBlockVerifyExecuteContext(): BlockVerifyContext {
		return {
			logger: this._logger,
			chainID: this._chainID,
			getMethodContext: () => createImmutableMethodContext(this._stateStore),
			stateStore: this._stateStore,
			contextStore: this._contextStore,
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
				this._stateStore.getStore(moduleID, storePrefix),
			header: this._header,
			assets: this._assets,
		};
	}

	public getBlockExecuteContext(): BlockExecuteContext {
		const childQueue = this._eventQueue.getChildQueue(EVENT_INDEX_BEFORE_TRANSACTIONS);
		return {
			logger: this._logger,
			chainID: this._chainID,
			eventQueue: childQueue,
			stateStore: this._stateStore,
			contextStore: this._contextStore,
			getMethodContext: () =>
				createMethodContext({
					stateStore: this._stateStore,
					eventQueue: childQueue,
					contextStore: this._contextStore,
				}),
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
				this._stateStore.getStore(moduleID, storePrefix),
			header: this._header,
			assets: this._assets,
		};
	}

	public getBlockAfterExecuteContext(): BlockAfterExecuteContext {
		if (!this._transactions) {
			throw new Error('Cannot create block after execute context without transactions');
		}
		const childQueue = this._eventQueue.getChildQueue(EVENT_INDEX_AFTER_TRANSACTIONS);
		return {
			logger: this._logger,
			chainID: this._chainID,
			eventQueue: childQueue,
			contextStore: this._contextStore,
			stateStore: this._stateStore,
			getMethodContext: () =>
				createMethodContext({
					stateStore: this._stateStore,
					eventQueue: childQueue,
					contextStore: this._contextStore,
				}),
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
				this._stateStore.getStore(moduleID, storePrefix),
			header: this._header,
			assets: this._assets,
			transactions: this._transactions,
			setNextValidators: (
				precommitThreshold: bigint,
				certificateThreshold: bigint,
				validators: Validator[],
			) => {
				if (this._nextValidators) {
					throw new Error('Next validators can be set only once');
				}
				this._nextValidators = {
					precommitThreshold,
					certificateThreshold,
					validators: [...validators],
				};
			},
		};
	}

	public getTransactionContext(tx: Transaction): TransactionContext {
		return new TransactionContext({
			chainID: this._chainID,
			logger: this._logger,
			stateStore: this._stateStore,
			contextStore: this._contextStore,
			transaction: tx,
			eventQueue: this._eventQueue,
			header: this._header,
			assets: this._assets,
		});
	}

	public get eventQueue(): EventQueue {
		return this._eventQueue;
	}

	public get nextValidators() {
		return (
			this._nextValidators ?? {
				certificateThreshold: BigInt(0),
				precommitThreshold: BigInt(0),
				validators: [],
			}
		);
	}

	public get assets(): BlockAssets {
		return this._assets;
	}
}
