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
import { createTransientModuleEndpointContext } from '../../../../src/testing';

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
		tokenID: '0000000000000000',
	};

	let rewardModule: RewardModule;

	beforeAll(async () => {
		rewardModule = new RewardModule();
		await rewardModule.init({ genesisConfig, moduleConfig });
		rewardModule.addDependencies(
			{ mint: jest.fn() } as any,
			{ isSeedRevealValid: jest.fn() } as any,
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
			const rewardFromEndpoint = rewardModule.endpoint.getDefaultRewardAtHeight(
				createTransientModuleEndpointContext({
					params: {
						height: currentHeight,
					},
				}),
			);
			expect(rewardFromEndpoint).toEqual({ reward: rewardFromConfig.toString() });
		});
	}

	it('should getDefaultRewardAtHeight work for the height below offset', () => {
		const rewardFromEndpoint = rewardModule.endpoint.getDefaultRewardAtHeight(
			createTransientModuleEndpointContext({
				params: {
					height: offset - 1,
				},
			}),
		);
		expect(rewardFromEndpoint).toEqual({ reward: '0' });
	});

	it('should throw an error when parameter height is not a number', () => {
		expect(() =>
			rewardModule.endpoint.getDefaultRewardAtHeight(
				createTransientModuleEndpointContext({
					params: {
						height: 'Not a number',
					},
				}),
			),
		).toThrow('Parameter height must be a number.');
	});

	it('should throw an error when parameter height is below 0', () => {
		expect(() =>
			rewardModule.endpoint.getDefaultRewardAtHeight(
				createTransientModuleEndpointContext({
					params: {
						height: -1,
					},
				}),
			),
		).toThrow('Parameter height cannot be smaller than 0.');
	});
});
