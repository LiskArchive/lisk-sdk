/*
 * Copyright © 2020 Lisk Foundation
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
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { objects } from '@liskhq/lisk-utils';
import {
	defaultConfig,
	MODULE_ID_TOKEN,
	STORE_PREFIX_SUPPLY,
	STORE_PREFIX_USER,
} from './constants';
import { TransferCommand } from './commands/transfer';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { GenesisBlockExecuteContext } from '../../node/state_machine';
import {
	configSchema,
	genesisTokenStoreSchema,
	supplyStoreSchema,
	userStoreSchema,
} from './schemas';
import { TokenAPI } from './api';
import { TokenEndpoint } from './endpoint';
import { GenesisTokenStore, InteroperabilityAPI, MinBalance, ModuleConfig } from './types';
import { getUserStoreKey } from './utils';

export class TokenModule extends BaseModule {
	public name = 'token';
	public id = MODULE_ID_TOKEN;
	public api = new TokenAPI(this.id);
	public endpoint = new TokenEndpoint(this.id);

	private _minBalances!: MinBalance[];
	private readonly _transferCommand = new TransferCommand(this.id);

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [this._transferCommand];

	public addDependencies(interoperabilityAPI: InteroperabilityAPI) {
		this.api.addDependencies(interoperabilityAPI);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs) {
		const { moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig) as ModuleConfig;
		const errors = validator.validate(configSchema, config);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._minBalances = config.minBalances.map(mb => ({
			tokenID: Buffer.from(mb.tokenID, 'hex'),
			amount: BigInt(mb.amount),
		}));
		this.api.init({ minBalances: this._minBalances });
		this._transferCommand.init({
			api: this.api,
		});
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = context.assets.getAsset(this.id);
		// if there is no asset, do not initialize
		if (!assetBytes) {
			return;
		}
		const genesisStore = codec.decode<GenesisTokenStore>(genesisTokenStoreSchema, assetBytes);
		const userStore = context.getStore(this.id, STORE_PREFIX_USER);
		for (const userData of genesisStore.userSubstore) {
			await userStore.setWithSchema(
				getUserStoreKey(userData.address, userData.tokenID),
				userData,
				userStoreSchema,
			);
		}
		const supplyStore = context.getStore(this.id, STORE_PREFIX_SUPPLY);
		for (const supplyData of genesisStore.supplySubstore) {
			await supplyStore.setWithSchema(
				supplyData.localID,
				{ totalSupply: supplyData.totalSupply },
				supplyStoreSchema,
			);
		}
	}
}
