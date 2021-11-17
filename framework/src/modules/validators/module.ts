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

import { BaseModule, ModuleInitArgs } from '../base_module';
import { EMPTY_KEY, MODULE_ID_VALIDATORS, STORE_PREFIX_GENESIS_DATA } from './constants';
import { GenesisBlockExecuteContext } from '../../node/state_machine';
import { ValidatorsAPI } from './api';
import { ValidatorsEndpoint } from './endpoint';
import { genesisDataSchema } from './schemas';

export class ValidatorsModule extends BaseModule {
	public id = MODULE_ID_VALIDATORS;
	public name = 'validators';
	public api = new ValidatorsAPI(this.id);
	public endpoint = new ValidatorsEndpoint(this.id);
	private _blockTime!: number;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const { blockTime } = moduleConfig;

		if (!blockTime || typeof blockTime !== 'number') {
			throw new Error('BlockTime must be a number.');
		}
		if (blockTime < 1) {
			throw new Error('Block time cannot be less than 1.');
		}
		this._blockTime = blockTime;

		this.api.init({
			config: {
				blockTime: this._blockTime,
			},
		});
	}

	public async afterGenesisBlockExecute(context: GenesisBlockExecuteContext): Promise<void> {
		const genesisDataSubStore = context.getStore(this.id, STORE_PREFIX_GENESIS_DATA);
		await genesisDataSubStore.setWithSchema(
			EMPTY_KEY,
			{ timestamp: context.header.timestamp },
			genesisDataSchema,
		);
	}
}
