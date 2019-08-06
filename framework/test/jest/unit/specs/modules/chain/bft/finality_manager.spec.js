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

const path = require('path');
const fs = require('fs');
const {
	BFTChainDisjointError,
	BFTLowerChainBranchError,
	BFTForkChoiceRuleError,
	BFTInvalidAttributeError,
} = require('../../../../../../../src/modules/chain/bft/errors');
const utils = require('../../../../../../../src/modules/chain/bft/utils');
const {
	FinalityManager,
} = require('../../../../../../../src/modules/chain/bft/finality_manager');

jest.mock('../../../../../../../src/modules/chain/bft/utils');

const {
	BlockHeader: blockHeaderFixture,
} = require('../../../../../../mocha/fixtures/blocks');

const {
	Account: accountFixture,
} = require('../../../../../../mocha/fixtures/accounts');

const generateValidHeaders = count => {
	return [...Array(count)].map((_, index) => {
		return blockHeaderFixture({
			height: index + 1,
			maxHeightPreviouslyForged: index,
		});
	});
};

const loadCSVSimulationData = filePath => {
	const fileContents = fs.readFileSync(filePath);
	const data = fileContents
		.toString()
		.split('\n')
		.map(line => line.toString().split(','));
	const result = [];

	for (let i = 1; i < data.length - 1; i += 2) {
		result.push({
			delegate: data[i][1],
			maxHeightPreviouslyForged: parseInt(data[i][2]),
			activeSinceRound: parseInt(data[i][4]),
			height: parseInt(data[i][5]),
			preCommits: data[i]
				.slice(7)
				.map(Number)
				.filter(a => a !== 0),
			preVotes: data[i + 1]
				.slice(7)
				.map(Number)
				.filter(a => a !== 0),
		});
	}

	return result;
};

const delegatesMap = {};
const generateHeaderInformation = ({
	blockData,
	threshold,
	lastBlockData,
	activeDelegates,
}) => {
	const delegatePublicKey =
		delegatesMap[blockData.delegate] || accountFixture().publicKey;
	delegatesMap[blockData.delegate] = delegatePublicKey;

	const beforeBlockPreVotedConfirmedHeight = lastBlockData
		? lastBlockData.preVotes.lastIndexOf(threshold) + 1
		: 0;

	const header = blockHeaderFixture({
		height: blockData.height,
		maxHeightPreviouslyForged: blockData.maxHeightPreviouslyForged,
		delegatePublicKey: delegatesMap[blockData.delegate],
		activeSinceRound: blockData.activeSinceRound,
		prevotedConfirmedUptoHeight: beforeBlockPreVotedConfirmedHeight,
	});

	const finalizedHeight = blockData.preCommits.lastIndexOf(threshold) + 1;

	const preVotedConfirmedHeight = blockData.preVotes.lastIndexOf(threshold) + 1;

	// Since BFT only keep track of 5 rounds
	const preVotes = blockData.preVotes.slice(-1 * activeDelegates * 5);
	const preCommits = blockData.preCommits.slice(-1 * activeDelegates * 5);

	return {
		header,
		finalizedHeight,
		preVotedConfirmedHeight,
		preVotes,
		preCommits,
	};
};

