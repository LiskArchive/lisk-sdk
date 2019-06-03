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

const { BFT } = require('../../../../../../../../src/modules/chain/logic/bft');
const {
	BlockHeader: blockHeaderFixture,
} = require('../../../../../../../mocha/fixtures/blocks');

const {
	Account: accountFixture,
} = require('../../../../../../../mocha/fixtures/accounts');

const generateValidHeaders = count => {
	return [...Array(count)].map((_, index) => {
		return blockHeaderFixture({
			height: index + 1,
			maxHeightPreviouslyForged: index,
		});
	});
};

const delegatesMap = {};
const generateHeaderInformation = (data, threshold, lastBlockData) => {
	const delegatePublicKey = delegatesMap[data.d] || accountFixture().publicKey;
	delegatesMap[data.d] = delegatePublicKey;

	const beforeBlockPreVotedConfirmedHeight = lastBlockData
		? lastBlockData.votes.lastIndexOf(threshold) + 1
		: 0;

	const header = blockHeaderFixture({
		height: data.h,
		maxHeightPreviouslyForged: data.p,
		delegatePublicKey: delegatesMap[data.d],
		activeSinceRound: data.a,
		prevotedConfirmedUptoHeight: beforeBlockPreVotedConfirmedHeight,
	});

	const finalizedHeight = data.commits.lastIndexOf(threshold) + 1;

	const preVotedConfirmedHeight = data.votes.lastIndexOf(threshold) + 1;

	return {
		header,
		finalizedHeight,
		preVotedConfirmedHeight,
		preVotes: data.votes,
		preCommits: data.commits,
	};
};

