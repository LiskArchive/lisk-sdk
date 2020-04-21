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
import * as scenario4DelegatesSimple from '../bft_specs/4_delegates_simple.json';
import * as scenario5DelegatesSwitchedCompletely from '../bft_specs/5_delegates_switched_completely.json';
import * as scenario7DelegatesPartialSwitch from '../bft_specs/7_delegates_partial_switch.json';
import * as scenario11DelegatesPartialSwitch from '../bft_specs/11_delegates_partial_switch.json';
import { FinalityManager } from '../../src/finality_manager';
import { StateStoreMock } from '../unit/state_store_mock';

const bftScenarios = [
	scenario4DelegatesMissedSlots,
	scenario4DelegatesSimple,
	scenario5DelegatesSwitchedCompletely,
	scenario7DelegatesPartialSwitch,
	scenario11DelegatesPartialSwitch,
];

const pick = (
	calcKeyPair: { [key: string]: number },
	minHeight: number,
): { [key: string]: number } =>
	Object.keys(calcKeyPair).reduce<{ [key: string]: number }>((prev, key) => {
		if (parseInt(key, 10) >= minHeight) {
			// eslint-disable-next-line no-param-reassign
			prev[key] = calcKeyPair[key];
		}
		return prev;
	}, {});

describe('FinalityManager', () => {
	let chainStub: {
		dataAccess: {
			getBlockHeadersByHeightBetween: jest.Mock;
			getLastBlockHeader: jest.Mock;
		};
		slots: {
			getSlotNumber: jest.Mock;
			isWithinTimeslot: jest.Mock;
			getEpochTime: jest.Mock;
		};
	};
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
					chainStub = {
						dataAccess: {
							getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
							getLastBlockHeader: jest.fn().mockResolvedValue([]),
						},
						slots: {
							getSlotNumber: jest.fn(),
							isWithinTimeslot: jest.fn(),
							getEpochTime: jest.fn(),
						},
					};
					dposStub = {
						getMinActiveHeight: jest.fn(),
						isStandbyDelegate: jest.fn(),
					};
					stateStore = new StateStoreMock();
					finalityManager = new FinalityManager({
						chain: chainStub,
						dpos: dposStub,
						finalizedHeight: scenario.config.finalizedHeight,
						activeDelegates: scenario.config.activeDelegates,
					});

					const blockHeaders = (scenario.testCases as any).map(
						(tc: any) => tc.input.blockHeader,
					);
					chainStub.dataAccess.getBlockHeadersByHeightBetween.mockImplementation(
						async (from: number, to: number) => {
							const headers = blockHeaders.filter(
								(bf: any) => bf.height >= from && bf.height <= to,
							);
							headers.sort((a: any, b: any) => b.height - a.height);
							return Promise.resolve(headers);
						},
					);
					dposStub.getMinActiveHeight.mockImplementation(
						async (height: number, address: string) => {
							const header = blockHeaders.find(
								(bh: any) =>
									bh.height === height &&
									getAddressFromPublicKey(bh.generatorPublicKey) === address,
							);
							return Promise.resolve(header.delegateMinHeightActive);
						},
					);
				});

				for (const testCase of scenario.testCases) {
					// eslint-disable-next-line no-loop-func
					it(`should have accurate information when ${testCase.input.delegateName} forge block at height = ${testCase.input.blockHeader.height}`, async () => {
						await finalityManager.addBlockHeader(
							testCase.input.blockHeader as any,
							stateStore,
						);

						expect((finalityManager as any).preCommits).toEqual(
							testCase.output.preCommits,
						);

						expect((finalityManager as any).preVotes).toEqual(
							testCase.output.preVotes,
						);

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

	describe('recompute', () => {
		for (const scenario of bftScenarios) {
			let finalityManager: FinalityManager;

			// eslint-disable-next-line no-loop-func
			beforeAll(() => {
				chainStub = {
					dataAccess: {
						getBlockHeadersByHeightBetween: jest.fn(),
						getLastBlockHeader: jest.fn(),
					},
					slots: {
						getSlotNumber: jest.fn(),
						isWithinTimeslot: jest.fn(),
						getEpochTime: jest.fn(),
					},
				};
				dposStub = {
					getMinActiveHeight: jest.fn(),
					isStandbyDelegate: jest.fn(),
				};
				stateStore = new StateStoreMock();
				finalityManager = new FinalityManager({
					chain: chainStub,
					dpos: dposStub,
					finalizedHeight: scenario.config.finalizedHeight,
					activeDelegates: scenario.config.activeDelegates,
				});
				const blockHeaders = (scenario.testCases as any).map(
					(tc: any) => tc.input.blockHeader,
				);
				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockImplementation(
					async (from: number, to: number) => {
						const headers = blockHeaders.filter(
							(bf: any) => bf.height >= from && bf.height <= to,
						);
						headers.sort((a: any, b: any) => b.height - a.height);
						return Promise.resolve(headers);
					},
				);
				dposStub.getMinActiveHeight.mockImplementation(
					async (height: number, address: string) => {
						const header = blockHeaders.find(
							(bh: any) =>
								bh.height === height &&
								getAddressFromPublicKey(bh.generatorPublicKey) === address,
						);
						return Promise.resolve(header.delegateMinHeightActive);
					},
				);
			});

			// eslint-disable-next-line no-loop-func
			describe(`when running scenario "${scenario.handler}"`, () => {
				it('should have accurate information after recompute', async () => {
					// Let's first compute in proper way
					for (const testCase of scenario.testCases) {
						await finalityManager.addBlockHeader(
							testCase.input.blockHeader as any,
							stateStore,
						);
					}

					const lastTestCaseOutput =
						scenario.testCases[scenario.testCases.length - 1].output;

					// Values should match with expectations
					expect((finalityManager as any).preCommits).toEqual(
						lastTestCaseOutput.preCommits,
					);
					expect((finalityManager as any).preVotes).toEqual(
						lastTestCaseOutput.preVotes,
					);
					expect(finalityManager.finalizedHeight).toEqual(
						lastTestCaseOutput.finalizedHeight,
					);
					expect(finalityManager.chainMaxHeightPrevoted).toEqual(
						lastTestCaseOutput.preVotedConfirmedHeight,
					);

					const heightMax = (scenario.testCases as any).reduce(
						(prev: number, current: any) => {
							if (current.input.blockHeader.height > prev) {
								return current.input.blockHeader.height;
							}
							return prev;
						},
						0,
					);

					// Now recompute all information again
					await finalityManager.recompute(heightMax, stateStore);

					// Values should match with expectations
					expect(finalityManager.finalizedHeight).toEqual(
						lastTestCaseOutput.finalizedHeight,
					);
					expect(finalityManager.chainMaxHeightPrevoted).toEqual(
						lastTestCaseOutput.preVotedConfirmedHeight,
					);

					// While re-compute we don't have full list of block headers
					// due to max limit on the block headers we can store (5 rounds).
					// Due to this we don't have pre-votes and pre-commits fo every
					// height we had before re-compute.
					// Although this does not impact the computation of finalizedHeight
					// or preVotedConfirmedHeight
					expect(lastTestCaseOutput.preCommits).toEqual(
						expect.objectContaining((finalityManager as any).preCommits),
					);

					const minHeight = heightMax - finalityManager.processingThreshold;
					expect(pick((finalityManager as any).preVotes, minHeight)).toEqual(
						pick(lastTestCaseOutput.preVotes as any, minHeight),
					);
				});
			});
		}
	});

	describe('removeBlockHeaders', () => {
		for (const scenario of bftScenarios) {
			let finalityManager: FinalityManager;

			// eslint-disable-next-line no-loop-func
			beforeAll(() => {
				chainStub = {
					dataAccess: {
						getBlockHeadersByHeightBetween: jest.fn(),
						getLastBlockHeader: jest.fn(),
					},
					slots: {
						getSlotNumber: jest.fn(),
						isWithinTimeslot: jest.fn(),
						getEpochTime: jest.fn(),
					},
				};
				dposStub = {
					getMinActiveHeight: jest.fn(),
					isStandbyDelegate: jest.fn(),
				};
				stateStore = new StateStoreMock();
				finalityManager = new FinalityManager({
					chain: chainStub,
					dpos: dposStub,
					finalizedHeight: scenario.config.finalizedHeight,
					activeDelegates: scenario.config.activeDelegates,
				});
				const blockHeaders = (scenario.testCases as any).map(
					(tc: any) => tc.input.blockHeader,
				);
				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockImplementation(
					async (from: number, to: number) => {
						const headers = blockHeaders.filter(
							(bf: any) => bf.height >= from && bf.height <= to,
						);
						headers.sort((a: any, b: any) => b.height - a.height);
						return Promise.resolve(headers);
					},
				);
				dposStub.getMinActiveHeight.mockImplementation(
					async (height: number, address: string) => {
						const header = blockHeaders.find(
							(bh: any) =>
								bh.height === height &&
								getAddressFromPublicKey(bh.generatorPublicKey) === address,
						);
						return Promise.resolve(header.delegateMinHeightActive);
					},
				);
			});

			// eslint-disable-next-line no-loop-func
			describe(`when running scenario "${scenario.handler}"`, () => {
				it('should have accurate information after recompute', async () => {
					// Arrange - Let's first compute in proper way
					for (const testCase of scenario.testCases) {
						await finalityManager.addBlockHeader(
							testCase.input.blockHeader as any,
							stateStore,
						);
					}
					const testCaseInMiddle =
						scenario.testCases[Math.ceil(scenario.testCases.length / 2)];
					const {
						input: testCaseInput,
						output: testCaseOutput,
					} = testCaseInMiddle;

					// Act - Now all headers above that step
					await finalityManager.recompute(
						testCaseInput.blockHeader.height,
						stateStore,
					);

					// Assert - Values should match with out of that step
					expect(finalityManager.finalizedHeight).toEqual(
						testCaseOutput.finalizedHeight,
					);
					expect(finalityManager.chainMaxHeightPrevoted).toEqual(
						testCaseOutput.preVotedConfirmedHeight,
					);
				});
			});
		}
	});
});
