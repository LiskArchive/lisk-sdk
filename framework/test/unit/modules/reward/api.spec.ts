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
import { createBlockHeaderWithDefaults, createTransientAPIContext } from '../../../../src/testing';

describe('RewardModuleAPI', () => {
	const genesisConfig: any = {};
	const moduleConfig = {
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

	const { offset, distance } = moduleConfig;
	const brackets = moduleConfig.brackets.map(v => BigInt(v));

	let rewardModule: RewardModule;
	let context: any;
	let blockAsset: any;
	beforeEach(async () => {
		context = createTransientAPIContext({});

		blockAsset = {
			getAsset: jest.fn(),
		};
		rewardModule = new RewardModule();
		await rewardModule.init({ genesisConfig, moduleConfig, generatorConfig });
	});

	describe.each(Object.entries(brackets))('test for brackets', (index, rewardFromConfig) => {
		const nthBracket = Number(index);
		const currentHeight = offset + nthBracket * distance;

		it(`should getBlockReward return full reward for bracket ${nthBracket}`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isSeedRevealValid: jest.fn().mockReturnValue(true) } as any,
			);
			const blockHeader = createBlockHeaderWithDefaults({ height: currentHeight });
			const rewardFromAPI = await rewardModule.api.getBlockReward(
				context,
				blockHeader,
				blockAsset,
				true,
			);

			expect(rewardFromAPI[0]).toBe(rewardFromConfig);
		});

		it(`should getBlockReward return quarter reward for bracket ${nthBracket} due to bft violation`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isSeedRevealValid: jest.fn().mockReturnValue(true) } as any,
			);
			const blockHeader = createBlockHeaderWithDefaults({ height: currentHeight });
			const rewardFromAPI = await rewardModule.api.getBlockReward(
				context,
				blockHeader,
				blockAsset,
				false,
			);

			expect(rewardFromAPI[0]).toBe(BigInt(rewardFromConfig) / BigInt(4));
		});

		it(`should getBlockReward return no reward for bracket ${nthBracket} due to seedReveal violation`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isSeedRevealValid: jest.fn().mockReturnValue(false) } as any,
			);
			const blockHeader = createBlockHeaderWithDefaults({ height: currentHeight });
			const rewardFromAPI = await rewardModule.api.getBlockReward(
				context,
				blockHeader,
				blockAsset,
				true,
			);

			expect(rewardFromAPI[0]).toBe(BigInt(0));
		});
	});

	it(`should getBlockReward return no reward for the height below offset`, async () => {
		rewardModule.addDependencies(
			{ mint: jest.fn() } as any,
			{ isSeedRevealValid: jest.fn().mockReturnValue(true) } as any,
		);
		const blockHeader = createBlockHeaderWithDefaults({ height: 1 });
		const rewardFromAPI = await rewardModule.api.getBlockReward(
			context,
			blockHeader,
			blockAsset,
			true,
		);

		expect(rewardFromAPI[0]).toBe(BigInt(0));
	});
});
