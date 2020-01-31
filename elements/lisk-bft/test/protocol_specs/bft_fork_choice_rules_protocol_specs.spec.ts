/*
 * Copyright © 2018 Lisk Foundation
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

import { BFT } from '../../src/bft';
import { Slots as SlotType } from '../../src/types';
import { Rounds } from '@liskhq/lisk-dpos';
import { Slots } from '@liskhq/lisk-blocks';

const forkChoiceSpecs = require('../bft_specs/bft_fork_choice_rules.json');

const constants = {
	ACTIVE_DELEGATES: 101,
	EPOCH_TIME: '2016-05-24T17:00:00.000Z',
	BLOCK_TIME: 10,
};

describe('bft', () => {
	describe('forkChoice', () => {
		let storageMock;

		let rounds: Rounds;
		let slots: SlotType;
		let activeDelegates;
		let startingHeight;
		let bftParams;
		let bftInstance: BFT;

		beforeEach(async () => {
			storageMock = {
				entities: {
					Block: {
						get: jest.fn().mockResolvedValue([]),
					},
					ChainState: {
						get: jest.fn(),
						getKey: jest.fn(),
					},
				},
			};

			activeDelegates = 101;
			startingHeight = 0;

			slots = new Slots({
				epochTime: constants.EPOCH_TIME,
				interval: constants.BLOCK_TIME,
			});
			rounds = new Rounds({ blocksPerRound: activeDelegates });

			bftParams = {
				storage: storageMock,
				rounds,
				slots,
				activeDelegates,
				startingHeight,
			};

			bftInstance = new BFT(bftParams);
		});

		describe(`when running scenario "${forkChoiceSpecs.handler}"`, () => {
			forkChoiceSpecs.testCases.forEach((testCase: any) => {
				describe(testCase.description, () => {
					it('should have accurate fork status', async () => {
						const epochTime = testCase.config
							? testCase.config.epochTime
							: forkChoiceSpecs.config.epochTime;
						const interval = testCase.config
							? testCase.config.blockInterval
							: forkChoiceSpecs.config.blockInterval;
						const lastBlock = testCase.config
							? testCase.config.lastBlock
							: forkChoiceSpecs.config.lastBlock;

						(slots as any).epochTime = epochTime;
						(slots as any).interval = interval;

						Date.now = jest.fn(
							() => epochTime + testCase.input.receivedBlock.receivedAt * 1000,
						);

						const {
							input: { receivedBlock },
							output: { forkStatus: expectedForkStatus },
						} = testCase;

						const result = bftInstance.forkChoice(receivedBlock, lastBlock);

						expect(result).toEqual(expectedForkStatus);
					});
				});
			});
		});
	});
});
