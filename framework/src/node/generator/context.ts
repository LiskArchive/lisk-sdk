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
import { Logger } from '../../logger';
import { BlockGenerateContext } from './types';
import { GeneratorStore } from './generator_store';
import { createAPIContext, EventQueue } from '../state_machine';

interface GenerationContextArgs {
	logger: Logger;
	stateStore: StateStore;
	header: BlockHeader;
	assets: BlockAssets;
	generatorStore: GeneratorStore;
	networkIdentifier: Buffer;
}

export class GenerationContext {
	private readonly _logger: Logger;
	private readonly _networkIdentifier: Buffer;
	private readonly _stateStore: StateStore;
	private readonly _header: BlockHeader;
	private readonly _assets: BlockAssets;
	private readonly _generatorStore: GeneratorStore;

	public constructor(args: GenerationContextArgs) {
		this._logger = args.logger;
		this._networkIdentifier = args.networkIdentifier;
		this._header = args.header;
		this._stateStore = args.stateStore;
		this._generatorStore = args.generatorStore;
		this._assets = args.assets;
	}

	public get blockHeader(): BlockHeader {
		return this._header;
	}

	public getBlockGenerateContext(): BlockGenerateContext {
		return {
			logger: this._logger,
			getAPIContext: () =>
				createAPIContext({ stateStore: this._stateStore, eventQueue: new EventQueue() }),
			getStore: (moduleID: number, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			getGeneratorStore: (moduleID: number) => this._generatorStore.getGeneratorStore(moduleID),
			header: this._header,
			assets: this._assets,
			networkIdentifier: this._networkIdentifier,
		};
	}
}
