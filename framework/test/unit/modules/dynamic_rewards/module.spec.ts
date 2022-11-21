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
import { BlockHeader } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import {
	createBlockContext,
	createBlockHeaderWithDefaults,
	createGenesisBlockContext,
	InMemoryPrefixedStateDB,
} from '../../../../src/testing';
import { RewardMintedEvent } from '../../../../src/modules/reward/events/reward_minted';
import { DynamicRewardModule } from '../../../../src/modules/dynamic_rewards';
import {
	PoSMethod,
	RandomMethod,
	TokenMethod,
	ValidatorsMethod,
} from '../../../../src/modules/dynamic_rewards/types';
import {
	DECIMAL_PERCENT_FACTOR,
	defaultConfig,
	EMPTY_BYTES,
} from '../../../../src/modules/dynamic_rewards/constants';
import {
	BlockAfterExecuteContext,
	BlockExecuteContext,
	GenesisBlockExecuteContext,
} from '../../../../src';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { EndOfRoundTimestampStore } from '../../../../src/modules/dynamic_rewards/stores/end_of_round_timestamp';
import { BlockRewardsDataStore } from '../../../../src/modules/dynamic_rewards/stores/block_rewards';
import {
	REWARD_NO_REDUCTION,
	REWARD_REDUCTION_MAX_PREVOTES,
	REWARD_REDUCTION_SEED_REVEAL,
} from '../../../../src/modules/reward/constants';

