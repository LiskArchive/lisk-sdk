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

import { StateStore } from '@liskhq/lisk-chain';
import { Logger } from '../../logger';
import { APIContext, wrapEventQueue } from './api_context';
import { EVENT_INDEX_FINALIZE_GENESIS_STATE, EVENT_INDEX_INIT_GENESIS_STATE } from './constants';
import { EventQueue } from './event_queue';
import { BlockAssets, BlockHeader, GenesisBlockExecuteContext } from './types';

export interface ContextParams {
	logger: Logger;
	stateStore: StateStore;
	header: BlockHeader;
	assets: BlockAssets;
	eventQueue: EventQueue;
}

export class GenesisBlockContext {
	private readonly _stateStore: StateStore;
	private readonly _logger: Logger;
	private readonly _header: BlockHeader;
	private readonly _assets: BlockAssets;
	private readonly _eventQueue: EventQueue;

	public constructor(params: ContextParams) {
		this._logger = params.logger;
		this._stateStore = params.stateStore;
		this._eventQueue = params.eventQueue;
		this._header = params.header;
		this._assets = params.assets;
	}

	public createInitGenesisStateContext(): GenesisBlockExecuteContext {
		const wrappedEventQueue = wrapEventQueue(this._eventQueue, EVENT_INDEX_INIT_GENESIS_STATE);
		return {
			eventQueue: wrappedEventQueue,
			getAPIContext: () =>
				new APIContext({ stateStore: this._stateStore, eventQueue: wrappedEventQueue }),
			getStore: (moduleID: number, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			header: this._header,
			logger: this._logger,
			assets: this._assets,
		};
	}

	public createFinalizeGenesisStateContext(): GenesisBlockExecuteContext {
		const wrappedEventQueue = wrapEventQueue(this._eventQueue, EVENT_INDEX_FINALIZE_GENESIS_STATE);
		return {
			eventQueue: wrappedEventQueue,
			getAPIContext: () =>
				new APIContext({ stateStore: this._stateStore, eventQueue: wrappedEventQueue }),
			getStore: (moduleID: number, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			header: this._header,
			logger: this._logger,
			assets: this._assets,
		};
	}

	public get eventQueue(): EventQueue {
		return this._eventQueue;
	}
}
