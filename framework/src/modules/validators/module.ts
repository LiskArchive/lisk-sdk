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

import { utils } from '@liskhq/lisk-cryptography';
import { objects } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleInitArgs, ModuleMetadata } from '../base_module';
import {
	defaultConfig,
	EMPTY_KEY,
	MODULE_ID_VALIDATORS,
	STORE_PREFIX_GENESIS_DATA,
} from './constants';
import { GenesisBlockExecuteContext } from '../../state_machine';
import { ValidatorsAPI } from './api';
import { ValidatorsEndpoint } from './endpoint';
import {
	configSchema,
	genesisDataSchema,
	validateBLSKeyRequestSchema,
	validateBLSKeyResponseSchema,
} from './schemas';

export class ValidatorsModule extends BaseModule {
	public id = utils.intToBuffer(MODULE_ID_VALIDATORS, 4);
	public name = 'validators';
	public api = new ValidatorsAPI(this.id);
	public endpoint = new ValidatorsEndpoint(this.id);
	private _blockTime!: number;

	public metadata(): ModuleMetadata {
		return {
			endpoints: [
				// getGeneratorList is not listed since it will be moved to engine endpoint
				{
					name: this.endpoint.validateBLSKey.name,
					request: validateBLSKeyRequestSchema,
					response: validateBLSKeyResponseSchema,
				},
			],
			commands: [],
			events: [],
			assets: [],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig);
		validator.validate(configSchema, config);

		this._blockTime = config.blockTime as number;

		this.api.init({
			config: {
				blockTime: this._blockTime,
			},
		});
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const genesisDataSubStore = context.getStore(this.id, STORE_PREFIX_GENESIS_DATA);
		await genesisDataSubStore.setWithSchema(
			EMPTY_KEY,
			{ timestamp: context.header.timestamp },
			genesisDataSchema,
		);
	}
}
