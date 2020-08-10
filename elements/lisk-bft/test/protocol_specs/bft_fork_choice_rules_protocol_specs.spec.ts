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

import { Slots, Chain } from '@liskhq/lisk-chain';
import { BFT } from '../../src/bft';
import { convertHeader } from '../fixtures/blocks';

import forkChoiceSpecs = require('../bft_specs/bft_fork_choice_rules.json');

const constants = {
	ACTIVE_DELEGATES: 101,
	BLOCK_TIME: 10,
};

describe('bft', () => {
	describe('forkChoice', () => {
		let threshold;
		let genesisHeight;
		let bftParams;
		let bftInstance: BFT;

		let chainStub: Chain;

		beforeEach(() => {
			const slots = new Slots({
				genesisBlockTimestamp: 0,
				interval: constants.BLOCK_TIME,
			});
			chainStub = ({
				slots,
				dataAccess: {
					getConsensusState: jest.fn(),
				},
				numberOfValidators: 103,
			} as unknown) as Chain;

			threshold = 68;
			genesisHeight = 0;

			bftParams = {
				chain: chainStub,
				threshold,
				genesisHeight,
			};

			bftInstance = new BFT(bftParams);
		});

		describe(`when running scenario "${forkChoiceSpecs.handler}"`, () => {
			forkChoiceSpecs.testCases.forEach((testCase: any) => {
				describe(testCase.description, () => {
					it('should have accurate fork status', () => {
						const genesisBlockTimestamp = 0;
						const interval = testCase.config
							? testCase.config.blockInterval
							: forkChoiceSpecs.config.blockInterval;
						const lastBlock = testCase.config
							? testCase.config.lastBlock
							: forkChoiceSpecs.config.lastBlock;

						(chainStub.slots as any)._genesisTime = new Date(genesisBlockTimestamp);
						(chainStub.slots as any)._interval = interval;

						Date.now = jest.fn(
							// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
							() => genesisBlockTimestamp + testCase.input.receivedBlock.receivedAt * 1000,
						);

						const {
							input: { receivedBlock },
							output: { forkStatus: expectedForkStatus },
						} = testCase;

						const result = bftInstance.forkChoice(
							convertHeader(receivedBlock),
							convertHeader(lastBlock),
						);

						expect(result).toEqual(expectedForkStatus);
					});
				});
			});
		});
	});
});
