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

import { Slots } from '@liskhq/lisk-chain';
import { BFT } from '../../src/bft';

import forkChoiceSpecs = require('../bft_specs/bft_fork_choice_rules.json');

const constants = {
	ACTIVE_DELEGATES: 101,
	EPOCH_TIME: '2016-05-24T17:00:00.000Z',
	BLOCK_TIME: 10,
};

describe('bft', () => {
	describe('forkChoice', () => {
		let activeDelegates;
		let startingHeight;
		let bftParams;
		let bftInstance: BFT;

		let chainStub: {
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.Mock;
				getLastBlockHeader: jest.Mock;
			};
			slots: Slots;
		};
		let dposStub: {
			getMinActiveHeight: jest.Mock;
			isStandbyDelegate: jest.Mock;
		};

		beforeEach(() => {
			const slots = new Slots({
				epochTime: constants.EPOCH_TIME,
				interval: constants.BLOCK_TIME,
			});
			chainStub = {
				dataAccess: {
					getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
					getLastBlockHeader: jest.fn().mockResolvedValue([]),
				},
				slots,
			};
			dposStub = {
				getMinActiveHeight: jest.fn(),
				isStandbyDelegate: jest.fn(),
			};

			activeDelegates = 101;
			startingHeight = 0;

			bftParams = {
				chain: chainStub,
				dpos: dposStub,
				activeDelegates,
				startingHeight,
			};

			bftInstance = new BFT(bftParams);
		});

		describe(`when running scenario "${forkChoiceSpecs.handler}"`, () => {
			forkChoiceSpecs.testCases.forEach((testCase: any) => {
				describe(testCase.description, () => {
					it('should have accurate fork status', () => {
						const epochTime = testCase.config
							? testCase.config.epochTime
							: forkChoiceSpecs.config.epochTime;
						const interval = testCase.config
							? testCase.config.blockInterval
							: forkChoiceSpecs.config.blockInterval;
						const lastBlock = testCase.config
							? testCase.config.lastBlock
							: forkChoiceSpecs.config.lastBlock;

						(chainStub.slots as any)._epochTime = new Date(epochTime);
						(chainStub.slots as any)._interval = interval;

						Date.now = jest.fn(
							// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
