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

import * as scenario4DelegatesMissedSlots from '../bft_specs/4_delegates_missed_slots.json';
import * as scenario4DelegatesSimple from '../bft_specs/4_delegates_simple.json';
import * as scenario5DelegatesSwitchedCompletely from '../bft_specs/5_delegates_switched_completely.json';
import * as scenario7DelegatesPartialSwitch from '../bft_specs/7_delegates_partial_switch.json';
import * as scenario11DelegatesPartialSwitch from '../bft_specs/11_delegates_partial_switch.json';

const bftScenarios = [
	scenario4DelegatesMissedSlots,
	scenario4DelegatesSimple,
	scenario5DelegatesSwitchedCompletely,
	scenario7DelegatesPartialSwitch,
	scenario11DelegatesPartialSwitch,
];

import { FinalityManager } from '../../src/finality_manager';

describe('FinalityManager', () => {
	describe('addBlockHeader', () => {
		bftScenarios.forEach(scenario => {
			describe(`when running scenario "${scenario.handler}"`, () => {
				const finalityManager = new FinalityManager({
					finalizedHeight: scenario.config.finalizedHeight,
					activeDelegates: scenario.config.activeDelegates,
				});

				scenario.testCases.forEach((testCase: any) => {
					it(`should have accurate information when ${testCase.input.delegateName} forge block at height = ${testCase.input.blockHeader.height}`, async () => {
						finalityManager.addBlockHeader(testCase.input.blockHeader);

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
				});
			});
		});
	});

	describe('recompute', () => {
		bftScenarios.forEach(scenario => {
			const finalityManager = new FinalityManager({
				finalizedHeight: scenario.config.finalizedHeight,
				activeDelegates: scenario.config.activeDelegates,
			});

			describe(`when running scenario "${scenario.handler}"`, () => {
				it('should have accurate information after recompute', async () => {
					// Let's first compute in proper way
					scenario.testCases.forEach((testCase: any) => {
						finalityManager.addBlockHeader(testCase.input.blockHeader);
					});
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

					// Now recompute all information again
					finalityManager.recompute();

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
					expect(lastTestCaseOutput.preVotes).toEqual(
						expect.objectContaining((finalityManager as any).preVotes),
					);
				});
			});
		});
	});

	describe('removeBlockHeaders', () => {
		bftScenarios.forEach(scenario => {
			const myBft = new FinalityManager({
				finalizedHeight: scenario.config.finalizedHeight,
				activeDelegates: scenario.config.activeDelegates,
			});

			describe(`when running scenario "${scenario.handler}"`, () => {
				it('should have accurate information after recompute', async () => {
					// Arrange - Let's first compute in proper way
					scenario.testCases.forEach((testCase: any) => {
						myBft.addBlockHeader(testCase.input.blockHeader);
					});
					const testCaseInMiddle =
						scenario.testCases[Math.ceil(scenario.testCases.length / 2)];
					const {
						input: testCaseInput,
						output: testCaseOutput,
					} = testCaseInMiddle;

					// Act - Now all headers above that step
					myBft.removeBlockHeaders({
						aboveHeight: testCaseInput.blockHeader.height,
					});

					// Assert - Values should match with out of that step
					expect(myBft.finalizedHeight).toEqual(testCaseOutput.finalizedHeight);
					expect(myBft.chainMaxHeightPrevoted).toEqual(
						testCaseOutput.preVotedConfirmedHeight,
					);
				});
			});
		});
	});
});
