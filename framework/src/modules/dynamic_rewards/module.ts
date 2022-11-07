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
import { DECIMAL_PERCENT_FACTOR, defaultConfig, EMPTY_BYTES } from './constants';
import {
	REWARD_NO_REDUCTION,
	REWARD_REDUCTION_FACTOR_BFT,
	REWARD_REDUCTION_MAX_PREVOTES,
	REWARD_REDUCTION_SEED_REVEAL,
} from '../reward/constants';
import {
	DPoSMethod,
	ModuleConfig,
	ModuleConfigJSON,
	RandomMethod,
	TokenMethod,
	ValidatorsMethod,
} from './types';
import { BlockAfterExecuteContext, BlockHeader, ImmutableMethodContext } from '../../state_machine';
import { DynamicRewardMethod } from './method';
import { DynamicRewardEndpoint } from './endpoint';
import { configSchema } from './schemas';
import { RewardMintedEvent } from '../reward/events/reward_minted';
import { EndOfRoundTimestampStore } from './stores/end_of_round_timestamp';
import {
	BlockAssets,
	BlockExecuteContext,
	GenesisBlockExecuteContext,
} from '../../state_machine/types';
import { calculateDefaultReward } from '../reward/calculate_reward';
import { BlockRewardsDataStore } from './stores/block_rewards';
import {
	getDefaultRewardAtHeightRequestSchema,
	getDefaultRewardAtHeightResponseSchema,
} from '../reward/schemas';

export class DynamicRewardModule extends BaseModule {
	public method = new DynamicRewardMethod(this.stores, this.events);
	public configSchema = configSchema;
	public endpoint = new DynamicRewardEndpoint(this.stores, this.offchainStores);
	private _tokenMethod!: TokenMethod;
	private _randomMethod!: RandomMethod;
	private _validatorMethod!: ValidatorsMethod;
	private _dposMethod!: DPoSMethod;
	private _moduleConfig!: ModuleConfig;

	public constructor() {
		super();
		this.stores.register(EndOfRoundTimestampStore, new EndOfRoundTimestampStore(this.name));
		this.stores.register(BlockRewardsDataStore, new BlockRewardsDataStore(this.name));
		this.events.register(RewardMintedEvent, new RewardMintedEvent(this.name));
	}

	public addDependencies(
		tokenMethod: TokenMethod,
		randomMethod: RandomMethod,
		validatorMethod: ValidatorsMethod,
		dposMethod: DPoSMethod,
	) {
		this._tokenMethod = tokenMethod;
		this._randomMethod = randomMethod;
		this._validatorMethod = validatorMethod;
		this._dposMethod = dposMethod;
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
			events: this.events.values().map(v => ({
				name: v.name,
				data: v.schema,
			})),
			assets: [],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const config = objects.mergeDeep(
			{},
			{
				...defaultConfig,
				tokenID: `${args.genesisConfig.chainID}00000000`,
			},
			moduleConfig,
		);
		validator.validate<ModuleConfigJSON>(configSchema, config);

		this._moduleConfig = {
			...config,
			brackets: config.brackets.map(bracket => BigInt(bracket)),
			tokenID: Buffer.from(config.tokenID, 'hex'),
		};

		this.method.init({ config: this._moduleConfig });

		this.endpoint.init(this._moduleConfig);
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		await this.stores
			.get(EndOfRoundTimestampStore)
			.set(context, EMPTY_BYTES, { timestamp: context.header.timestamp });
	}

	public async beforeTransactionsExecute(context: BlockExecuteContext): Promise<void> {
		const defaultReward = await this._getDefaultBlockReward(
			context.getMethodContext(),
			context.header,
		);

		await this.stores
			.get(BlockRewardsDataStore)
			.set(context, EMPTY_BYTES, { reward: defaultReward });
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const { reward: defaultReward } = await this.stores
			.get(BlockRewardsDataStore)
			.get(context, EMPTY_BYTES);
		const [blockReward, reduction] = await this._getBlockRewardDeduction(
			context.getMethodContext(),
			context.header,
			context.assets,
			defaultReward,
		);

		if (blockReward !== BigInt(0)) {
			await this._tokenMethod.mint(
				context.getMethodContext(),
				context.header.generatorAddress,
				this._moduleConfig.tokenID,
				blockReward,
			);
			await this._dposMethod.updateSharedRewards(
				context.getMethodContext(),
				context.header.generatorAddress,
				this._moduleConfig.tokenID,
				blockReward,
			);
		}

		const isEndOfRound = await this._dposMethod.isEndOfRound(
			context.getMethodContext(),
			context.header.height,
		);
		if (isEndOfRound) {
			await this.stores
				.get(EndOfRoundTimestampStore)
				.set(context, EMPTY_BYTES, { timestamp: context.header.timestamp });
		}

		this.events.get(RewardMintedEvent).log(context, context.header.generatorAddress, {
			amount: blockReward,
			reduction,
		});
	}

	public async _getBlockRewardDeduction(
		context: ImmutableMethodContext,
		header: BlockHeader,
		assets: BlockAssets,
		defaultReward: bigint,
	): Promise<[bigint, number]> {
		const isSeedRevealValid = await this._randomMethod.isSeedRevealValid(
			context,
			header.generatorAddress,
			assets,
		);
		if (!isSeedRevealValid) {
			return [BigInt(0), REWARD_REDUCTION_SEED_REVEAL];
		}

		if (!header.impliesMaxPrevotes) {
			return [defaultReward / REWARD_REDUCTION_FACTOR_BFT, REWARD_REDUCTION_MAX_PREVOTES];
		}

		return [defaultReward, REWARD_NO_REDUCTION];
	}

	public async _getDefaultBlockReward(
		context: ImmutableMethodContext,
		header: BlockHeader,
	): Promise<bigint> {
		const roundLength = this._dposMethod.getRoundLength(context);
		const { timestamp } = await this.stores.get(EndOfRoundTimestampStore).get(context, EMPTY_BYTES);

		const generatorsMap = await this._validatorMethod.getGeneratorsBetweenTimestamps(
			context,
			timestamp,
			header.timestamp,
		);

		const defaultReward = calculateDefaultReward(this._moduleConfig, header.height);
		const minimalRewardActiveDelegates =
			(defaultReward * BigInt(this._moduleConfig.factorMinimumRewardActiveDelegates)) /
			DECIMAL_PERCENT_FACTOR;
		if (Object.keys(generatorsMap).length >= roundLength) {
			return minimalRewardActiveDelegates;
		}

		const validatorsParams = await this._validatorMethod.getValidatorsParams(context);
		let bftWeightSum = BigInt(0);
		let bftValidator: typeof validatorsParams.validators[0] | undefined;

		for (const v of validatorsParams.validators) {
			bftWeightSum += v.bftWeight;
			if (v.address.equals(header.generatorAddress)) {
				bftValidator = v;
			}
		}
		if (!bftValidator) {
			throw new Error('Invalid generator. Validator params does not include the validator.');
		}
		const numberOfActiveDelegates = this._dposMethod.getNumberOfActiveDelegates(context);
		const totalRewardActiveDelegates = defaultReward * BigInt(numberOfActiveDelegates);
		const stakeRewardActiveDelegates =
			totalRewardActiveDelegates - BigInt(numberOfActiveDelegates) * minimalRewardActiveDelegates;
		if (bftValidator.bftWeight > BigInt(0)) {
			return (
				minimalRewardActiveDelegates +
				(bftValidator.bftWeight * stakeRewardActiveDelegates) / bftWeightSum
			);
		}

		return defaultReward;
	}
}
