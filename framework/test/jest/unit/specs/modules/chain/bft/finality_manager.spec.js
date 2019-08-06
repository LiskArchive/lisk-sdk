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
		const preCommits = {};
		const preVotes = {};

		// In CSV votes and commits are mentioned as array
		// In BFT we manage as object so need to convert array to object
		data[i]
			.slice(7)
			.map(Number)
			.forEach((val, index) => {
				if (val !== 0) {
					preCommits[index + 1] = val;
				}
			});

		data[i + 1]
			.slice(7)
			.map(Number)
			.forEach((val, index) => {
				if (val !== 0) {
					preVotes[index + 1] = val;
				}
			});

		result.push({
			delegate: data[i][1],
			maxHeightPreviouslyForged: parseInt(data[i][2], 10),
			maxHeightPreVoted: parseInt(data[i][3], 10),
			activeSinceRound: parseInt(data[i][4], 10),
			height: parseInt(data[i][5], 10),
			preCommits,
			preVotes,
		});
	}

	return result;
};

const delegatesMap = {};
const generateHeaderInformation = ({
	blockData,
	threshold,
	activeDelegates,
}) => {
	const delegatePublicKey =
		delegatesMap[blockData.delegate] || accountFixture().publicKey;
	delegatesMap[blockData.delegate] = delegatePublicKey;

	const header = blockHeaderFixture({
		height: blockData.height,
		maxHeightPreviouslyForged: blockData.maxHeightPreviouslyForged,
		delegatePublicKey: delegatesMap[blockData.delegate],
		activeSinceRound: blockData.activeSinceRound,
		prevotedConfirmedUptoHeight: blockData.maxHeightPreVoted,
	});

	// Get key with highest value for pre-commits
	const highestHeightPreCommitted = Object.keys(blockData.preCommits)
		.reverse()
		.find(key => blockData.preCommits[key] >= threshold);
	const finalizedHeight = highestHeightPreCommitted
		? parseInt(highestHeightPreCommitted, 10)
		: 0;

	// Get key with highest value for pre-commits
	const highestHeightPreVoted = Object.keys(blockData.preVotes)
		.reverse()
		.find(key => blockData.preVotes[key] >= threshold);
	const preVotedConfirmedHeight = highestHeightPreVoted
		? parseInt(highestHeightPreVoted, 10)
		: 0;

	// Since BFT only keep track of 5 rounds
	const preVotes = Object.assign({}, blockData.preVotes);
	const preCommits = Object.assign({}, blockData.preCommits);
	Object.keys(preVotes)
		.slice(0, -1 * activeDelegates * 5)
		.forEach(key => {
			delete preVotes[key];
		});

	Object.keys(preCommits)
		.slice(0, -1 * activeDelegates * 5)
		.forEach(key => {
			delete preCommits[key];
		});

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
					path.join(
						__dirname,
						'./scenarios/11_delegates_partial_switching.csv',
					),
				),
				activeDelegates: 11,
			},
			{
				title: '5 delegates completely switched',
				data: loadCSVSimulationData(
					path.join(
						__dirname,
						'./scenarios/5_delegates_switched_completely.csv',
					),
				),
				activeDelegates: 5,
			},
			{
				title: '4 delegates simple',
				data: loadCSVSimulationData(
					path.join(__dirname, './scenarios/4_delegates_simple.csv'),
				),
				activeDelegates: 4,
			},
			{
				title: '4 delegates missed slots',
				data: loadCSVSimulationData(
					path.join(__dirname, './scenarios/4_delegates_missed_slots.csv'),
				),
				activeDelegates: 4,
			},
			{
				title: '7 delegates partial switch',
				data: loadCSVSimulationData(
					path.join(__dirname, './scenarios/7_delegates_partial_switch.csv'),
				),
				activeDelegates: 7,
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
					'Must provide finalizedHeight',
				);
			});

			it('should throw error if activeDelegates is not provided', async () => {
				expect(() => new FinalityManager({ finalizedHeight })).toThrow(
					'Must provide activeDelegates',
				);
			});

			it('should throw error if activeDelegates is not positive', async () => {
				expect(
					() => new FinalityManager({ finalizedHeight, activeDelegates: 0 }),
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
					'Wrong prevotedConfirmedHeight in blockHeader.',
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
					BFTForkChoiceRuleError,
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
					BFTForkChoiceRuleError,
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
					BFTChainDisjointError,
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
					BFTLowerChainBranchError,
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

						scenario.data.forEach(headerData => {
							it(`have accurate information when ${
								headerData.delegate
							} forge block at height = ${headerData.height}`, async () => {
								const blockData = generateHeaderInformation({
									blockData: headerData,
									threshold: myBft.preCommitThreshold,
									activeDelegates: scenario.activeDelegates,
								});

								myBft.addBlockHeader(blockData.header);

								expect(myBft.preCommits).toEqual(blockData.preCommits);

								expect(myBft.preVotes).toEqual(blockData.preVotes);

								expect(myBft.finalizedHeight).toEqual(
									blockData.finalizedHeight,
								);

								expect(myBft.prevotedConfirmedHeight).toEqual(
									blockData.preVotedConfirmedHeight,
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
							scenario.data.forEach(headerData => {
								blockData = generateHeaderInformation({
									blockData: headerData,
									threshold: myBft.preCommitThreshold,
									activeDelegates: scenario.activeDelegates,
								});
								myBft.addBlockHeader(blockData.header);
							});

							// Values should match with expectations
							expect(myBft.preCommits).toEqual(blockData.preCommits);
							expect(myBft.preVotes).toEqual(blockData.preVotes);
							expect(myBft.finalizedHeight).toEqual(blockData.finalizedHeight);
							expect(myBft.prevotedConfirmedHeight).toEqual(
								blockData.preVotedConfirmedHeight,
							);

							// Now recompute all information again
							myBft.recompute();

							// Values should match with expectations
							expect(myBft.finalizedHeight).toEqual(blockData.finalizedHeight);
							expect(myBft.prevotedConfirmedHeight).toEqual(
								blockData.preVotedConfirmedHeight,
							);

							// While re-compute we don't have full list of block headers
							// due to max limit on the block headers we can store (5 rounds).
							// Due to this we don't have pre-votes and pre-commits fo every
							// height we had before re-compute.
							// Although this does not impact the computation of finalizedHeight
							// or preVotedConfirmedHeight
							expect(blockData.preCommits).toEqual(
								expect.objectContaining(myBft.preCommits),
							);
							expect(blockData.preVotes).toEqual(
								expect.objectContaining(myBft.preVotes),
							);
						});
					});
				});
			});
		});
	});
});
