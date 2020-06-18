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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as scenario4DelegatesMissedSlots from '../bft_specs/4_delegates_missed_slots.json';
// import * as scenario4DelegatesSimple from '../bft_specs/4_delegates_simple.json';
// import * as scenario5DelegatesSwitchedCompletely from '../bft_specs/5_delegates_switched_completely.json';
// import * as scenario7DelegatesPartialSwitch from '../bft_specs/7_delegates_partial_switch.json';
// import * as scenario11DelegatesPartialSwitch from '../bft_specs/11_delegates_partial_switch.json';
import { FinalityManager } from '../../src/finality_manager';
import { StateStoreMock } from '../utils/state_store_mock';
import { convertHeader } from '../fixtures/blocks';

const bftScenarios = [
	scenario4DelegatesMissedSlots,
];

describe('FinalityManager', () => {
	let dposStub: {
		getMinActiveHeight: jest.Mock;
		isStandbyDelegate: jest.Mock;
	};
	let stateStore: StateStoreMock;

	describe('addBlockHeader', () => {
		for (const scenario of bftScenarios) {
			// eslint-disable-next-line no-loop-func
			describe(`when running scenario "${scenario.handler}"`, () => {
				let finalityManager: FinalityManager;

				beforeAll(() => {
					dposStub = {
						getMinActiveHeight: jest.fn(),
						isStandbyDelegate: jest.fn(),
					};

					finalityManager = new FinalityManager({
						dpos: dposStub,
						finalizedHeight: scenario.config.finalizedHeight,
						activeDelegates: scenario.config.activeDelegates,
					});

					const blockHeaders = (scenario.testCases as any).map((tc: any) =>
						convertHeader(tc.input.blockHeader),
					);
					blockHeaders.sort((a: any, b: any) => b.height - a.height);

					dposStub.getMinActiveHeight.mockImplementation(
						async (height: number, address: Buffer) => {
							const header = blockHeaders.find(
								(bh: any) =>
									bh.height === height &&
									getAddressFromPublicKey(bh.generatorPublicKey).equals(
										address,
									),
							)
							return Promise.resolve(header.delegateMinHeightActive);
						},
					);
				});

				for (const testCase of scenario.testCases) {
					// eslint-disable-next-line no-loop-func
					it(`should have accurate information when ${testCase.input.delegateName} forge block at height = ${testCase.input.blockHeader.height}`, async () => {

						const blockHeaders = (scenario.testCases as any).map((tc: any) =>
							convertHeader(tc.input.blockHeader),
						);

						blockHeaders.sort((a: any, b: any) => b.height - a.height);
						const filteredBlockHeaders = blockHeaders.filter((bh: any) => bh.height < testCase.input.blockHeader.height);
						console.log(filteredBlockHeaders);
						stateStore = new StateStoreMock([], {}, { lastBlockHeaders: filteredBlockHeaders });

						await finalityManager.addBlockHeader(
							convertHeader(testCase.input.blockHeader),
							stateStore,
						);

						// expect((finalityManager as any).preCommits).toEqual(
						// 	testCase.output.preCommits,
						// );

						// expect((finalityManager as any).preVotes).toEqual(
						// 	testCase.output.preVotes,
						// );

						expect(finalityManager.finalizedHeight).toEqual(
							testCase.output.finalizedHeight,
						);

						expect(finalityManager.chainMaxHeightPrevoted).toEqual(
							testCase.output.preVotedConfirmedHeight,
						);
					});
				}
			});
		}
	});
});
