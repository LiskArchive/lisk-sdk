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

import { BlockAssets, BlockHeader, StateStore } from '@liskhq/lisk-chain';
import { Logger } from '../logger';
import { createAPIContext } from './api_context';
import { EventQueue } from './event_queue';
import { PrefixedStateReadWriter } from './prefixed_state_read_writer';
import { InsertAssetContext } from './types';

interface GenerationContextArgs {
	logger: Logger;
	stateStore: PrefixedStateReadWriter;
	header: BlockHeader;
	generatorStore: StateStore;
	networkIdentifier: Buffer;
	finalizedHeight: number;
}

export class GenerationContext {
	private readonly _logger: Logger;
	private readonly _networkIdentifier: Buffer;
	private readonly _stateStore: PrefixedStateReadWriter;
	private readonly _header: BlockHeader;
	private readonly _assets: BlockAssets;
	private readonly _generatorStore: StateStore;
	private readonly _finalizedHeight: number;

	public constructor(args: GenerationContextArgs) {
		this._logger = args.logger;
		this._networkIdentifier = args.networkIdentifier;
		this._header = args.header;
		this._stateStore = args.stateStore;
		this._generatorStore = args.generatorStore;
		this._assets = new BlockAssets();
		this._finalizedHeight = args.finalizedHeight;
	}

	public get blockHeader(): BlockHeader {
		return this._header;
	}

	public getInsertAssetContext(): InsertAssetContext {
		return {
			logger: this._logger,
			getAPIContext: () =>
				createAPIContext({ stateStore: this._stateStore, eventQueue: new EventQueue() }),
			getStore: (moduleID: Buffer, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			getGeneratorStore: (moduleID: Buffer) => this._generatorStore.getStore(moduleID, 0),
			header: this._header,
			assets: this._assets,
			networkIdentifier: this._networkIdentifier,
			getFinalizedHeight: () => this._finalizedHeight,
		};
	}

	public get assets(): BlockAssets {
		return this._assets;
	}
}
