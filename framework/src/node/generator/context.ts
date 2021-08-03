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

import { StateStore } from '@liskhq/lisk-chain/dist-node/state_store';
import { Logger } from '../../logger';
import { BlockGenerateContext, WritableBlockHeader } from './types';
import { GeneratorStore } from './generator_store';
import { APIContext, EventQueue } from '../state_machine';

interface GenerationContextArgs {
	logger: Logger;
	stateStore: StateStore;
	header: WritableBlockHeader;
	generatorStore: GeneratorStore;
	networkIdentifier: Buffer;
}

export class GenerationContext {
	private readonly _logger: Logger;
	private readonly _networkIdentifier: Buffer;
	private readonly _stateStore: StateStore;
	private readonly _header: WritableBlockHeader;
	private readonly _generatorStore: GeneratorStore;

	public constructor(args: GenerationContextArgs) {
		this._logger = args.logger;
		this._networkIdentifier = args.networkIdentifier;
		this._header = args.header;
		this._stateStore = args.stateStore;
		this._generatorStore = args.generatorStore;
	}

	public get blockHeader(): WritableBlockHeader {
		return this._header;
	}

	public getBlockGenerateContext(): BlockGenerateContext {
		return {
			logger: this._logger,
			getAPIContext: () =>
				new APIContext({ stateStore: this._stateStore, eventQueue: new EventQueue() }),
			getStore: (moduleID: number, storePrefix: number) =>
				this._stateStore.getStore(moduleID, storePrefix),
			getGeneratorStore: (moduleID: number) => this._generatorStore.getGeneratorStore(moduleID),
			header: this._header,
			networkIdentifier: this._networkIdentifier,
		};
	}
}
