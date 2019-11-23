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

const scenario4DelegatesMissedSlots = require('./bft_specs/4_delegates_missed_slots.json');
const scenario4DelegatesSimple = require('./bft_specs/4_delegates_simple.json');
const scenario5DelegatesSwitchedCompletely = require('./bft_specs/5_delegates_switched_completely.json');
const scenario7DelegatesPartialSwitch = require('./bft_specs/7_delegates_partial_switch.json');
const scenario11DelegatesPartialSwitch = require('./bft_specs/11_delegates_partial_switch.json');

const bftScenarios = [
	scenario4DelegatesMissedSlots,
	scenario4DelegatesSimple,
	scenario5DelegatesSwitchedCompletely,
	scenario7DelegatesPartialSwitch,
	scenario11DelegatesPartialSwitch,
];

const {
	FinalityManager,
} = require('../../../../../../../src/modules/chain/bft/finality_manager');

describe('FinalityManager', () => {
	describe('addBlockHeader', () => {
		bftScenarios.forEach(scenario => {
			describe(`when running scenario "${scenario.handler}"`, () => {
				const myBft = new FinalityManager({
					finalizedHeight: scenario.config.finalizedHeight,
					activeDelegates: scenario.config.activeDelegates,
				});

				scenario.testCases.forEach(testCase => {
					it(`should have accurate information when ${
						testCase.input.delegateName
					} forge block at height = ${
						testCase.input.blockHeader.height
					}`, async () => {
						myBft.addBlockHeader(testCase.input.blockHeader);

						expect(myBft.preCommits).toEqual(testCase.output.preCommits);

						expect(myBft.preVotes).toEqual(testCase.output.preVotes);

						expect(myBft.finalizedHeight).toEqual(
							testCase.output.finalizedHeight,
						);

						expect(myBft.prevotedConfirmedHeight).toEqual(
							testCase.output.preVotedConfirmedHeight,
						);
					});
				});
			});
		});
	});

	describe('recompute', () => {
		bftScenarios.forEach(scenario => {
			const myBft = new FinalityManager({
				finalizedHeight: scenario.config.finalizedHeight,
				activeDelegates: scenario.config.activeDelegates,
			});

			describe(`when running scenario "${scenario.handler}"`, () => {
				it('should have accurate information after recompute', async () => {
					// Let's first compute in proper way
					scenario.testCases.forEach(testCase => {
						myBft.addBlockHeader(testCase.input.blockHeader);
					});
					const lastTestCaseOutput =
						scenario.testCases[scenario.testCases.length - 1].output;

					// Values should match with expectations
					expect(myBft.preCommits).toEqual(lastTestCaseOutput.preCommits);
					expect(myBft.preVotes).toEqual(lastTestCaseOutput.preVotes);
					expect(myBft.finalizedHeight).toEqual(
						lastTestCaseOutput.finalizedHeight,
					);
					expect(myBft.prevotedConfirmedHeight).toEqual(
						lastTestCaseOutput.preVotedConfirmedHeight,
					);

					// Now recompute all information again
					myBft.recompute();

					// Values should match with expectations
					expect(myBft.finalizedHeight).toEqual(
						lastTestCaseOutput.finalizedHeight,
					);
					expect(myBft.prevotedConfirmedHeight).toEqual(
						lastTestCaseOutput.preVotedConfirmedHeight,
					);

					// While re-compute we don't have full list of block headers
					// due to max limit on the block headers we can store (5 rounds).
					// Due to this we don't have pre-votes and pre-commits fo every
					// height we had before re-compute.
					// Although this does not impact the computation of finalizedHeight
					// or preVotedConfirmedHeight
					expect(lastTestCaseOutput.preCommits).toEqual(
						expect.objectContaining(myBft.preCommits),
					);
					expect(lastTestCaseOutput.preVotes).toEqual(
						expect.objectContaining(myBft.preVotes),
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
					scenario.testCases.forEach(testCase => {
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
					expect(myBft.prevotedConfirmedHeight).toEqual(
						testCaseOutput.preVotedConfirmedHeight,
					);
				});
			});
		});
	});
});