describe('DynamicRewardModule', () => {
	const defaultRoundLength = 103;
	const defaultNumberOfActiveValidators = 101;

	let rewardModule: DynamicRewardModule;
	let tokenMethod: TokenMethod;
	let randomMethod: RandomMethod;
	let validatorsMethod: ValidatorsMethod;
	let posMethod: PoSMethod;

	beforeEach(async () => {
		rewardModule = new DynamicRewardModule();
		await rewardModule.init({
			generatorConfig: {},
			genesisConfig: { chainID: '00000000' } as any,
			moduleConfig: {},
		});
		tokenMethod = { mint: jest.fn() };
		randomMethod = { isSeedRevealValid: jest.fn().mockReturnValue(true) };
		validatorsMethod = {
			getGeneratorsBetweenTimestamps: jest.fn(),
			getValidatorsParams: jest.fn(),
		};
		posMethod = {
			getNumberOfActiveValidators: jest.fn().mockReturnValue(defaultNumberOfActiveValidators),
			getRoundLength: jest.fn().mockReturnValue(defaultRoundLength),
			updateSharedRewards: jest.fn(),
			isEndOfRound: jest.fn(),
		};
		rewardModule.addDependencies(tokenMethod, randomMethod, validatorsMethod, posMethod);
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			rewardModule = new DynamicRewardModule();
			await expect(
				rewardModule.init({
					genesisConfig: { chainID: '00000000' } as any,
					moduleConfig: {},
					generatorConfig: {},
				}),
			).toResolve();

			expect(rewardModule['_moduleConfig']).toEqual({
				...defaultConfig,
				brackets: defaultConfig.brackets.map(b => BigInt(b)),
				tokenID: Buffer.from(defaultConfig.tokenID, 'hex'),
			});
		});

		it('should initialize config with given value', async () => {
			rewardModule = new DynamicRewardModule();
			await expect(
				rewardModule.init({
					genesisConfig: { chainID: '00000000' } as any,
					moduleConfig: { offset: 1000 },
					generatorConfig: {},
				}),
			).toResolve();

			expect(rewardModule['_moduleConfig'].offset).toEqual(1000);
		});

		it('should not initialize config with invalid value for tokenID', async () => {
			rewardModule = new DynamicRewardModule();
			try {
				await rewardModule.init({
					genesisConfig: { chainID: '00000000' } as any,
					moduleConfig: {
						tokenID: '00000000000000000',
					},
					generatorConfig: {},
				});
			} catch (error: any) {
				// eslint-disable-next-line jest/no-try-expect
				expect(error.message).toInclude("Property '.tokenID' must NOT have more than 16 character");
			}
		});
	});

	describe('initGenesisState', () => {
		let blockHeader: BlockHeader;
		let blockExecuteContext: GenesisBlockExecuteContext;
		let stateStore: PrefixedStateReadWriter;

		beforeEach(() => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			blockHeader = createBlockHeaderWithDefaults({ timestamp: 1234 });
			blockExecuteContext = createGenesisBlockContext({
				header: blockHeader,
				stateStore,
			}).createInitGenesisStateContext();
		});

		it('should store genesis header timestamp', async () => {
			await rewardModule.initGenesisState(blockExecuteContext);
			const { timestamp } = await rewardModule.stores
				.get(EndOfRoundTimestampStore)
				.get(blockExecuteContext, EMPTY_BYTES);

			expect(timestamp).toEqual(1234);
		});
	});

	describe('beforeTransactionsExecute', () => {
		let blockExecuteContext: BlockExecuteContext;
		let generatorAddress: Buffer;
		let standbyValidatorAddress: Buffer;
		let stateStore: PrefixedStateReadWriter;

		const activeValidator = 4;
		const minimumReward =
			(BigInt(defaultConfig.brackets[0]) *
				BigInt(defaultConfig.factorMinimumRewardActiveValidators)) /
			DECIMAL_PERCENT_FACTOR;
		const totalRewardActiveValidator = BigInt(defaultConfig.brackets[0]) * BigInt(activeValidator);
		const ratioReward = totalRewardActiveValidator - minimumReward * BigInt(activeValidator);

		beforeEach(async () => {
			generatorAddress = utils.getRandomBytes(20);
			standbyValidatorAddress = utils.getRandomBytes(20);
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			const blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				generatorAddress,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				header: blockHeader,
			}).getBlockExecuteContext();
			await rewardModule.stores
				.get(EndOfRoundTimestampStore)
				.set(blockExecuteContext, EMPTY_BYTES, { timestamp: blockHeader.timestamp - 100000 });
			const validators = [
				{ address: generatorAddress, bftWeight: BigInt(20) },
				{ address: utils.getRandomBytes(20), bftWeight: BigInt(30) },
				{ address: utils.getRandomBytes(20), bftWeight: BigInt(40) },
				{ address: utils.getRandomBytes(20), bftWeight: BigInt(10) },
				{ address: standbyValidatorAddress, bftWeight: BigInt(0) },
			];

			(validatorsMethod.getValidatorsParams as jest.Mock).mockResolvedValue({ validators });
			(posMethod.getNumberOfActiveValidators as jest.Mock).mockReturnValue(activeValidator);
		});

		it('should store minimal reward for active validators when full round is forged', async () => {
			// Round is already completed once
			const generatorMap = new Array(defaultRoundLength).fill(0).reduce(prev => {
				// eslint-disable-next-line no-param-reassign
				prev[utils.getRandomBytes(20).toString('binary')] = 1;
				return prev;
			}, {});
			(validatorsMethod.getGeneratorsBetweenTimestamps as jest.Mock).mockResolvedValue(
				generatorMap,
			);

			await rewardModule.beforeTransactionsExecute(blockExecuteContext);

			const { reward } = await rewardModule.stores
				.get(BlockRewardsDataStore)
				.get(blockExecuteContext, EMPTY_BYTES);

			expect(reward).toEqual(minimumReward);
		});

		it('should store reward based on ratio when BFTWeight is positive', async () => {
			// Round not finished
			const generatorMap = new Array(1).fill(0).reduce(prev => {
				// eslint-disable-next-line no-param-reassign
				prev[utils.getRandomBytes(20).toString('binary')] = 1;
				return prev;
			}, {});
			(validatorsMethod.getGeneratorsBetweenTimestamps as jest.Mock).mockResolvedValue(
				generatorMap,
			);

			await rewardModule.beforeTransactionsExecute(blockExecuteContext);

			const { reward } = await rewardModule.stores
				.get(BlockRewardsDataStore)
				.get(blockExecuteContext, EMPTY_BYTES);

			// generatorAddress has 20% of total weight
			expect(reward).toEqual(minimumReward + ratioReward / BigInt(5));
		});

		it('should store default reward when weight is zero', async () => {
			// Round not finished
			const generatorMap = new Array(1).fill(0).reduce(prev => {
				// eslint-disable-next-line no-param-reassign
				prev[utils.getRandomBytes(20).toString('binary')] = 1;
				return prev;
			}, {});
			(validatorsMethod.getGeneratorsBetweenTimestamps as jest.Mock).mockResolvedValue(
				generatorMap,
			);

			const blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				generatorAddress: standbyValidatorAddress,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				header: blockHeader,
			}).getBlockExecuteContext();

			await rewardModule.beforeTransactionsExecute(blockExecuteContext);

			const { reward } = await rewardModule.stores
				.get(BlockRewardsDataStore)
				.get(blockExecuteContext, EMPTY_BYTES);

			expect(reward).toEqual(BigInt(defaultConfig.brackets[0]));
		});
	});

	describe('afterTransactionsExecute', () => {
		let blockExecuteContext: BlockAfterExecuteContext;
		let stateStore: PrefixedStateReadWriter;

		const defaultReward = BigInt(500000000);

		beforeEach(async () => {
			jest.spyOn(rewardModule.events.get(RewardMintedEvent), 'log');
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			const blockHeader = createBlockHeaderWithDefaults({ height: defaultConfig.offset });
			blockExecuteContext = createBlockContext({
				stateStore,
				header: blockHeader,
			}).getBlockAfterExecuteContext();
			await rewardModule.stores
				.get(BlockRewardsDataStore)
				.set(blockExecuteContext, EMPTY_BYTES, { reward: defaultReward });
		});

		it('should return zero reward with seed reveal reduction when seed reveal is invalid', async () => {
			(randomMethod.isSeedRevealValid as jest.Mock).mockResolvedValue(false);

			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{ amount: BigInt(0), reduction: REWARD_REDUCTION_SEED_REVEAL },
			);
		});

		it('should return quarter deducted reward when header does not imply max prevotes', async () => {
			const blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				impliesMaxPrevotes: false,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				header: blockHeader,
			}).getBlockAfterExecuteContext();

			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{
					amount: BigInt(defaultConfig.brackets[0]) / BigInt(4),
					reduction: REWARD_REDUCTION_MAX_PREVOTES,
				},
			);
		});

		it('should return full reward when header and assets are valid', async () => {
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{ amount: BigInt(defaultConfig.brackets[0]), reduction: REWARD_NO_REDUCTION },
			);
		});

		it('should mint the token and update shared reward when reward is non zero', async () => {
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{ amount: BigInt(defaultConfig.brackets[0]), reduction: REWARD_NO_REDUCTION },
			);

			expect(tokenMethod.mint).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				rewardModule['_moduleConfig'].tokenID,
				BigInt(defaultConfig.brackets[0]),
			);
			expect(posMethod.updateSharedRewards).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				rewardModule['_moduleConfig'].tokenID,
				BigInt(defaultConfig.brackets[0]),
			);
		});

		it('should not update shared reward and mint when reward is non zero', async () => {
			(randomMethod.isSeedRevealValid as jest.Mock).mockResolvedValue(false);
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{ amount: BigInt(0), reduction: REWARD_REDUCTION_SEED_REVEAL },
			);

			expect(tokenMethod.mint).not.toHaveBeenCalled();
			expect(posMethod.updateSharedRewards).not.toHaveBeenCalled();
		});

		it('should store timestamp when end of round', async () => {
			const timestamp = 123456789;
			const blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				timestamp,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				header: blockHeader,
			}).getBlockAfterExecuteContext();

			(posMethod.isEndOfRound as jest.Mock).mockResolvedValue(true);

			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			const { timestamp: updatedTimestamp } = await rewardModule.stores
				.get(EndOfRoundTimestampStore)
				.get(blockExecuteContext, EMPTY_BYTES);

			expect(updatedTimestamp).toEqual(timestamp);
		});
	});
});