describe('finality_manager', () => {
	describe('FinalityManager', () => {
		let bft;
		const finalizedHeight = 0;
		const activeDelegates = 101;
		const preVoteThreshold = 68;
		const preCommitThreshold = 68;
		const processingThreshold = 302;
		const maxHeaders = 505;

		const scenarios = [
			{
				title: '11 delegates partially switching',
				data: loadCSVSimulationData(
					path.join(__dirname, './scenarios/11_delegates_partial_switching.csv')
				),
				activeDelegates: 11,
			},
			{
				title: '5 delegates completely switched',
				data: loadCSVSimulationData(
					path.join(
						__dirname,
						'./scenarios/5_delegates_switched_completely.csv'
					)
				),
				activeDelegates: 5,
			},
		];

		beforeEach(async () => {
			bft = new FinalityManager({ finalizedHeight, activeDelegates });
			jest.spyOn(bft.headers, 'top');
		});

		afterEach(() => {
			// TODO: Investigate why jest-config is not clearing the mock for modules
			jest.clearAllMocks();
		});

		describe('constructor', () => {
			it('should initialize the object correctly', async () => {
				expect(bft).toBeInstanceOf(FinalityManager);
				expect(bft.activeDelegates).toEqual(activeDelegates);
				expect(bft.preVoteThreshold).toEqual(preVoteThreshold);
				expect(bft.preCommitThreshold).toEqual(preCommitThreshold);
				expect(bft.processingThreshold).toEqual(processingThreshold);
				expect(bft.maxHeaders).toEqual(maxHeaders);
			});

			it('should throw error if finalizedHeight is not provided', async () => {
				expect(() => new FinalityManager()).toThrow(
					'Must provide finalizedHeight'
				);
			});

			it('should throw error if activeDelegates is not provided', async () => {
				expect(() => new FinalityManager({ finalizedHeight })).toThrow(
					'Must provide activeDelegates'
				);
			});

			it('should throw error if activeDelegates is not positive', async () => {
				expect(
					() => new FinalityManager({ finalizedHeight, activeDelegates: 0 })
				).toThrow('Must provide a positive activeDelegates');
			});
		});

		describe('verifyBlockHeaders', () => {
			it('should throw error if prevotedConfirmedUptoHeight is not accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				generateValidHeaders(bft.processingThreshold + 1).forEach(header => {
					bft.headers.add(header);
				});
				const header = blockHeaderFixture({ prevotedConfirmedUptoHeight: 10 });

				expect(() => bft.verifyBlockHeaders(header)).toThrow(
					BFTInvalidAttributeError,
					'Wrong prevotedConfirmedHeight in blockHeader.'
				);
			});

			it('should not throw error if prevotedConfirmedUptoHeight is accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				generateValidHeaders(bft.processingThreshold + 1).forEach(header => {
					bft.headers.add(header);
				});
				const header = blockHeaderFixture({ prevotedConfirmedUptoHeight: 10 });
				bft.prevotedConfirmedHeight = 10;

				expect(() => bft.verifyBlockHeaders(header)).not.toThrow();
			});

			it("should return true if delegate didn't forge any block previously", async () => {
				const header = blockHeaderFixture();
				bft.headers.top.mockReturnValue([]);

				expect(bft.verifyBlockHeaders(header)).toBeTruthy();
			});

			it('should throw error if same delegate forged block on different height', async () => {
				const maxHeightPreviouslyForged = 10;
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged,
					height: 9,
				});

				bft.headers.top.mockReturnValue([lastBlock]);

				expect(() => bft.verifyBlockHeaders(currentBlock)).toThrow(
					BFTForkChoiceRuleError
				);
			});

			it('should throw error if delegate forged block on same height', async () => {
				const maxHeightPreviouslyForged = 10;
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged,
					height: 10,
				});

				bft.headers.top.mockReturnValue([lastBlock]);

				expect(() => bft.verifyBlockHeaders(currentBlock)).toThrow(
					BFTForkChoiceRuleError
				);
			});

			it('should throw error if maxHeightPreviouslyForged has wrong value', async () => {
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged: 9,
				});

				bft.headers.top.mockReturnValue([lastBlock]);

				expect(() => bft.verifyBlockHeaders(currentBlock)).toThrow(
					BFTChainDisjointError
				);
			});

			it('should throw error if prevotedConfirmedUptoHeight has wrong value', async () => {
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					prevotedConfirmedUptoHeight: 10,
					height: 9,
				});
				const currentBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					prevotedConfirmedUptoHeight: 9,
					maxHeightPreviouslyForged: 9,
					height: 10,
				});

				bft.headers.top.mockReturnValue([lastBlock]);

				expect(() => bft.verifyBlockHeaders(currentBlock)).toThrow(
					BFTLowerChainBranchError
				);
			});

			it('should return true if headers are valid', async () => {
				const [lastBlock, currentBlock] = generateValidHeaders(2);
				bft.headers.top.mockReturnValue([lastBlock]);

				expect(bft.verifyBlockHeaders(currentBlock)).toBeTruthy();
			});
		});

		describe('addBlockHeader', () => {
			it('should call validateBlockHeader with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				// jest.spyOn(bftModule, 'validateBlockHeader');
				bft.addBlockHeader(header1);

				expect(utils.validateBlockHeader).toHaveBeenCalledTimes(1);
				expect(utils.validateBlockHeader).toHaveBeenCalledWith(header1);
			});

			it('should call verifyBlockHeaders with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				// jest.spyOn(bftModule, 'validateBlockHeader');
				bft.addBlockHeader(header1);

				expect(utils.validateBlockHeader).toHaveBeenCalledTimes(1);
				expect(utils.validateBlockHeader).toHaveBeenCalledWith(header1);
			});

			it('should add headers to list', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				const header2 = blockHeaderFixture({
					height: 2,
					maxHeightPreviouslyForged: 1,
				});
				bft.addBlockHeader(header1).addBlockHeader(header2);
				expect(bft.headers.length).toEqual(2);
				expect(bft.headers.items).toEqual([header1, header2]);
			});

			it('should call updatePreVotesPreCommits with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				jest.spyOn(bft, 'updatePreVotesPreCommits');
				bft.addBlockHeader(header1);

				expect(bft.updatePreVotesPreCommits).toHaveBeenCalledTimes(1);
				expect(bft.updatePreVotesPreCommits).toHaveBeenCalledWith(header1);
			});

			describe('data scenarios', () => {
				scenarios.forEach(scenario => {
					describe(`when ${scenario.title}`, () => {
						const myBft = new FinalityManager({
							finalizedHeight: 0,
							activeDelegates: scenario.activeDelegates,
						});

						scenario.data.forEach((headerData, index) => {
							it(`have accurate information when ${
								headerData.delegate
							} forge block at height = ${headerData.height}`, async () => {
								const blockData = generateHeaderInformation({
									blockData: headerData,
									lastBlockData: scenario.data[index - 1],
									threshold: myBft.preCommitThreshold,
									activeDelegates: scenario.activeDelegates,
								});

								myBft.addBlockHeader(blockData.header);

								expect(Object.values(myBft.preCommits)).toEqual(
									blockData.preCommits
								);
								expect(Object.values(myBft.preVotes)).toEqual(
									blockData.preVotes
								);

								expect(myBft.finalizedHeight).toEqual(
									blockData.finalizedHeight
								);

								expect(myBft.prevotedConfirmedHeight).toEqual(
									blockData.preVotedConfirmedHeight
								);
							});
						});
					});
				});
			});
		});

		describe('recompute', () => {
			describe('data scenarios', () => {
				scenarios.forEach(scenario => {
					const myBft = new FinalityManager({
						finalizedHeight: 0,
						activeDelegates: scenario.activeDelegates,
					});

					describe(`when ${scenario.title}`, () => {
						it('should have accurate information after recompute', async () => {
							let blockData;

							// Let's first compute in proper way
							scenario.data.forEach((headerData, index) => {
								blockData = generateHeaderInformation({
									blockData: headerData,
									threshold: myBft.preCommitThreshold,
									lastBlockData: scenario.data[index - 1],
									activeDelegates: scenario.activeDelegates,
								});
								myBft.addBlockHeader(blockData.header);
							});

							// Values should match with expectations
							expect(Object.values(myBft.preCommits)).toEqual(
								blockData.preCommits
							);
							expect(Object.values(myBft.preVotes)).toEqual(blockData.preVotes);
							expect(myBft.finalizedHeight).toEqual(blockData.finalizedHeight);
							expect(myBft.prevotedConfirmedHeight).toEqual(
								blockData.preVotedConfirmedHeight
							);

							// Now recompute all information again
							myBft.recompute();

							// Values should match with expectations
							expect(myBft.finalizedHeight).toEqual(blockData.finalizedHeight);
							expect(myBft.prevotedConfirmedHeight).toEqual(
								blockData.preVotedConfirmedHeight
							);

							// TODO: Try to came up with correct test expectation
							// While re-compute we don't have full list of block headers
							// due to max limit on the block headers we can store (5 rounds).
							// Due to this we don't have pre-votes and pre-commits fo every
							// height we had before re-compute.
							// Although this does not impact the computation of finalizedHeight
							// or preVotedConfirmedHeight

							// expect(Object.values(myBft.preCommits)).toEqual(
							// 	blockData.preCommits
							// );
							// expect(Object.values(myBft.preVotes)).toEqual(blockData.preVotes);
						});
					});
				});
			});
		});
	});
});
