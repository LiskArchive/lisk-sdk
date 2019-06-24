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
const { SchemaValidationError } = require('../../../../../../../src/errors');
const ConsensusManagerModule = require('../../../../../../../src/modules/chain/bft/consensus_manager');
const {
	BlockHeader: blockHeaderFixture,
} = require('../../../../../../mocha/fixtures/blocks');

const {
	Account: accountFixture,
} = require('../../../../../../mocha/fixtures/accounts');

const ConsensusManager = ConsensusManagerModule.ConsensusManager;
const validateBlockHeader = ConsensusManagerModule.validateBlockHeader;

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
			activeSinceRound: parseInt(data[i][3]),
			height: parseInt(data[i][4]),
			preCommits: data[i]
				.slice(6)
				.map(Number)
				.filter(a => a !== 0),
			preVotes: data[i + 1]
				.slice(6)
				.map(Number)
				.filter(a => a !== 0),
		});
	}

	return result;
};

const delegatesMap = {};
const generateHeaderInformation = (data, threshold, lastBlockData) => {
	const delegatePublicKey =
		delegatesMap[data.delegate] || accountFixture().publicKey;
	delegatesMap[data.delegate] = delegatePublicKey;

	const beforeBlockPreVotedConfirmedHeight = lastBlockData
		? lastBlockData.preVotes.lastIndexOf(threshold) + 1
		: 0;

	const header = blockHeaderFixture({
		height: data.height,
		maxHeightPreviouslyForged: data.maxHeightPreviouslyForged,
		delegatePublicKey: delegatesMap[data.delegate],
		activeSinceRound: data.activeSinceRound,
		prevotedConfirmedUptoHeight: beforeBlockPreVotedConfirmedHeight,
	});

	const finalizedHeight = data.preCommits.lastIndexOf(threshold) + 1;

	const preVotedConfirmedHeight = data.preVotes.lastIndexOf(threshold) + 1;

	return {
		header,
		finalizedHeight,
		preVotedConfirmedHeight,
		preVotes: data.preVotes,
		preCommits: data.preCommits,
	};
};

