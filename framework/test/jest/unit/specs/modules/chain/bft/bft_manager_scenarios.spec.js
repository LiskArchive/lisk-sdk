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

const BFTScenarios = require('./scenarios');

const {
	FinalityManager,
} = require('../../../../../../../src/modules/chain/bft/finality_manager');

describe('FinalityManager', () => {
	describe('addBlockHeader', () => {
		BFTScenarios.forEach(scenario => {
			describe(`when ${scenario.title}`, () => {
				const myBft = new FinalityManager({
					finalizedHeight: scenario.config.finalizedHeight,
					activeDelegates: scenario.config.activeDelegates,
				});

				scenario.steps.forEach(step => {
					it(`should have accurate information when ${
						step.input.delegateName
					} forge block at height = ${step.input.height}`, async () => {
						myBft.addBlockHeader(step.input.blockHeader);

						expect(myBft.preCommits).toEqual(step.output.preCommits);

						expect(myBft.preVotes).toEqual(step.output.preVotes);

						expect(myBft.finalizedHeight).toEqual(step.output.finalizedHeight);

						expect(myBft.prevotedConfirmedHeight).toEqual(
							step.output.preVotedConfirmedHeight,
						);
					});
				});
			});
		});
	});

	describe('recompute', () => {
		BFTScenarios.forEach(scenario => {
			const myBft = new FinalityManager({
				finalizedHeight: scenario.config.finalizedHeight,
				activeDelegates: scenario.config.activeDelegates,
			});

			describe(`when ${scenario.title}`, () => {
				it('should have accurate information after recompute', async () => {
					// Let's first compute in proper way
					scenario.steps.forEach(step => {
						myBft.addBlockHeader(step.input.blockHeader);
					});
					const lastStepOutput =
						scenario.steps[scenario.steps.length - 1].output;

					// Values should match with expectations
					expect(myBft.preCommits).toEqual(lastStepOutput.preCommits);
					expect(myBft.preVotes).toEqual(lastStepOutput.preVotes);
					expect(myBft.finalizedHeight).toEqual(lastStepOutput.finalizedHeight);
					expect(myBft.prevotedConfirmedHeight).toEqual(
						lastStepOutput.preVotedConfirmedHeight,
					);

					// Now recompute all information again
					myBft.recompute();

					// Values should match with expectations
					expect(myBft.finalizedHeight).toEqual(lastStepOutput.finalizedHeight);
					expect(myBft.prevotedConfirmedHeight).toEqual(
						lastStepOutput.preVotedConfirmedHeight,
					);

					// While re-compute we don't have full list of block headers
					// due to max limit on the block headers we can store (5 rounds).
					// Due to this we don't have pre-votes and pre-commits fo every
					// height we had before re-compute.
					// Although this does not impact the computation of finalizedHeight
					// or preVotedConfirmedHeight
					expect(lastStepOutput.preCommits).toEqual(
						expect.objectContaining(myBft.preCommits),
					);
					expect(lastStepOutput.preVotes).toEqual(
						expect.objectContaining(myBft.preVotes),
					);
				});
			});
		});
	});

	describe('removeBlockHeaders', () => {
		BFTScenarios.forEach(scenario => {
			const myBft = new FinalityManager({
				finalizedHeight: scenario.config.finalizedHeight,
				activeDelegates: scenario.config.activeDelegates,
			});

			describe(`when ${scenario.title}`, () => {
				it('should have accurate information after recompute', async () => {
					// Arrange - Let's first compute in proper way
					scenario.steps.forEach(step => {
						myBft.addBlockHeader(step.input.blockHeader);
					});
					const someStepInMiddle =
						scenario.steps[Math.ceil(scenario.steps.length / 2)];
					const { input: stepInput, output: stepOutput } = someStepInMiddle;

					// Act - Now all headers above that step
					myBft.removeBlockHeaders({
						aboveHeight: stepInput.height,
					});

					// Assert - Values should match with out of that step
					expect(myBft.finalizedHeight).toEqual(stepOutput.finalizedHeight);
					expect(myBft.prevotedConfirmedHeight).toEqual(
						stepOutput.preVotedConfirmedHeight,
					);
				});
			});
		});
	});
});
