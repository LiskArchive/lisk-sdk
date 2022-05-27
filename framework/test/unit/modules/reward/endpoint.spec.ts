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
import { Logger } from '../../../../src/logger';
import { RewardModule } from '../../../../src/modules/reward';
import { fakeLogger } from '../../../utils/node';

describe('RewardModuleEndpoint', () => {
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
		tokenIDReward: { chainID: 0, localID: 0 },
	};
	const generatorConfig: any = {};
	const networkIdentifier = Buffer.alloc(0);

	const logger: Logger = fakeLogger;
	let rewardModule: RewardModule;

	beforeAll(async () => {
		rewardModule = new RewardModule();
		await rewardModule.init({ genesisConfig, moduleConfig, generatorConfig });
		rewardModule.addDependencies(
			{ mint: jest.fn() } as any,
			{ isSeedRevealValid: jest.fn() } as any,
			{ impliesMaximalPrevotes: jest.fn() } as any,
		);
	});

	const { brackets, offset, distance } = moduleConfig as {
		brackets: ReadonlyArray<bigint>;
		offset: number;
		distance: number;
	};

	for (const [index, rewardFromConfig] of Object.entries(brackets)) {
		const nthBracket = +index;
		const currentHeight = offset + nthBracket * distance;
		// eslint-disable-next-line no-loop-func
		it(`should getDefaultRewardAtHeight work for the ${nthBracket}th bracket`, () => {
			const rewardFromEndpoint = rewardModule.endpoint.getDefaultRewardAtHeight({
				getStore: jest.fn(),
				getImmutableAPIContext: jest.fn(),
				logger,
				params: {
					height: currentHeight,
				},
				networkIdentifier,
			});
			expect(rewardFromEndpoint).toEqual({ reward: rewardFromConfig.toString() });
		});
	}

	it('should getDefaultRewardAtHeight work for the height below offset', () => {
		const rewardFromEndpoint = rewardModule.endpoint.getDefaultRewardAtHeight({
			getStore: jest.fn(),
			getImmutableAPIContext: jest.fn(),
			logger,
			params: {
				height: offset - 1,
			},
			networkIdentifier,
		});
		expect(rewardFromEndpoint).toEqual({ reward: '0' });
	});

	it('should throw an error when parameter height is not a number', () => {
		expect(() =>
			rewardModule.endpoint.getDefaultRewardAtHeight({
				getStore: jest.fn(),
				getImmutableAPIContext: jest.fn(),
				logger,
				params: {
					height: 'Not a number',
				},
				networkIdentifier,
			}),
		).toThrow('Parameter height must be a number.');
	});

	it('should throw an error when parameter height is below 0', () => {
		expect(() =>
			rewardModule.endpoint.getDefaultRewardAtHeight({
				getStore: jest.fn(),
				getImmutableAPIContext: jest.fn(),
				logger,
				params: {
					height: -1,
				},
				networkIdentifier,
			}),
		).toThrow('Parameter height cannot be smaller than 0.');
	});
});
