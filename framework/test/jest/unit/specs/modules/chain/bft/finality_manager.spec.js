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
		let bft;
		const finalizedHeight = 0;
		const activeDelegates = 101;
		const preVoteThreshold = 68;
		const preCommitThreshold = 68;
		const processingThreshold = 302;
		const maxHeaders = 505;

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
		});

		describe('recompute', () => {});
	});
});
