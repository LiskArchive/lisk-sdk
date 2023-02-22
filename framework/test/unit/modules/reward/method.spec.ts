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

import { when } from 'jest-when';
import { RewardModule } from '../../../../src/modules/reward';
import {
	createBlockHeaderWithDefaults,
	createTransientMethodContext,
} from '../../../../src/testing';

describe('RewardModuleMethod', () => {
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

	const { offset, distance } = moduleConfig;
	const brackets = moduleConfig.brackets.map(v => BigInt(v));

	let rewardModule: RewardModule;
	let context: any;
	let blockAsset: any;
	let tokenMethod: any;
	beforeEach(async () => {
		context = createTransientMethodContext({});

		blockAsset = {
			getAsset: jest.fn(),
		};
		rewardModule = new RewardModule();
		await rewardModule.init({ genesisConfig, moduleConfig });
		tokenMethod = {
			mint: jest.fn(),
			userAccountExists: jest.fn(),
		} as any;
		rewardModule.addDependencies(tokenMethod, {
			isSeedRevealValid: jest.fn().mockReturnValue(true),
		} as any);
		jest.spyOn(tokenMethod, 'userAccountExists');
	});

	describe.each(Object.entries(brackets))('test for brackets', (index, rewardFromConfig) => {
		const nthBracket = Number(index);
		const currentHeight = offset + nthBracket * distance;

		it(`should getBlockReward return full reward for bracket ${nthBracket}`, async () => {
			const blockHeader = createBlockHeaderWithDefaults({
				height: currentHeight,
				impliesMaxPrevotes: true,
			});
			when(tokenMethod.userAccountExists)
				.calledWith(
					expect.anything(),
					blockHeader.generatorAddress,
					rewardModule['_moduleConfig'].tokenID,
				)
				.mockResolvedValue(true as never);
			const rewardFromMethod = await rewardModule.method.getBlockReward(
				context,
				blockHeader,
				blockAsset,
			);

			const expectation = rewardFromMethod[0] === rewardFromConfig;
			expect(expectation).toBe(true);
		});

		it(`should getBlockReward return quarter reward for bracket ${nthBracket} due to bft violation`, async () => {
			const blockHeader = createBlockHeaderWithDefaults({
				height: currentHeight,
				impliesMaxPrevotes: false,
			});
			when(tokenMethod.userAccountExists)
				.calledWith(
					expect.anything(),
					blockHeader.generatorAddress,
					rewardModule['_moduleConfig'].tokenID,
				)
				.mockResolvedValue(true as never);
			const rewardFromMethod = await rewardModule.method.getBlockReward(
				context,
				blockHeader,
				blockAsset,
			);

			const expectation = rewardFromMethod[0] === BigInt(rewardFromConfig) / BigInt(4);
			expect(expectation).toBe(true);
		});

		it(`should getBlockReward return no reward for bracket ${nthBracket} due to seedReveal violation`, async () => {
			rewardModule.addDependencies(tokenMethod, {
				isSeedRevealValid: jest.fn().mockReturnValue(false),
			} as any);
			const blockHeader = createBlockHeaderWithDefaults({
				height: currentHeight,
				impliesMaxPrevotes: true,
			});
			when(tokenMethod.userAccountExists)
				.calledWith(
					expect.anything(),
					blockHeader.generatorAddress,
					rewardModule['_moduleConfig'].tokenID,
				)
				.mockResolvedValue(true as never);
			const rewardFromMethod = await rewardModule.method.getBlockReward(
				context,
				blockHeader,
				blockAsset,
			);

			const expectation = rewardFromMethod[0] === BigInt(0);
			expect(expectation).toBe(true);
		});
	});

	it(`should getBlockReward return no reward for the height below offset`, async () => {
		const blockHeader = createBlockHeaderWithDefaults({ height: 1, impliesMaxPrevotes: true });
		when(tokenMethod.userAccountExists)
			.calledWith(
				expect.anything(),
				blockHeader.generatorAddress,
				rewardModule['_moduleConfig'].tokenID,
			)
			.mockResolvedValue(true as never);
		const rewardFromMethod = await rewardModule.method.getBlockReward(
			context,
			blockHeader,
			blockAsset,
		);

		expect(rewardFromMethod[0]).toBe(BigInt(0));
	});
});
