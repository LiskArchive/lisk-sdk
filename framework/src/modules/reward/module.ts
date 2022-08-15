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
import { codec } from '@liskhq/lisk-codec';
import { BaseModule, ModuleInitArgs, ModuleMetadata } from '../base_module';
import { defaultConfig, TYPE_ID_REWARD_MINTED } from './constants';
import { ModuleConfig, RandomAPI, TokenAPI, RewardMintedData } from './types';
import { BlockAfterExecuteContext } from '../../state_machine';
import { RewardAPI } from './api';
import { RewardEndpoint } from './endpoint';
import {
	configSchema,
	getDefaultRewardAtHeightRequestSchema,
	getDefaultRewardAtHeightResponseSchema,
	rewardMintedDataSchema,
} from './schemas';

export class RewardModule extends BaseModule {
	public name = 'reward';
	public api = new RewardAPI(this.name);
	public configSchema = configSchema;
	public endpoint = new RewardEndpoint(this.name);
	private _tokenAPI!: TokenAPI;
	private _randomAPI!: RandomAPI;
	private _tokenID!: Buffer;
	private _moduleConfig!: ModuleConfig;

	public addDependencies(tokenAPI: TokenAPI, randomAPI: RandomAPI) {
		this._tokenAPI = tokenAPI;
		this._randomAPI = randomAPI;
		this.api.addDependencies(this._randomAPI);
	}

	public metadata(): ModuleMetadata {
		return {
			endpoints: [
				{
					name: this.endpoint.getDefaultRewardAtHeight.name,
					request: getDefaultRewardAtHeightRequestSchema,
					response: getDefaultRewardAtHeightResponseSchema,
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

		this._moduleConfig = (config as unknown) as ModuleConfig;
		this._tokenID = Buffer.from(this._moduleConfig.tokenID, 'hex');

		this.api.init({
			config: {
				brackets: this._moduleConfig.brackets.map(bracket => BigInt(bracket)),
				offset: this._moduleConfig.offset,
				distance: this._moduleConfig.distance,
			},
		});

		this.endpoint.init({
			config: {
				brackets: this._moduleConfig.brackets.map(bracket => BigInt(bracket)),
				offset: this._moduleConfig.offset,
				distance: this._moduleConfig.distance,
			},
		});
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const [blockReward, reduction] = await this.api.getBlockReward(
			context.getAPIContext(),
			context.header,
			context.assets,
			context.impliesMaxPrevote,
		);

		if (blockReward < BigInt(0)) {
			throw new Error("Block reward can't be negative.");
		}

		if (blockReward !== BigInt(0)) {
			await this._tokenAPI.mint(
				context.getAPIContext(),
				context.header.generatorAddress,
				this._tokenID,
				blockReward,
			);
		}

		const rewardMintedData: RewardMintedData = {
			amount: blockReward,
			reduction,
		};

		const data = codec.encode(rewardMintedDataSchema, rewardMintedData);
		context.eventQueue.add(
			this.id,
			TYPE_ID_REWARD_MINTED,
			codec.encode(rewardMintedDataSchema, data),
			[context.header.generatorAddress],
		);
	}
}
