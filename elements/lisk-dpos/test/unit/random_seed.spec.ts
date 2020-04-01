/*
 * Copyright © 2020 Lisk Foundation
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

import * as randomSeedFirstRound from '../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_first_round.json';
import * as randomSeedsMultipleRounds from '../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_other_rounds.json';
import * as randomSeedsInvalidSeedReveal from '../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_invalid_seed_reveal.json';
import * as randomSeedsNotForgedEarlier from '../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_not_forged_earlier.json';

import * as randomSeedNotPassedMiddle from '../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_not_passed_middle_of_round.json';

import { generateRandomSeeds } from '../../src/random_seed';
import { Rounds } from '../../src/rounds';
import { BlockHeader } from '../../src/types';

const generateHeadersFromTest = (blocks: any): BlockHeader[] =>
	blocks.map((block: any) => ({
		...block,
		...{
			id: '',
			reward: BigInt(0),
			totalFee: BigInt(0),
			timestamp: 0,
		},
	}));

describe('random_seed', () => {
	let rounds: Rounds;
	let randomSeeds: Buffer[];

	const testCases = [
		...randomSeedFirstRound.testCases,
		...randomSeedsMultipleRounds.testCases,
		...randomSeedsInvalidSeedReveal.testCases,
		...randomSeedsNotForgedEarlier.testCases,
	];

	describe('generateRandomSeeds', () => {
		it('should throw error if called before middle of the round', async () => {
			// Arrange
			const { config, input } = randomSeedNotPassedMiddle.testCases[0] as any;
			rounds = new Rounds({
				blocksPerRound: (config as any).blocksPerRound,
			});
			const round = rounds.calcRound(
				input.blocks[input.blocks.length - 1].height,
			);
			const headers = generateHeadersFromTest(input.blocks);

			// Act & Assert
			expect(() => generateRandomSeeds(round, rounds, headers)).toThrow(
				`Random seed can't be calculated earlier in a round. Wait till you pass middle of round. Current height: ${input.blocks.length}`,
			);
		});

		describe('protocol specs', () => {
			describe.each(
				testCases.map(testCase => [testCase.description, testCase]),
			)('%s', (_description, testCase) => {
				it('should generate correct random seeds', async () => {
					const { config, input, output } = testCase as any;
					// Arrange
					rounds = new Rounds({
						blocksPerRound: (config as any).blocksPerRound,
					});

					const round = rounds.calcRound(
						input.blocks[input.blocks.length - 1].height,
					);
					const headers = generateHeadersFromTest(input.blocks);

					// Act
					randomSeeds = generateRandomSeeds(round, rounds, headers);

					// Assert
					expect(randomSeeds[0].toString('hex')).toEqual(output.randomSeed1);
					expect(randomSeeds[1].toString('hex')).toEqual(output.randomSeed2);
				});
			});
		});
	});
});
