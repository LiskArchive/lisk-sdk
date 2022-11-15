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

import { objects } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleInitArgs, ModuleMetadata } from '../base_module';
import { defaultConfig, EMPTY_KEY } from './constants';
import { GenesisBlockExecuteContext } from '../../state_machine';
import { ValidatorsMethod } from './method';
import { ValidatorsEndpoint } from './endpoint';
import { configSchema, validateBLSKeyRequestSchema, validateBLSKeyResponseSchema } from './schemas';
import { GenesisStore } from './stores/genesis';
import { ValidatorKeysStore } from './stores/validator_keys';
import { BLSKeyStore } from './stores/bls_keys';
import { GeneratorKeyRegistrationEvent } from './events/generator_key_registration';
import { BLSKeyRegistrationEvent } from './events/bls_key_registration';
import { ValidatorsParamsStore } from './stores/validators_params';

export class ValidatorsModule extends BaseModule {
	public method = new ValidatorsMethod(this.stores, this.events);
	public endpoint = new ValidatorsEndpoint(this.stores, this.offchainStores);
	private _blockTime!: number;

	public constructor() {
		super();
		this.stores.register(GenesisStore, new GenesisStore(this.name));
		this.stores.register(ValidatorKeysStore, new ValidatorKeysStore(this.name));
		this.stores.register(BLSKeyStore, new BLSKeyStore(this.name));
		this.stores.register(ValidatorsParamsStore, new ValidatorsParamsStore(this.name));

		this.events.register(
			GeneratorKeyRegistrationEvent,
			new GeneratorKeyRegistrationEvent(this.name),
		);
		this.events.register(BLSKeyRegistrationEvent, new BLSKeyRegistrationEvent(this.name));
	}

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

		this.method.init({
			config: {
				blockTime: this._blockTime,
			},
		});
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const genesisDataSubStore = this.stores.get(GenesisStore);
		await genesisDataSubStore.set(context, EMPTY_KEY, { timestamp: context.header.timestamp });
	}
}
