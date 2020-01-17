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

import forkChoiceSpecs from '../bft_specs/bft_fork_choice_rules.json';
import { BFT } from '../../src/bft';
import { Slots as SlotType } from '../../src/types';

const { Slots } = require('@liskhq/lisk-dpos');

const constants = {
	ACTIVE_DELEGATES: 101,
	EPOCH_TIME: '2016-05-24T17:00:00.000Z',
	BLOCK_TIME: 10,
};

describe('bft', () => {
	describe('forkChoice', () => {
		let storageMock;

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
					},
				},
			};

			slots = new Slots({
				epochTime: constants.EPOCH_TIME,
				interval: constants.BLOCK_TIME,
				blocksPerRound: constants.ACTIVE_DELEGATES,
			});

			activeDelegates = 101;
			startingHeight = 0;

			bftParams = {
				storage: storageMock,
				slots,
				activeDelegates,
				startingHeight,
			};

			bftInstance = new BFT(bftParams);
		});

		describe(`when running scenario "${forkChoiceSpecs.handler}"`, () => {
			forkChoiceSpecs.testCases.forEach(testCase => {
				describe(testCase.description, () => {
					it('should have accurate fork status', async () => {
						(slots as any).epochTime = testCase.initialState.epochTime;
						(slots as any).interval = testCase.initialState.blockInterval;

						Date.now = jest.fn(
							() =>
								testCase.initialState.epochTime +
								testCase.input.receivedBlock.receivedAt * 1000,
						);

						const {
							initialState: { lastBlock },
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
