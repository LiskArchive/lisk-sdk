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

import { Logger } from '../logger';
import { MethodContext } from './method_context';
import { EVENT_INDEX_FINALIZE_GENESIS_STATE, EVENT_INDEX_INIT_GENESIS_STATE } from './constants';
import { EventQueue } from './event_queue';
import { PrefixedStateReadWriter } from './prefixed_state_read_writer';
import { BlockAssets, BlockHeader, GenesisBlockExecuteContext, Validator } from './types';

export interface ContextParams {
	logger: Logger;
	stateStore: PrefixedStateReadWriter;
	header: BlockHeader;
	assets: BlockAssets;
	eventQueue: EventQueue;
	chainID: Buffer;
}

export class GenesisBlockContext {
	private readonly _stateStore: PrefixedStateReadWriter;
	private readonly _logger: Logger;
	private readonly _header: BlockHeader;
	private readonly _assets: BlockAssets;
	private readonly _eventQueue: EventQueue;
	private readonly _chainID: Buffer;
	private _nextValidators?: {
		precommitThreshold: bigint;
		certificateThreshold: bigint;
		validators: Validator[];
	};

	public constructor(params: ContextParams) {
		this._logger = params.logger;
		this._stateStore = params.stateStore;
		this._eventQueue = params.eventQueue;
		this._header = params.header;
		this._assets = params.assets;
		this._chainID = params.chainID;
	}

	public createInitGenesisStateContext(): GenesisBlockExecuteContext {
		const childQueue = this._eventQueue.getChildQueue(EVENT_INDEX_INIT_GENESIS_STATE);
		return {
			eventQueue: childQueue,
			getMethodContext: () =>
				new MethodContext({ stateStore: this._stateStore, eventQueue: childQueue }),
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
				this._stateStore.getStore(moduleID, storePrefix),
			stateStore: this._stateStore,
			header: this._header,
			logger: this._logger,
			assets: this._assets,
			chainID: this._chainID,
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

	public createFinalizeGenesisStateContext(): GenesisBlockExecuteContext {
		const childQueue = this._eventQueue.getChildQueue(EVENT_INDEX_FINALIZE_GENESIS_STATE);
		return {
			eventQueue: childQueue,
			getMethodContext: () =>
				new MethodContext({ stateStore: this._stateStore, eventQueue: childQueue }),
			getStore: (moduleID: Buffer, storePrefix: Buffer) =>
				this._stateStore.getStore(moduleID, storePrefix),
			stateStore: this._stateStore,
			header: this._header,
			logger: this._logger,
			assets: this._assets,
			chainID: this._chainID,
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
}
