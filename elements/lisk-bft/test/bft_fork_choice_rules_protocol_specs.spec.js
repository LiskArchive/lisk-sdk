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

'use strict';

const forkChoiceSpecs = require('./bft_specs/bft_fork_choice_rules.json');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');
const { BFT } = require('../../../../../../../src/modules/chain/bft');
const { constants } = require('../../../../../../utils');

describe('bft', () => {
	describe('forkChoice', () => {
		let storageMock;
		let loggerMock;

		let slots;
		let activeDelegates;
		let startingHeight;
		let bftParams;
		let bftInstance;

		beforeEach(async () => {
			storageMock = {
				entities: {
					Block: {
						get: jest.fn().mockResolvedValue([]),
					},
					ChainState: {
						get: jest.fn(),
					},
					Account: {
						get: jest.fn().mockResolvedValue([]),
						getOne: jest.fn().mockResolvedValue({}),
					},
				},
			};

			slots = new Slots({
				epochTime: constants.EPOCH_TIME,
				interval: constants.BLOCK_TIME,
				blocksPerRound: constants.ACTIVE_DELEGATES,
			});

			loggerMock = {};
			activeDelegates = 101;
			startingHeight = 0;

			bftParams = {
				storage: storageMock,
				logger: loggerMock,
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
						slots.epochTime = testCase.initialState.epochTime;
						slots.interval = testCase.initialState.blockInterval;

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
