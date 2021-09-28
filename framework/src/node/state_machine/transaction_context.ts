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

import { Transaction, StateStore } from '@liskhq/lisk-chain';
import { codec, Schema } from '@liskhq/lisk-codec';
import { Logger } from '../../logger';
import { createAPIContext } from './api_context';
import { EventQueue } from './event_queue';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	TransactionExecuteContext,
	TransactionVerifyContext,
	BlockHeader,
	BlockAssets,
} from './types';

interface ContextParams {
	networkIdentifier: Buffer;
	stateStore: StateStore;
	logger: Logger;
	eventQueue: EventQueue;
	transaction: Transaction;
	header?: BlockHeader;
	assets?: BlockAssets;
}

export class TransactionContext {
	private readonly _stateStore: StateStore;
	private readonly _networkIdentifier: Buffer;
	private readonly _logger: Logger;
	private readonly _eventQueue: EventQueue;
	private readonly _transaction: Transaction;
	private readonly _header?: BlockHeader;
	private readonly _assets?: BlockAssets;

	public constructor(params: ContextParams) {
		this._stateStore = params.stateStore;
		this._logger = params.logger;
		this._header = params.header;
		this._eventQueue = params.eventQueue;
		this._networkIdentifier = params.networkIdentifier;
		this._transaction = params.transaction;
		this._assets = params.assets;
	}

	public createTransactionVerifyContext(): TransactionVerifyContext {
		return {
			logger: this._logger,
			networkIdentifier: this._networkIdentifier,
			getAPIContext: () =>
				createAPIContext({ stateStore: this._stateStore, eventQueue: this._eventQueue }),
			getStore: (moduleID: number, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			transaction: this._transaction,
		};
	}

	public createTransactionExecuteContext(): TransactionExecuteContext {
		if (!this._header) {
			throw new Error('Transaction Execution requires block header in the context.');
		}
		if (!this._assets) {
			throw new Error('Transaction Execution requires block assets in the context.');
		}
		return {
			logger: this._logger,
			networkIdentifier: this._networkIdentifier,
			eventQueue: this._eventQueue,
			getAPIContext: () =>
				createAPIContext({ stateStore: this._stateStore, eventQueue: this._eventQueue }),
			getStore: (moduleID: number, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			header: this._header,
			transaction: this._transaction,
			assets: this._assets,
		};
	}

	public createCommandVerifyContext<T = Record<string, unknown>>(
		paramsSchema: Schema,
	): CommandVerifyContext<T> {
		return {
			logger: this._logger,
			networkIdentifier: this._networkIdentifier,
			getAPIContext: () =>
				createAPIContext({ stateStore: this._stateStore, eventQueue: this._eventQueue }),
			getStore: (moduleID: number, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			transaction: this._transaction,
			params: codec.decode(paramsSchema, this._transaction.params),
		};
	}

	public createCommandExecuteContext<T = Record<string, unknown>>(
		paramsSchema: Schema,
	): CommandExecuteContext<T> {
		return {
			logger: this._logger,
			networkIdentifier: this._networkIdentifier,
			getAPIContext: () =>
				createAPIContext({ stateStore: this._stateStore, eventQueue: this._eventQueue }),
			getStore: (moduleID: number, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			transaction: this._transaction,
			params: codec.decode(paramsSchema, this._transaction.params),
		};
	}

	public get transaction(): Transaction {
		return this._transaction;
	}
}