describe('consensus_manager', () => {
	describe('ConsensusManager', () => {
		let bft;
		const finalizedHeight = 0;
		const activeDelegates = 101;
		const preVoteThreshold = 68;
		const preCommitThreshold = 68;
		const processingThreshold = 302;
		const maxHeaders = 505;

		beforeEach(async () => {
			bft = new ConsensusManager({ finalizedHeight, activeDelegates });
			jest.spyOn(bft.headers, 'top');
		});

		describe('constructor', () => {
			it('should initialize the object correctly', async () => {
				expect(bft).toBeInstanceOf(ConsensusManager);
				expect(bft.activeDelegates).toEqual(activeDelegates);
				expect(bft.preVoteThreshold).toEqual(preVoteThreshold);
				expect(bft.preCommitThreshold).toEqual(preCommitThreshold);
				expect(bft.processingThreshold).toEqual(processingThreshold);
				expect(bft.maxHeaders).toEqual(maxHeaders);
			});

			it('should throw error if finalizedHeight is not provided', async () => {
				expect(() => new ConsensusManager()).toThrow(
					'Must provide finalizedHeight'
				);
			});

			it('should throw error if activeDelegates is not provided', async () => {
				expect(() => new ConsensusManager({ finalizedHeight })).toThrow(
					'Must provide activeDelegates'
				);
			});

			it('should throw error if activeDelegates is not positive', async () => {
				expect(
					() => new ConsensusManager({ finalizedHeight, activeDelegates: 0 })
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
					'Violation of fork choice rule, delegate moved to a different chain'
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
					'Violation of fork choice rule, delegate moved to a different chain'
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
					'Violates disjointness condition'
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
					'Violates that delegate chooses branch with largest prevotedConfirmedUptoHeight'
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
				jest.spyOn(ConsensusManagerModule, 'validateBlockHeader');
				bft.addBlockHeader(header1);

				expect(
					ConsensusManagerModule.validateBlockHeader
				).toHaveBeenCalledTimes(1);
				expect(ConsensusManagerModule.validateBlockHeader).toHaveBeenCalledWith(
					header1
				);
			});

			it('should call verifyBlockHeaders with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				jest.spyOn(ConsensusManagerModule, 'validateBlockHeader');
				bft.addBlockHeader(header1);

				expect(
					ConsensusManagerModule.validateBlockHeader
				).toHaveBeenCalledTimes(1);
				expect(ConsensusManagerModule.validateBlockHeader).toHaveBeenCalledWith(
					header1
				);
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

			describe('should have proper preVotes and preCommits', () => {
				describe('11 delegates switched partially on 3rd round', () => {
					const data = loadCSVSimulationData(
						path.join(__dirname, './scenarios/11_delegates.csv')
					);
					const myBft = new ConsensusManager({
						finalizedHeight: 0,
						activeDelegates: 11,
					});

					data.forEach((headerData, index) => {
						it(`have accurate information when ${
							headerData.d
						} forge block at height = ${headerData.height}`, async () => {
							const blockData = generateHeaderInformation(
								headerData,
								myBft.preCommitThreshold,
								data[index - 1]
							);

							myBft.addBlockHeader(blockData.header);

							expect(Object.values(myBft.preCommits)).toEqual(
								blockData.preCommits
							);
							expect(Object.values(myBft.preVotes)).toEqual(blockData.preVotes);

							expect(myBft.finalizedHeight).toEqual(blockData.finalizedHeight);

							expect(myBft.prevotedConfirmedHeight).toEqual(
								blockData.preVotedConfirmedHeight
							);
						});
					});
				});

				describe('5 delegates switched completely on 3rd round', () => {
					const data = loadCSVSimulationData(
						path.join(
							__dirname,
							'./scenarios/5_delegates_switched_completely.csv'
						)
					);
					const myBft = new ConsensusManager({
						finalizedHeight: 0,
						activeDelegates: 5,
					});

					data.forEach((headerData, index) => {
						it(`have accurate information when ${
							headerData.d
						} forge block at height = ${headerData.height}`, async () => {
							const blockData = generateHeaderInformation(
								headerData,
								myBft.preCommitThreshold,
								data[index - 1]
							);

							myBft.addBlockHeader(blockData.header);

							expect(Object.values(myBft.preCommits)).toEqual(
								blockData.preCommits
							);
							expect(Object.values(myBft.preVotes)).toEqual(blockData.preVotes);

							expect(myBft.finalizedHeight).toEqual(blockData.finalizedHeight);

							expect(myBft.prevotedConfirmedHeight).toEqual(
								blockData.preVotedConfirmedHeight
							);
						});
					});
				});
			});
		});

		describe('recompute', () => {
			it('should have accurate information after recompute', async () => {
				// Let's first compute in proper way

				const data = loadCSVSimulationData(
					path.join(__dirname, './scenarios/11_delegates.csv')
				);
				let blockData;
				const myBft = new ConsensusManager({
					finalizedHeight: 0,
					activeDelegates: 11,
				});

				data.forEach((headerData, index) => {
					blockData = generateHeaderInformation(
						headerData,
						myBft.preCommitThreshold,
						data[index - 1]
					);
					myBft.addBlockHeader(blockData.header);
				});

				// Values should match with expectations
				expect(Object.values(myBft.preCommits)).toEqual(blockData.preCommits);
				expect(Object.values(myBft.preVotes)).toEqual(blockData.preVotes);
				expect(myBft.finalizedHeight).toEqual(blockData.finalizedHeight);
				expect(myBft.prevotedConfirmedHeight).toEqual(
					blockData.preVotedConfirmedHeight
				);

				// Now recompute all information again
				myBft.recompute();

				// Values should match with expectations
				expect(Object.values(myBft.preCommits)).toEqual(blockData.preCommits);
				expect(Object.values(myBft.preVotes)).toEqual(blockData.preVotes);
				expect(myBft.finalizedHeight).toEqual(blockData.finalizedHeight);
				expect(myBft.prevotedConfirmedHeight).toEqual(
					blockData.preVotedConfirmedHeight
				);
			});
		});
	});

	describe('validateBlockHeader', () => {
		it('should be ok for valid headers', async () => {
			const header = blockHeaderFixture();
			expect(validateBlockHeader(header)).toBeTruthy();
		});

		it('should throw error if any header is not valid format', async () => {
			let header;

			// Setting non-integer value
			header = blockHeaderFixture({ height: '1' });
			expect(() => validateBlockHeader(header)).toThrow(SchemaValidationError);

			// Setting invalid id
			header = blockHeaderFixture({ blockId: 'Al123' });
			expect(() => validateBlockHeader(header)).toThrow(SchemaValidationError);

			// Setting invalid public key;
			header = blockHeaderFixture({ delegatePublicKey: 'abdef' });
			expect(() => validateBlockHeader(header)).toThrow(SchemaValidationError);
		});
	});
});
