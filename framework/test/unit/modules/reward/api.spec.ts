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
import { EventQueue } from '../../../../src/node/state_machine';
import { createBlockHeaderWithDefaults } from '../../../../src/testing';

describe('RewardModuleAPI', () => {
	const genesisConfig: any = {};
	const moduleConfig: any = {
		distance: 3000000,
		offset: 2160,
		brackets: [
			BigInt('500000000'), // Initial Reward
			BigInt('400000000'), // Milestone 1
			BigInt('300000000'), // Milestone 2
			BigInt('200000000'), // Milestone 3
			BigInt('100000000'), // Milestone 4
		],
		tokenIDReward: { chainID: 0, localID: 0 },
	};
	const generatorConfig: any = {};

	const { brackets, offset, distance } = moduleConfig as {
		brackets: ReadonlyArray<bigint>;
		offset: number;
		distance: number;
	};

	let rewardModule: RewardModule;
	let context: any;
	let blockAsset: any;
	beforeEach(async () => {
		context = {
			getStore: jest.fn(),
			eventQueue: new EventQueue(),
		};

		blockAsset = {
			getAsset: jest.fn(),
		};
		rewardModule = new RewardModule();
		await rewardModule.init({ genesisConfig, moduleConfig, generatorConfig });
	});

	for (const [index, rewardFromConfig] of Object.entries(brackets)) {
		const nthBracket = Number(index);
		const currentHeight = offset + nthBracket * distance;

		// eslint-disable-next-line no-loop-func
		it(`should getBlockReward return full reward for bracket ${nthBracket}`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isValidSeedReveal: jest.fn().mockReturnValue(true) } as any,
				{ impliesMaximalPrevotes: jest.fn().mockReturnValue(true) } as any,
			);
			const blockHeader = createBlockHeaderWithDefaults({ height: currentHeight });
			const rewardFromAPI = await rewardModule.api.getBlockReward(context, blockHeader, blockAsset);

			expect(rewardFromAPI).toBe(rewardFromConfig);
		});

		// eslint-disable-next-line no-loop-func
		it(`should getBlockReward return quarter reward for bracket ${nthBracket} due to bft violation`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isValidSeedReveal: jest.fn().mockReturnValue(true) } as any,
				{ impliesMaximalPrevotes: jest.fn().mockReturnValue(false) } as any,
			);
			const blockHeader = createBlockHeaderWithDefaults({ height: currentHeight });
			const rewardFromAPI = await rewardModule.api.getBlockReward(context, blockHeader, blockAsset);

			expect(rewardFromAPI).toBe(rewardFromConfig / BigInt(4));
		});

		// eslint-disable-next-line no-loop-func
		it(`should getBlockReward return no reward for bracket ${nthBracket} due to seedReveal violation`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isValidSeedReveal: jest.fn().mockReturnValue(false) } as any,
				{ impliesMaximalPrevotes: jest.fn().mockReturnValue(true) } as any,
			);
			const blockHeader = createBlockHeaderWithDefaults({ height: currentHeight });
			const rewardFromAPI = await rewardModule.api.getBlockReward(context, blockHeader, blockAsset);

			expect(rewardFromAPI).toBe(BigInt(0));
		});
	}

	it(`should getBlockReward return no reward for the height below offset`, async () => {
		rewardModule.addDependencies(
			{ mint: jest.fn() } as any,
			{ isValidSeedReveal: jest.fn().mockReturnValue(true) } as any,
			{ impliesMaximalPrevotes: jest.fn().mockReturnValue(true) } as any,
		);
		const blockHeader = createBlockHeaderWithDefaults({ height: 1 });
		const rewardFromAPI = await rewardModule.api.getBlockReward(context, blockHeader, blockAsset);

		expect(rewardFromAPI).toBe(BigInt(0));
	});
});
