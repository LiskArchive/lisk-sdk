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
import { RewardModule } from '../../../../src/modules/reward';
import { createBlockContext, createBlockHeaderWithDefaults } from '../../../../src/testing';
import {
	REWARD_NO_REDUCTION,
	REWARD_REDUCTION_SEED_REVEAL,
	REWARD_REDUCTION_FACTOR_BFT,
	REWARD_REDUCTION_MAX_PREVOTES,
} from '../../../../src/modules/reward/constants';
import { EVENT_REWARD_MINTED_DATA_NAME } from '../../../../src/state_machine/constants';

describe('RewardModule', () => {
	const genesisConfig: any = {};
	const moduleConfig: any = {
		distance: 3000000,
		offset: 2160,
		brackets: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		tokenID: '0000000000000000',
	};
	const generatorConfig: any = {};

	let rewardModule: RewardModule;
	let mint: any;
	beforeEach(async () => {
		mint = jest.fn();
		rewardModule = new RewardModule();
		await rewardModule.init({ genesisConfig, moduleConfig, generatorConfig });
		rewardModule.addDependencies(
			{ mint } as any,
			{ isSeedRevealValid: jest.fn().mockReturnValue(true) } as any,
		);
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			rewardModule = new RewardModule();
			await expect(
				rewardModule.init({ genesisConfig: {} as any, moduleConfig: {}, generatorConfig: {} }),
			).toResolve();

			expect(rewardModule['_moduleConfig']).toEqual({ ...moduleConfig });
		});

		it('should initialize config with given value', async () => {
			rewardModule = new RewardModule();
			await expect(
				rewardModule.init({
					genesisConfig: {} as any,
					moduleConfig: { offset: 1000 },
					generatorConfig: {},
				}),
			).toResolve();

			expect(rewardModule['_moduleConfig'].offset).toEqual(1000);
		});

		it('should not initialize config with invalid value for tokenID', async () => {
			rewardModule = new RewardModule();
			try {
				await rewardModule.init({
					genesisConfig: {} as any,
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

	describe('afterTransactionsExecute', () => {
		const blockHeader = createBlockHeaderWithDefaults({ height: moduleConfig.offset });
		const blockAfterExecuteContext = createBlockContext({
			header: blockHeader,
		}).getBlockAfterExecuteContext();

		it(`should call mint for a valid bracket`, async () => {
			await rewardModule.afterTransactionsExecute(blockAfterExecuteContext);
			expect(mint).toHaveBeenCalledTimes(1);
		});

		it('should emit rewardMinted event for event type REWARD_NO_REDUCTION', async () => {
			rewardModule.method.getBlockReward = jest
				.fn()
				.mockReturnValue([BigInt(1), REWARD_NO_REDUCTION]);
			await rewardModule.afterTransactionsExecute(blockAfterExecuteContext);
			expect(mint).toHaveBeenCalledTimes(1);
			expect(blockAfterExecuteContext.eventQueue.getEvents()[0].toObject().name).toBe(
				EVENT_REWARD_MINTED_DATA_NAME,
			);
			expect(blockAfterExecuteContext.eventQueue.getEvents()[0].toObject().module).toBe('reward');
		});

		it('should emit rewardMinted event for event type REWARD_REDUCTION_SEED_REVEAL', async () => {
			rewardModule.method.getBlockReward = jest
				.fn()
				.mockReturnValue([BigInt(0), REWARD_REDUCTION_SEED_REVEAL]);
			await rewardModule.afterTransactionsExecute(blockAfterExecuteContext);
			expect(mint).toHaveBeenCalledTimes(0);
			expect(blockAfterExecuteContext.eventQueue.getEvents()[0].toObject().name).toBe(
				EVENT_REWARD_MINTED_DATA_NAME,
			);
			expect(blockAfterExecuteContext.eventQueue.getEvents()[0].toObject().module).toBe('reward');
		});

		it('should emit rewardMinted event for event type REWARD_REDUCTION_MAX_PREVOTES', async () => {
			rewardModule.method.getBlockReward = jest
				.fn()
				.mockReturnValue([
					BigInt(1) / BigInt(REWARD_REDUCTION_FACTOR_BFT),
					REWARD_REDUCTION_MAX_PREVOTES,
				]);
			expect(mint).toHaveBeenCalledTimes(0);
			await rewardModule.afterTransactionsExecute(blockAfterExecuteContext);
			expect(blockAfterExecuteContext.eventQueue.getEvents()[0].toObject().name).toBe(
				EVENT_REWARD_MINTED_DATA_NAME,
			);
			expect(blockAfterExecuteContext.eventQueue.getEvents()[0].toObject().module).toBe('reward');
		});
	});
});
