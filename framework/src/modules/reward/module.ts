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
import { defaultConfig } from './constants';
import { ModuleConfig, RandomMethod, TokenMethod, RewardMintedData } from './types';
import { BlockAfterExecuteContext } from '../../state_machine';
import { RewardMethod } from './method';
import { RewardEndpoint } from './endpoint';
import {
	configSchema,
	getDefaultRewardAtHeightRequestSchema,
	getDefaultRewardAtHeightResponseSchema,
	rewardMintedDataSchema,
} from './schemas';
import { EVENT_REWARD_MINTED_DATA_NAME } from '../../state_machine/constants';

export class RewardModule extends BaseModule {
	public method = new RewardMethod(this.stores, this.events);
	public configSchema = configSchema;
	public endpoint = new RewardEndpoint(this.stores, this.offchainStores);
	private _tokenMethod!: TokenMethod;
	private _randomMethod!: RandomMethod;
	private _tokenID!: Buffer;
	private _moduleConfig!: ModuleConfig;

	public addDependencies(tokenMethod: TokenMethod, randomMethod: RandomMethod) {
		this._tokenMethod = tokenMethod;
		this._randomMethod = randomMethod;
		this.method.addDependencies(this._randomMethod);
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

		this.method.init({
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
		const [blockReward, reduction] = await this.method.getBlockReward(
			context.getMethodContext(),
			context.header,
			context.assets,
			context.impliesMaxPrevote,
		);
		if (blockReward < BigInt(0)) {
			throw new Error("Block reward can't be negative.");
		}

		if (blockReward !== BigInt(0)) {
			await this._tokenMethod.mint(
				context.getMethodContext(),
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
			this.name,
			EVENT_REWARD_MINTED_DATA_NAME,
			codec.encode(rewardMintedDataSchema, data),
			[context.header.generatorAddress],
		);
	}
}