describe('bft', () => {
	describe('BFT', () => {
		let bft;
		const finalizedHeight = 0;
		const activeDelegates = 101;
		const prevoteThreshold = 68;
		const precommitThreshold = 68;
		const processingThreshold = 302;
		const maxHeaders = 505;

		beforeEach(async () => {
			bft = new BFT({ finalizedHeight, activeDelegates });
			jest.spyOn(bft.headers, 'getBlockHeaderForDelegate');
		});

		describe('constructor', () => {
			it('should initialize the object correctly', async () => {
				expect(bft).toBeInstanceOf(BFT);
				expect(bft.ACTIVE_DELEGATES).toEqual(activeDelegates);
				expect(bft.PRE_VOTE_THRESHOLD).toEqual(prevoteThreshold);
				expect(bft.PRE_COMMIT_THRESHOLD).toEqual(precommitThreshold);
				expect(bft.PROCESSING_THRESHOLD).toEqual(processingThreshold);
				expect(bft.MAX_HEADERS).toEqual(maxHeaders);
			});
		});

		describe('validateBlockHeader', () => {
			it('should be ok for valid headers', async () => {
				const header = blockHeaderFixture();
				expect(BFT.validateBlockHeader(header)).toBeTruthy();
			});

			it('should throw error if any header is not valid format', async () => {
				let header;

				// Setting non-integer value
				header = blockHeaderFixture({ height: '1' });
				expect(() => BFT.validateBlockHeader(header)).toThrow(
					'Schema validation error'
				);

				// Setting invalid id
				header = blockHeaderFixture({ blockId: 'Al123' });
				expect(() => BFT.validateBlockHeader(header)).toThrow(
					'Schema validation error'
				);

				// Setting invalid public key;
				header = blockHeaderFixture({ delegatePublicKey: 'abdef' });
				expect(() => BFT.validateBlockHeader(header)).toThrow(
					'Schema validation error'
				);
			});
		});

		describe('verifyBlockHeaders', () => {
			it('should throw error if prevotedConfirmedUptoHeight is not accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				generateValidHeaders(bft.PROCESSING_THRESHOLD + 1).forEach(header => {
					bft.headers.add(header);
				});
				const header = blockHeaderFixture({ prevotedConfirmedUptoHeight: 10 });

				expect(() => bft.verifyBlockHeaders(header)).toThrow(
					'Wrong provtedConfirmedHeight in blockHeader.'
				);
			});

			it('should not throw error if prevotedConfirmedUptoHeight is accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				generateValidHeaders(bft.PROCESSING_THRESHOLD + 1).forEach(header => {
					bft.headers.add(header);
				});
				const header = blockHeaderFixture({ prevotedConfirmedUptoHeight: 10 });
				bft.prevotedConfirmedHeight = 10;

				expect(() => bft.verifyBlockHeaders(header)).not.toThrow();
			});

			it("should return true if delegate didn't forge any block previously", async () => {
				const header = blockHeaderFixture();
				bft.headers.getBlockHeaderForDelegate.mockReturnValue(null);

				expect(bft.verifyBlockHeaders(header)).toBeTruthy();
			});

			it('should throw error if delegate forged block on different height', async () => {
				const maxHeightPreviouslyForged = 10;
				const lastBlock = blockHeaderFixture({
					maxHeightPreviouslyForged,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					maxHeightPreviouslyForged,
					height: 9,
				});

				bft.headers.getBlockHeaderForDelegate.mockReturnValue(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).toThrow(
					'Violation of fork choice rule, delegate moved to different chain'
				);
			});

			it('should throw error if delegate forged block on same height', async () => {
				const maxHeightPreviouslyForged = 10;
				const lastBlock = blockHeaderFixture({
					maxHeightPreviouslyForged,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					maxHeightPreviouslyForged,
					height: 10,
				});

				bft.headers.getBlockHeaderForDelegate.mockReturnValue(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).toThrow(
					'Violation of fork choice rule, delegate moved to different chain'
				);
			});

			it('should throw error if maxHeightPreviouslyForged has wrong value', async () => {
				const lastBlock = blockHeaderFixture({
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					maxHeightPreviouslyForged: 9,
				});

				bft.headers.getBlockHeaderForDelegate.mockReturnValue(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).toThrow(
					'Violates disjointness condition'
				);
			});

			it('should throw error if prevotedConfirmedUptoHeight has wrong value', async () => {
				const lastBlock = blockHeaderFixture({
					prevotedConfirmedUptoHeight: 10,
					height: 9,
				});
				const currentBlock = blockHeaderFixture({
					prevotedConfirmedUptoHeight: 9,
					maxHeightPreviouslyForged: 9,
					height: 10,
				});

				bft.headers.getBlockHeaderForDelegate.mockReturnValue(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).toThrow(
					'Violates that delegate chooses branch with largest prevotedConfirmedUptoHeight'
				);
			});

			it('should return true if headers are valid', async () => {
				const [lastBlock, currentBlock] = generateValidHeaders(2);
				bft.headers.getBlockHeaderForDelegate.mockReturnValue(lastBlock);

				expect(bft.verifyBlockHeaders(currentBlock)).toBeTruthy();
			});
		});

		describe('addBlockHeader', () => {
			it('should call validateBlockHeader with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				jest.spyOn(BFT, 'validateBlockHeader');
				bft.addBlockHeader(header1);

				expect(BFT.validateBlockHeader).toHaveBeenCalledTimes(1);
				expect(BFT.validateBlockHeader).toHaveBeenCalledWith(header1);
			});

			it('should call verifyBlockHeaders with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				jest.spyOn(BFT, 'validateBlockHeader');
				bft.addBlockHeader(header1);

				expect(BFT.validateBlockHeader).toHaveBeenCalledTimes(1);
				expect(BFT.validateBlockHeader).toHaveBeenCalledWith(header1);
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
					const data = require('./scenarios/11_delegates_switch_on_3_round');
					const myBft = new BFT({
						finalizedHeight: 0,
						activeDelegates: data.activeDelegates,
					});

					data.headers.forEach((headerData, index) => {
						it(`have accurate information when ${
							headerData.d
						} forge block at height = ${headerData.h}`, async () => {
							const blockData = generateHeaderInformation(
								headerData,
								myBft.PRE_COMMIT_THRESHOLD,
								data.headers[index - 1]
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

				const data = require('./scenarios/11_delegates_switch_on_3_round');
				let blockData;
				const myBft = new BFT({
					finalizedHeight: 0,
					activeDelegates: data.activeDelegates,
				});

				data.headers.forEach((headerData, index) => {
					blockData = generateHeaderInformation(
						headerData,
						myBft.PRE_COMMIT_THRESHOLD,
						data.headers[index - 1]
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
});
