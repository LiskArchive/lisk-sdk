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

import { BlockHeader } from '@liskhq/lisk-chain';
import * as randomSeedFirstRound from '../../../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_first_round.json';
import * as randomSeedsMultipleRounds from '../../../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_other_rounds.json';
import * as randomSeedsInvalidSeedReveal from '../../../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_invalid_seed_reveal.json';
import * as randomSeedsNotForgedEarlier from '../../../fixtures/dpos_random_seed_generation/dpos_random_seed_generation_not_forged_earlier.json';

import { generateRandomSeeds } from '../../../../src/modules/dpos/random_seed';
import { Rounds } from '../../../../src/modules/dpos/rounds';

const generateHeadersFromTest = (blocks: any): BlockHeader[] =>
	blocks
		.map((block: any) => ({
			...block,
			generatorPublicKey: Buffer.from(block.generatorPublicKey, 'hex'),
			id: Buffer.from(''),
			reward: BigInt(0),
			timestamp: 0,
			asset: {
				seedReveal: Buffer.from(block.asset.seedReveal, 'hex'),
			},
		}))
		.reverse();

describe('random_seed', () => {
	let rounds: Rounds;
	let randomSeeds: Buffer[];
	let logger: any;

	const testCases = [
		...randomSeedFirstRound.testCases,
		...randomSeedsMultipleRounds.testCases,
		...randomSeedsInvalidSeedReveal.testCases,
		...randomSeedsNotForgedEarlier.testCases,
	];

	beforeEach(() => {
		logger = { debug: jest.fn() };
	});

	describe('generateRandomSeeds', () => {
		describe.each(testCases.map(testCase => [testCase.description, testCase]))(
			'%s',
			(_description, testCase) => {
				it('should generate correct random seeds', () => {
					const { config, input, output } = testCase as any;
					// Arrange
					rounds = new Rounds({
						blocksPerRound: config.blocksPerRound,
					});

					const round = rounds.calcRound(input.blocks[input.blocks.length - 1].height);
					const headers = generateHeadersFromTest(input.blocks);

					// Act
					randomSeeds = generateRandomSeeds({ round, rounds, headers, logger });

					// Assert
					expect(randomSeeds[0].toString('hex')).toEqual(output.randomSeed1);
					expect(randomSeeds[1].toString('hex')).toEqual(output.randomSeed2);
				});
			},
		);
	});
});
