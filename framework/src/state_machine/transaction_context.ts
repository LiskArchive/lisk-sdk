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

import { Transaction } from '@liskhq/lisk-chain';
import { codec, Schema } from '@liskhq/lisk-codec';
import { Logger } from '../logger';
import { createMethodContext, createImmutableMethodContext } from './method_context';
import { EventQueue } from './event_queue';
import { PrefixedStateReadWriter } from './prefixed_state_read_writer';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	TransactionExecuteContext,
	TransactionVerifyContext,
	BlockHeader,
	BlockAssets,
	Validator,
} from './types';

interface ContextParams {
	chainID: Buffer;
	stateStore: PrefixedStateReadWriter;
	logger: Logger;
	eventQueue: EventQueue;
	transaction: Transaction;
	currentValidators: Validator[];
	impliesMaxPrevote: boolean;
	maxHeightCertified: number;
	certificateThreshold: bigint;
	header?: BlockHeader;
	assets?: BlockAssets;
}

export class TransactionContext {
	private readonly _stateStore: PrefixedStateReadWriter;
	private readonly _chainID: Buffer;
	private readonly _logger: Logger;
	private readonly _eventQueue: EventQueue;
	private readonly _transaction: Transaction;
	private readonly _header?: BlockHeader;
	private readonly _assets?: BlockAssets;
	private readonly _currentValidators: Validator[];
	private readonly _impliesMaxPrevote: boolean;
	private readonly _maxHeightCertified: number;
	private readonly _certificateThreshold: bigint;

	public constructor(params: ContextParams) {
		this._stateStore = params.stateStore;
		this._logger = params.logger;
		this._header = params.header;
		this._eventQueue = params.eventQueue;
		this._chainID = params.chainID;
		this._transaction = params.transaction;
		this._assets = params.assets;
		this._currentValidators = params.currentValidators;
		this._impliesMaxPrevote = params.impliesMaxPrevote;
		this._maxHeightCertified = params.maxHeightCertified;
		this._certificateThreshold = params.certificateThreshold;
	}

	public createTransactionVerifyContext(): TransactionVerifyContext {
		return {
			logger: this._logger,
			chainID: this._chainID,
			getMethodContext: () => createImmutableMethodContext(this._stateStore),
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
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
		const childQueue = this._eventQueue.getChildQueue(this._transaction.id);
		return {
			logger: this._logger,
			chainID: this._chainID,
			eventQueue: childQueue,
			getMethodContext: () =>
				createMethodContext({ stateStore: this._stateStore, eventQueue: childQueue }),
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
				this._stateStore.getStore(moduleID, storePrefix),
			header: this._header,
			transaction: this._transaction,
			assets: this._assets,
			currentValidators: this._currentValidators,
			impliesMaxPrevote: this._impliesMaxPrevote,
			maxHeightCertified: this._maxHeightCertified,
			certificateThreshold: this._certificateThreshold,
		};
	}

	public createCommandVerifyContext<T = undefined>(paramsSchema?: Schema): CommandVerifyContext<T> {
		return {
			logger: this._logger,
			chainID: this._chainID,
			getMethodContext: () =>
				createMethodContext({ stateStore: this._stateStore, eventQueue: this._eventQueue }),
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
				this._stateStore.getStore(moduleID, storePrefix),
			transaction: this._transaction,
			params: (paramsSchema
				? codec.decode(paramsSchema, this._transaction.params)
				: undefined) as T,
		};
	}

	public createCommandExecuteContext<T = undefined>(
		paramsSchema?: Schema,
	): CommandExecuteContext<T> {
		if (!this._header) {
			throw new Error('Transaction Execution requires block header in the context.');
		}
		if (!this._assets) {
			throw new Error('Transaction Execution requires block assets in the context.');
		}
		const childQueue = this._eventQueue.getChildQueue(this._transaction.id);
		return {
			logger: this._logger,
			chainID: this._chainID,
			// TODO: Need to pass wrapper of eventQueue with possibility to create/restore snapshot https://github.com/LiskHQ/lisk-sdk/issues/7211
			eventQueue: this.eventQueue,
			getMethodContext: () =>
				createMethodContext({ stateStore: this._stateStore, eventQueue: childQueue }),
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
				this._stateStore.getStore(moduleID, storePrefix),
			header: this._header,
			transaction: this._transaction,
			assets: this._assets,
			params: (paramsSchema
				? codec.decode(paramsSchema, this._transaction.params)
				: undefined) as T,
			currentValidators: this._currentValidators,
			impliesMaxPrevote: this._impliesMaxPrevote,
			maxHeightCertified: this._maxHeightCertified,
			certificateThreshold: this._certificateThreshold,
		};
	}

	public get transaction(): Transaction {
		return this._transaction;
	}

	public get eventQueue(): EventQueue {
		return this._eventQueue;
	}

	public get stateStore(): PrefixedStateReadWriter {
		return this._stateStore;
	}
}
