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
import { when } from 'jest-when';
import {
	createBlockContext,
	createBlockHeaderWithDefaults,
	createGenesisBlockContext,
	InMemoryPrefixedStateDB,
} from '../../../../src/testing';
import { RewardMintedEvent } from '../../../../src/modules/reward/events/reward_minted';
import { DynamicRewardModule } from '../../../../src/modules/dynamic_reward';
import {
	PoSMethod,
	RandomMethod,
	TokenMethod,
	ValidatorsMethod,
} from '../../../../src/modules/dynamic_reward/types';
import {
	CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REDUCTION,
	CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REWARD,
	DECIMAL_PERCENT_FACTOR,
	defaultConfig,
	EMPTY_BYTES,
} from '../../../../src/modules/dynamic_reward/constants';
import { StateMachine } from '../../../../src';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { EndOfRoundTimestampStore } from '../../../../src/modules/dynamic_reward/stores/end_of_round_timestamp';
import {
	REWARD_NO_REDUCTION,
	REWARD_REDUCTION_MAX_PREVOTES,
	REWARD_REDUCTION_NO_ACCOUNT,
	REWARD_REDUCTION_SEED_REVEAL,
} from '../../../../src/modules/reward/constants';

describe('DynamicRewardModule', () => {
	const defaultRoundLength = 103;

	let rewardModule: DynamicRewardModule;
	let tokenMethod: TokenMethod;
	let randomMethod: RandomMethod;
	let validatorsMethod: ValidatorsMethod;
	let posMethod: PoSMethod;
	let generatorAddress: Buffer;
	let standbyValidatorAddress: Buffer;
	let stateStore: PrefixedStateReadWriter;
	let blockHeader: BlockHeader;

	const activeValidator = 4;
	const minimumReward =
		(BigInt(defaultConfig.brackets[0]) *
			BigInt(defaultConfig.factorMinimumRewardActiveValidators)) /
		DECIMAL_PERCENT_FACTOR;
	const totalRewardActiveValidator = BigInt(defaultConfig.brackets[0]) * BigInt(activeValidator);
	const stakeRewardActiveValidators =
		totalRewardActiveValidator - minimumReward * BigInt(activeValidator);
	// generatorAddress has 20% of total weight, bftWeightSum/bftWeight = BigInt(5)
	const defaultReward = minimumReward + stakeRewardActiveValidators / BigInt(5);

	beforeEach(async () => {
		rewardModule = new DynamicRewardModule();
		await rewardModule.init({
			genesisConfig: { chainID: '00000000' } as any,
			moduleConfig: {},
		});
		tokenMethod = { mint: jest.fn(), userSubstoreExists: jest.fn() };
		randomMethod = { isSeedRevealValid: jest.fn().mockReturnValue(true) };
		validatorsMethod = {
			getGeneratorsBetweenTimestamps: jest.fn(),
			getValidatorsParams: jest.fn(),
		};
		posMethod = {
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
				}),
			).toResolve();

			expect(rewardModule['_moduleConfig']).toEqual({
				...defaultConfig,
				brackets: defaultConfig.brackets.map(b => BigInt(b)),
				tokenID: Buffer.from('0000000000000000', 'hex'),
				rewardReductionFactorBFT: BigInt(defaultConfig.rewardReductionFactorBFT),
			});
		});

		it('should initialize config with given value', async () => {
			rewardModule = new DynamicRewardModule();
			await expect(
				rewardModule.init({
					genesisConfig: { chainID: '00000000' } as any,
					moduleConfig: { offset: 1000 },
				}),
			).toResolve();

			expect(rewardModule['_moduleConfig'].offset).toBe(1000);
		});

		it('should not initialize config with invalid value for tokenID', async () => {
			rewardModule = new DynamicRewardModule();
			try {
				await rewardModule.init({
					genesisConfig: { chainID: '00000000' } as any,
					moduleConfig: {
						tokenID: '00000000000000000',
					},
				});
			} catch (error: any) {
				expect(error.message).toInclude("Property '.tokenID' must NOT have more than 16 character");
			}
		});
	});

	describe('initGenesisState', () => {
		let blockExecuteContext: StateMachine.GenesisBlockExecuteContext;

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

			expect(timestamp).toBe(1234);
		});
	});

	describe('beforeTransactionsExecute', () => {
		let blockExecuteContext: StateMachine.BlockExecuteContext;

		beforeEach(async () => {
			generatorAddress = utils.getRandomBytes(20);
			standbyValidatorAddress = utils.getRandomBytes(20);
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			blockHeader = createBlockHeaderWithDefaults({
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

			expect(blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REWARD)).toEqual(
				minimumReward,
			);
			expect(
				blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REDUCTION),
			).toEqual(REWARD_NO_REDUCTION);
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

			expect(blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REWARD)).toEqual(
				defaultReward,
			);
			expect(
				blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REDUCTION),
			).toEqual(REWARD_NO_REDUCTION);
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

			blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				generatorAddress: standbyValidatorAddress,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				header: blockHeader,
			}).getBlockExecuteContext();

			await rewardModule.beforeTransactionsExecute(blockExecuteContext);

			expect(blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REWARD)).toEqual(
				BigInt(defaultConfig.brackets[0]),
			);
			expect(
				blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REDUCTION),
			).toEqual(REWARD_NO_REDUCTION);
		});

		it('should store zero reward with seed reveal reduction when seed reveal is invalid', async () => {
			// Round not finished
			const generatorMap = new Array(1).fill(0).reduce(prev => {
				// eslint-disable-next-line no-param-reassign
				prev[utils.getRandomBytes(20).toString('binary')] = 1;
				return prev;
			}, {});
			(validatorsMethod.getGeneratorsBetweenTimestamps as jest.Mock).mockResolvedValue(
				generatorMap,
			);
			(randomMethod.isSeedRevealValid as jest.Mock).mockResolvedValue(false);

			await rewardModule.beforeTransactionsExecute(blockExecuteContext);

			expect(blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REWARD)).toEqual(
				BigInt(0),
			);
			expect(
				blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REDUCTION),
			).toEqual(REWARD_REDUCTION_SEED_REVEAL);
		});

		it('should return quarter deducted reward when header does not imply max prevotes', async () => {
			// Round not finished
			const generatorMap = new Array(1).fill(0).reduce(prev => {
				// eslint-disable-next-line no-param-reassign
				prev[utils.getRandomBytes(20).toString('binary')] = 1;
				return prev;
			}, {});
			(validatorsMethod.getGeneratorsBetweenTimestamps as jest.Mock).mockResolvedValue(
				generatorMap,
			);
			blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				impliesMaxPrevotes: false,
				generatorAddress,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				header: blockHeader,
			}).getBlockAfterExecuteContext();

			await rewardModule.beforeTransactionsExecute(blockExecuteContext);

			expect(blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REWARD)).toEqual(
				defaultReward / BigInt(4),
			);
			expect(
				blockExecuteContext.contextStore.get(CONTEXT_STORE_KEY_DYNAMIC_BLOCK_REDUCTION),
			).toEqual(REWARD_REDUCTION_MAX_PREVOTES);
		});
	});

	describe('afterTransactionsExecute', () => {
		let blockExecuteContext: StateMachine.BlockAfterExecuteContext;
		let contextStore: Map<string, unknown>;

		beforeEach(async () => {
			jest.spyOn(rewardModule.events.get(RewardMintedEvent), 'log');
			jest.spyOn(tokenMethod, 'userSubstoreExists');
			generatorAddress = utils.getRandomBytes(20);
			standbyValidatorAddress = utils.getRandomBytes(20);
			contextStore = new Map<string, unknown>();
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				generatorAddress,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				contextStore,
				header: blockHeader,
			}).getBlockAfterExecuteContext();
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
			const generatorMap = new Array(1).fill(0).reduce(prev => {
				// eslint-disable-next-line no-param-reassign
				prev[utils.getRandomBytes(20).toString('binary')] = 1;
				return prev;
			}, {});

			(validatorsMethod.getValidatorsParams as jest.Mock).mockResolvedValue({ validators });
			(validatorsMethod.getGeneratorsBetweenTimestamps as jest.Mock).mockResolvedValue(
				generatorMap,
			);
			when(tokenMethod.userSubstoreExists)
				.calledWith(
					expect.anything(),
					blockExecuteContext.header.generatorAddress,
					rewardModule['_moduleConfig'].tokenID,
				)
				.mockResolvedValue(true as never);
		});

		it('should return full reward when header and assets are valid', async () => {
			await rewardModule.beforeTransactionsExecute(blockExecuteContext);
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{ amount: defaultReward, reduction: REWARD_NO_REDUCTION },
			);
		});

		it('should mint the token and update shared reward when reward is non zero and user account of generator exists for the token id', async () => {
			await rewardModule.beforeTransactionsExecute(blockExecuteContext);
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{ amount: defaultReward, reduction: REWARD_NO_REDUCTION },
			);

			expect(tokenMethod.mint).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				rewardModule['_moduleConfig'].tokenID,
				defaultReward,
			);
			expect(posMethod.updateSharedRewards).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				rewardModule['_moduleConfig'].tokenID,
				defaultReward,
			);
		});

		it('should not mint or update shared reward and return zero reward with no account reduction when reward is non zero and user account of generator does not exist for the token id', async () => {
			when(tokenMethod.userSubstoreExists)
				.calledWith(
					expect.anything(),
					blockExecuteContext.header.generatorAddress,
					rewardModule['_moduleConfig'].tokenID,
				)
				.mockResolvedValue(false as never);
			await rewardModule.beforeTransactionsExecute(blockExecuteContext);
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{ amount: BigInt(0), reduction: REWARD_REDUCTION_NO_ACCOUNT },
			);

			expect(tokenMethod.mint).not.toHaveBeenCalled();
			expect(posMethod.updateSharedRewards).not.toHaveBeenCalled();
		});

		it('should not update shared reward and mint when reward is zero', async () => {
			(randomMethod.isSeedRevealValid as jest.Mock).mockResolvedValue(false);
			await rewardModule.beforeTransactionsExecute(blockExecuteContext);
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			expect(rewardModule.events.get(RewardMintedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				blockExecuteContext.header.generatorAddress,
				{ amount: BigInt(0), reduction: REWARD_REDUCTION_SEED_REVEAL },
			);

			expect(tokenMethod.mint).not.toHaveBeenCalled();
			expect(posMethod.updateSharedRewards).not.toHaveBeenCalled();
		});

		it('should store timestamp when it is end of round', async () => {
			const timestamp = 123456789;
			blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				timestamp,
				generatorAddress,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				contextStore,
				header: blockHeader,
			}).getBlockAfterExecuteContext();

			(posMethod.isEndOfRound as jest.Mock).mockResolvedValue(true);

			await rewardModule.beforeTransactionsExecute(blockExecuteContext);
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			const { timestamp: updatedTimestamp } = await rewardModule.stores
				.get(EndOfRoundTimestampStore)
				.get(blockExecuteContext, EMPTY_BYTES);

			expect(updatedTimestamp).toEqual(timestamp);
		});

		it('should store timestamp when it is not end of round', async () => {
			const timestamp = 123456789;
			blockHeader = createBlockHeaderWithDefaults({
				height: defaultConfig.offset,
				timestamp,
				generatorAddress,
			});
			blockExecuteContext = createBlockContext({
				stateStore,
				contextStore,
				header: blockHeader,
			}).getBlockAfterExecuteContext();

			(posMethod.isEndOfRound as jest.Mock).mockResolvedValue(false);

			await rewardModule.beforeTransactionsExecute(blockExecuteContext);
			await rewardModule.afterTransactionsExecute(blockExecuteContext);

			const { timestamp: updatedTimestamp } = await rewardModule.stores
				.get(EndOfRoundTimestampStore)
				.get(blockExecuteContext, EMPTY_BYTES);

			expect(updatedTimestamp).not.toEqual(timestamp);
		});
	});
});
