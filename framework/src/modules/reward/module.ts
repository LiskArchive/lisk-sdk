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
import { defaultConfig } from './constants';
import { ModuleConfig, ModuleConfigJSON, RandomMethod, TokenMethod } from './types';
import { BlockAfterExecuteContext } from '../../state_machine';
import { RewardMethod } from './method';
import { RewardEndpoint } from './endpoint';
import {
	configSchema,
	getDefaultRewardAtHeightRequestSchema,
	getDefaultRewardAtHeightResponseSchema,
	getInflationRateResponseSchema,
} from './schemas';
import { RewardMintedEvent } from './events/reward_minted';

export class RewardModule extends BaseModule {
	public method = new RewardMethod(this.stores, this.events);
	public configSchema = configSchema;
	public endpoint = new RewardEndpoint(this.stores, this.offchainStores);
	private _tokenMethod!: TokenMethod;
	private _randomMethod!: RandomMethod;
	private _moduleConfig!: ModuleConfig;

	public constructor() {
		super();
		this.events.register(RewardMintedEvent, new RewardMintedEvent(this.name));
	}

	public addDependencies(tokenMethod: TokenMethod, randomMethod: RandomMethod) {
		this._tokenMethod = tokenMethod;
		this._randomMethod = randomMethod;
		this.method.addDependencies(this._randomMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [
				{
					name: this.endpoint.getDefaultRewardAtHeight.name,
					request: getDefaultRewardAtHeightRequestSchema,
					response: getDefaultRewardAtHeightResponseSchema,
				},
				{
					name: this.endpoint.getInflationRate.name,
					request: getDefaultRewardAtHeightRequestSchema,
					response: getInflationRateResponseSchema,
				},
			],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const tokenID = `${args.genesisConfig.chainID}${Buffer.alloc(4).toString('hex')}`;
		const config = objects.mergeDeep({}, { ...defaultConfig, tokenID }, moduleConfig);
		validator.validate<ModuleConfigJSON>(configSchema, config);

		this._moduleConfig = {
			...config,
			tokenID: Buffer.from(config.tokenID, 'hex'),
			brackets: config.brackets.map(bracket => BigInt(bracket)),
		};

		this.method.init({
			config: this._moduleConfig,
		});

		this.endpoint.init(this._moduleConfig, args.genesisConfig.blockTime);
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const [blockReward, reduction] = await this.method.getBlockReward(
			context.getMethodContext(),
			context.header,
			context.assets,
		);
		if (blockReward < BigInt(0)) {
			throw new Error("Block reward can't be negative.");
		}

		if (blockReward !== BigInt(0)) {
			await this._tokenMethod.mint(
				context.getMethodContext(),
				context.header.generatorAddress,
				this._moduleConfig.tokenID,
				blockReward,
			);
		}

		this.events.get(RewardMintedEvent).log(context, context.header.generatorAddress, {
			amount: blockReward,
			reduction,
		});
	}
}
