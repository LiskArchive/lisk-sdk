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
import { MODULE_ID_REWARD } from './constants';
import { LiskBFTAPI, ModuleConfig, RandomAPI, TokenAPI, TokenIDReward } from './types';
import { BlockAfterExecuteContext } from '../../node/state_machine';
import { RewardAPI } from './api';
import { RewardEndpoint } from './endpoint';
import { configSchema } from './schemas';

export class RewardModule extends BaseModule {
	public id = MODULE_ID_REWARD;
	public name = 'reward';
	public api = new RewardAPI(this.id);
	public configSchema = configSchema;
	public endpoint = new RewardEndpoint(this.id);
	private _tokenAPI!: TokenAPI;
	private _liskBFTAPI!: LiskBFTAPI;
	private _randomAPI!: RandomAPI;
	private _tokenIDReward!: TokenIDReward;
	private _moduleConfig!: ModuleConfig;

	public addDependencies(tokenAPI: TokenAPI, randomAPI: RandomAPI, liskBFTAPI: LiskBFTAPI) {
		this._tokenAPI = tokenAPI;
		this._randomAPI = randomAPI;
		this._liskBFTAPI = liskBFTAPI;
		this.api.addDependencies(liskBFTAPI, randomAPI);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		this._moduleConfig = (moduleConfig as unknown) as ModuleConfig;
		this._tokenIDReward = this._moduleConfig.tokenIDReward;

		this.endpoint.init({
			config: {
				brackets: this._moduleConfig.brackets.map(bracket => BigInt(bracket)),
				offset: this._moduleConfig.offset,
				distance: this._moduleConfig.distance,
			},
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterBlockExecute(_context: BlockAfterExecuteContext): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(this._tokenAPI, this._liskBFTAPI, this._randomAPI, this._tokenIDReward);
	}
}
