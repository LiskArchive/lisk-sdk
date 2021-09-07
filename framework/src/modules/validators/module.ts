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
import { MODULE_ID_VALIDATORS } from './constants';
import { ModuleConfig } from './types';
import { GenesisBlockExecuteContext } from '../../node/state_machine';
import { ValidatorsAPI } from './api';
import { ValidatorsEndpoint } from './endpoint';

export class ValidatorsModule extends BaseModule {
	public id = MODULE_ID_VALIDATORS;
	public name = 'validators';
	public api = new ValidatorsAPI(this.id);
	public endpoint = new ValidatorsEndpoint(this.id);
	private _blockTime!: number;
	private _moduleConfig!: ModuleConfig;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		this._moduleConfig = (moduleConfig as unknown) as ModuleConfig;
		if (this._moduleConfig.blockTime < 1) {
			throw new Error('Block time cannot be less than 1');
		}
		this._blockTime = this._moduleConfig.blockTime;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterGenesisBlockExecute(_context: GenesisBlockExecuteContext): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(this._blockTime);
	}
}
