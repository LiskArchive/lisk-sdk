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

const { BFT } = require('../../../../../../../src/modules/chain/logic/bft');
const {
	BlockHeader: blockHeaderFixture,
} = require('../../../../../fixtures/blocks');

const { Account: accountFixture } = require('../../../../../fixtures/accounts');

const generateValidHeaders = count => {
	return [...Array(count)].map((_, index) => {
		return blockHeaderFixture({
			height: index + 1,
			maxHeightPreviouslyForged: index,
		});
	});
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
			sinonSandbox.stub(bft.headers, 'getBlockHeaderForDelegate');
		});

		describe('constructor', () => {
			it('should initialize the object correctly', async () => {
				expect(bft).an.instanceOf(BFT);
				expect(bft.ACTIVE_DELEGATES).to.be.eql(activeDelegates);
				expect(bft.PRE_VOTE_THRESHOLD).to.be.eql(prevoteThreshold);
				expect(bft.PRE_COMMIT_THRESHOLD).to.be.eql(precommitThreshold);
				expect(bft.PROCESSING_THRESHOLD).to.be.eql(processingThreshold);
				expect(bft.MAX_HEADERS).to.be.eql(maxHeaders);
			});
		});

		describe('validateBlockHeader', () => {
			it('should be ok for valid headers', async () => {
				const header = blockHeaderFixture();
				expect(BFT.validateBlockHeader(header)).to.be.true;
			});

			it('should throw error if any header is not valid format', async () => {
				let header;

				// Setting non-integer value
				header = blockHeaderFixture({ height: '1' });
				expect(() => BFT.validateBlockHeader(header)).to.throw(
					'Schema validation error'
				);

				// Setting invalid id
				header = blockHeaderFixture({ blockId: 'Al123' });
				expect(() => BFT.validateBlockHeader(header)).to.throw(
					'Schema validation error'
				);

				// Setting invalid public key;
				header = blockHeaderFixture({ delegatePublicKey: 'abdef' });
				expect(() => BFT.validateBlockHeader(header)).to.throw(
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

				expect(() => bft.verifyBlockHeaders(header)).to.throw(
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

				expect(() => bft.verifyBlockHeaders(header)).to.not.throw;
			});

			it("should return true if delegate didn't forge any block previously", async () => {
				const header = blockHeaderFixture();
				bft.headers.getBlockHeaderForDelegate.returns(null);

				expect(bft.verifyBlockHeaders(header)).to.be.true;
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

				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).to.throw(
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

				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).to.throw(
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

				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).to.throw(
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

				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(() => bft.verifyBlockHeaders(currentBlock)).to.throw(
					'Violates that delegate chooses branch with largest prevotedConfirmedUptoHeight'
				);
			});

			it('should return true if headers are valid', async () => {
				const [lastBlock, currentBlock] = generateValidHeaders(2);
				bft.headers.getBlockHeaderForDelegate.returns(lastBlock);

				expect(bft.verifyBlockHeaders(currentBlock)).to.be.true;
			});
		});

		describe('addBlockHeader', () => {
			it('should call validateBlockHeader with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				sinonSandbox.spy(BFT, 'validateBlockHeader');
				bft.addBlockHeader(header1);

				expect(BFT.validateBlockHeader).to.be.calledOnce;
				expect(BFT.validateBlockHeader).to.be.calledWith(header1);
			});

			it('should call verifyBlockHeaders with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				sinonSandbox.spy(bft, 'verifyBlockHeaders');
				bft.addBlockHeader(header1);

				expect(bft.verifyBlockHeaders).to.be.calledOnce;
				expect(bft.verifyBlockHeaders).to.be.calledWith(header1);
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
				expect(bft.headers.length).to.be.eql(2);
				expect(bft.headers.items).to.be.eql([header1, header2]);
			});

			it('should call updatePreVotesPreCommits with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				sinonSandbox.spy(bft, 'updatePreVotesPreCommits');
				bft.addBlockHeader(header1);

				expect(bft.updatePreVotesPreCommits).to.be.calledOnce;
				expect(bft.updatePreVotesPreCommits).to.be.calledWith(header1);
			});

			describe('should have proper preVotes and preCommits', () => {
				describe('11 delegates switched partially on 3rd round', () => {
					let myBft;
					const delegatesMap = {};
					const data = require('./scenarios/11_delegates_switch_on_3_round');

					it('should create the bft object', async () => {
						myBft = new BFT({
							finalizedHeight: 0,
							activeDelegates: data.activeDelegates,
						});
					});

					data.headers.forEach(headerData => {
						const delegatePublicKey =
							delegatesMap[headerData.d] || accountFixture().publicKey;
						delegatesMap[headerData.d] = delegatePublicKey;

						it(`have proper pre-votes and pre-commits when ${
							headerData.d
						} forge block at height = ${headerData.h}`, async () => {
							const blockHeader = blockHeaderFixture({
								height: headerData.h,
								maxHeightPreviouslyForged: headerData.p,
								delegatePublicKey: delegatesMap[headerData.d],
								activeSinceRound: headerData.a,
							});
							myBft.addBlockHeader(blockHeader);
							expect(Object.values(myBft.preCommits)).to.be.eql(
								headerData.commits
							);
							expect(Object.values(myBft.preVotes)).to.be.eql(headerData.votes);
						});
					});
				});
			});
		});
	});
});
