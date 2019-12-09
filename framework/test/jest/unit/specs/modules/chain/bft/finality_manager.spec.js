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

describe('finality_manager', () => {
	describe('FinalityManager', () => {
		let finalityManager;
		const finalizedHeight = 0;
		const activeDelegates = 101;
		const preVoteThreshold = 68;
		const preCommitThreshold = 68;
		const processingThreshold = 302;
		const maxHeaders = 505;

		beforeEach(async () => {
			finalityManager = new FinalityManager({
				finalizedHeight,
				activeDelegates,
			});
			jest.spyOn(finalityManager.headers, 'top');
		});

		describe('constructor', () => {
			it('should initialize the object correctly', async () => {
				expect(finalityManager).toBeInstanceOf(FinalityManager);
				expect(finalityManager.activeDelegates).toEqual(activeDelegates);
				expect(finalityManager.preVoteThreshold).toEqual(preVoteThreshold);
				expect(finalityManager.preCommitThreshold).toEqual(preCommitThreshold);
				expect(finalityManager.processingThreshold).toEqual(
					processingThreshold,
				);
				expect(finalityManager.maxHeaders).toEqual(maxHeaders);
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
			it('should throw error if maxHeightPrevoted is not accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				generateValidHeaders(finalityManager.processingThreshold + 1).forEach(
					header => {
						finalityManager.headers.add(header);
					},
				);
				const header = blockHeaderFixture({ maxHeightPrevoted: 10 });

				expect(() => finalityManager.verifyBlockHeaders(header)).toThrow(
					BFTInvalidAttributeError,
					'Wrong prevotedConfirmedHeight in blockHeader.',
				);
			});

			it('should not throw error if maxHeightPrevoted is accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				generateValidHeaders(finalityManager.processingThreshold + 1).forEach(
					header => {
						finalityManager.headers.add(header);
					},
				);
				const header = blockHeaderFixture({ maxHeightPrevoted: 10 });
				finalityManager.prevotedConfirmedHeight = 10;

				expect(() => finalityManager.verifyBlockHeaders(header)).not.toThrow();
			});

			it("should return true if delegate didn't forge any block previously", async () => {
				const header = blockHeaderFixture();
				finalityManager.headers.top.mockReturnValue([]);

				expect(finalityManager.verifyBlockHeaders(header)).toBeTruthy();
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

				finalityManager.headers.top.mockReturnValue([lastBlock]);

				expect(() => finalityManager.verifyBlockHeaders(currentBlock)).toThrow(
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

				finalityManager.headers.top.mockReturnValue([lastBlock]);

				expect(() => finalityManager.verifyBlockHeaders(currentBlock)).toThrow(
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

				finalityManager.headers.top.mockReturnValue([lastBlock]);

				expect(() => finalityManager.verifyBlockHeaders(currentBlock)).toThrow(
					BFTChainDisjointError,
				);
			});

			it('should throw error if maxHeightPrevoted has wrong value', async () => {
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					maxHeightPrevoted: 10,
					height: 9,
				});
				const currentBlock = blockHeaderFixture({
					delegatePublicKey: delegateAccount.publicKey,
					maxHeightPrevoted: 9,
					maxHeightPreviouslyForged: 9,
					height: 10,
				});

				finalityManager.headers.top.mockReturnValue([lastBlock]);

				expect(() => finalityManager.verifyBlockHeaders(currentBlock)).toThrow(
					BFTLowerChainBranchError,
				);
			});

			it('should return true if headers are valid', async () => {
				const [lastBlock, currentBlock] = generateValidHeaders(2);
				finalityManager.headers.top.mockReturnValue([lastBlock]);

				expect(finalityManager.verifyBlockHeaders(currentBlock)).toBeTruthy();
			});
		});

		describe('addBlockHeader', () => {
			it('should call validateBlockHeader with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				// jest.spyOn(finalityManager, 'validateBlockHeader');
				finalityManager.addBlockHeader(header1);

				expect(utils.validateBlockHeader).toHaveBeenCalledTimes(1);
				expect(utils.validateBlockHeader).toHaveBeenCalledWith(header1);
			});

			it('should call verifyBlockHeaders with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				// jest.spyOn(finalityManager, 'validateBlockHeader');
				finalityManager.addBlockHeader(header1);

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
				finalityManager.addBlockHeader(header1).addBlockHeader(header2);
				expect(finalityManager.headers).toHaveLength(2);
				expect(finalityManager.headers.items).toEqual([header1, header2]);
			});

			it('should call updatePreVotesPreCommits with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 1,
					maxHeightPreviouslyForged: 0,
				});
				jest.spyOn(finalityManager, 'updatePreVotesPreCommits');
				finalityManager.addBlockHeader(header1);

				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledTimes(
					1,
				);
				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledWith(
					header1,
				);
			});
		});

		describe('recompute', () => {});
	});
});
