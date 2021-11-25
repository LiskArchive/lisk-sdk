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

describe('RewardModule', () => {
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

	let rewardModule: RewardModule;
	let mint: any;
	beforeEach(async () => {
		mint = jest.fn();
		rewardModule = new RewardModule();
		await rewardModule.init({ genesisConfig, moduleConfig, generatorConfig });
		rewardModule.addDependencies(
			{ mint } as any,
			{ isSeedRevealValid: jest.fn().mockReturnValue(true) } as any,
			{ impliesMaximalPrevotes: jest.fn().mockReturnValue(true) } as any,
		);
	});

	describe('init', () => {
		it('should set the moduleConfig property', () => {
			expect(rewardModule['_moduleConfig']).toEqual(moduleConfig);
		});
	});

	describe('afterTransactionsExecute', () => {
		it(`should call mint for a valid bracket`, async () => {
			const blockHeader = createBlockHeaderWithDefaults({ height: moduleConfig.offset });
			const blockAfterExecuteContext = createBlockContext({
				header: blockHeader,
			}).getBlockAfterExecuteContext();
			await rewardModule.afterTransactionsExecute(blockAfterExecuteContext);

			expect(mint).toHaveBeenCalledTimes(1);
		});

		it('should not mint reward for reward <= 0', async () => {
			const blockHeader = createBlockHeaderWithDefaults({ height: 1 });
			const blockAfterExecuteContext = createBlockContext({
				header: blockHeader,
			}).getBlockAfterExecuteContext();
			await rewardModule.afterTransactionsExecute(blockAfterExecuteContext);

			expect(mint).not.toHaveBeenCalled();
		});
	});
});
