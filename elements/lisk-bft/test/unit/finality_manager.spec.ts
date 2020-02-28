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

import { FinalityManager } from '../../src/finality_manager';
import {
	BFTChainDisjointError,
	BFTForkChoiceRuleError,
	BFTLowerChainBranchError,
	BlockHeader,
} from '../../src/types';
import { Account as accountFixture } from '../fixtures/accounts';
import { BlockHeader as blockHeaderFixture } from '../fixtures/blocks';
import { StateStoreMock } from './state_store_mock';

const generateValidHeaders = (count: number) => {
	return [...Array(count)].map((_, index) => {
		return blockHeaderFixture({
			height: index + 1,
			maxHeightPreviouslyForged: index,
		});
	});
};

describe('finality_manager', () => {
	describe('FinalityManager', () => {
		const finalizedHeight = 0;
		const activeDelegates = 101;
		const preVoteThreshold = 68;
		const preCommitThreshold = 68;
		const processingThreshold = 302;
		const maxHeaders = 505;

		let finalityManager: FinalityManager;
		let chainStub: {
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.Mock;
				getLastBlockHeader: jest.Mock;
			};
			slots: {
				getSlotNumber: jest.Mock;
				isWithinTimeslot: jest.Mock;
				getEpochTime: jest.Mock;
			};
		};
		let dposStub: {
			getMinActiveHeight: jest.Mock;
		};

		beforeEach(async () => {
			chainStub = {
				dataAccess: {
					getBlockHeadersByHeightBetween: jest.fn(),
					getLastBlockHeader: jest.fn(),
				},
				slots: {
					getSlotNumber: jest.fn(),
					isWithinTimeslot: jest.fn(),
					getEpochTime: jest.fn(),
				},
			};

			dposStub = {
				getMinActiveHeight: jest.fn(),
			};

			finalityManager = new FinalityManager({
				chain: chainStub,
				dpos: dposStub,
				finalizedHeight,
				activeDelegates,
			});
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

			it('should throw error if activeDelegates is not positive', async () => {
				expect(
					() =>
						new FinalityManager({
							chain: chainStub,
							dpos: dposStub,
							finalizedHeight,
							activeDelegates: 0,
						}),
				).toThrow('Must provide a positive activeDelegates');
			});
		});

		describe('verifyBlockHeaders', () => {
			it('should throw error if maxHeightPrevoted is not accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				const bftHeaders = generateValidHeaders(
					finalityManager.processingThreshold + 1,
				);

				const header = blockHeaderFixture({ maxHeightPrevoted: 10 });

				expect.assertions(1);
				try {
					finalityManager.verifyBlockHeaders(header, bftHeaders);
				} catch (error) {
					expect(error.message).toContain(
						'Wrong maxHeightPrevoted in blockHeader.',
					);
				}
			});

			it('should not throw error if maxHeightPrevoted is accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				const bftHeaders = generateValidHeaders(
					finalityManager.processingThreshold + 1,
				);
				const header = blockHeaderFixture({ maxHeightPrevoted: 10 });
				finalityManager.chainMaxHeightPrevoted = 10;

				expect(() =>
					finalityManager.verifyBlockHeaders(header, bftHeaders),
				).not.toThrow();
			});

			it("should return true if delegate didn't forge any block previously", async () => {
				const header = blockHeaderFixture();

				expect(finalityManager.verifyBlockHeaders(header, [])).toBeTruthy();
			});

			it('should throw error if same delegate forged block on different height', async () => {
				const maxHeightPrevoted = 10;
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					generatorPublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged: 5,
					maxHeightPrevoted,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					generatorPublicKey: delegateAccount.publicKey,
					maxHeightPrevoted,
					maxHeightPreviouslyForged: 6,
					height: 9,
				});

				expect(() =>
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toThrow(BFTForkChoiceRuleError);
			});

			it('should throw error if delegate forged block on same height', async () => {
				const maxHeightPreviouslyForged = 10;
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					generatorPublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					generatorPublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged,
					height: 10,
				});

				expect(() =>
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toThrow(BFTForkChoiceRuleError);
			});

			it('should throw error if maxHeightPreviouslyForged has wrong value', async () => {
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					generatorPublicKey: delegateAccount.publicKey,
					height: 10,
				});
				const currentBlock = blockHeaderFixture({
					generatorPublicKey: delegateAccount.publicKey,
					maxHeightPreviouslyForged: 9,
				});

				expect(() =>
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toThrow(BFTChainDisjointError);
			});

			it('should throw error if maxHeightPrevoted has wrong value', async () => {
				const delegateAccount = accountFixture();
				const lastBlock = blockHeaderFixture({
					generatorPublicKey: delegateAccount.publicKey,
					maxHeightPrevoted: 10,
					height: 9,
				});
				const currentBlock = blockHeaderFixture({
					generatorPublicKey: delegateAccount.publicKey,
					maxHeightPrevoted: 9,
					maxHeightPreviouslyForged: 9,
					height: 10,
				});

				expect(() =>
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toThrow(BFTLowerChainBranchError);
			});

			it('should return true if headers are valid', async () => {
				const [lastBlock, currentBlock] = generateValidHeaders(2);

				expect(
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toBeTruthy();
			});
		});

		describe('addBlockHeader', () => {
			let stateStore: StateStoreMock;
			let bftHeaders: ReadonlyArray<BlockHeader>;

			beforeEach(async () => {
				stateStore = new StateStoreMock();
				bftHeaders = generateValidHeaders(
					finalityManager.processingThreshold + 1,
				);
				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(
					bftHeaders,
				);
			});

			it('should call validateBlockHeader with the provided header', async () => {
				await expect(
					finalityManager.addBlockHeader({} as BlockHeader, stateStore),
				).rejects.toThrow('should have required property');
			});

			it('should call verifyBlockHeaders with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 2,
					maxHeightPreviouslyForged: 0,
				});
				jest.spyOn(finalityManager, 'verifyBlockHeaders');
				await finalityManager.addBlockHeader(header1, stateStore);

				expect(finalityManager.verifyBlockHeaders).toHaveBeenCalledTimes(1);
				expect(finalityManager.verifyBlockHeaders).toHaveBeenCalledWith(
					header1,
					bftHeaders,
				);
			});

			it('should call updatePreVotesPreCommits with the provided header', async () => {
				const header1 = blockHeaderFixture({
					height: 2,
					maxHeightPreviouslyForged: 0,
				});
				jest.spyOn(finalityManager, 'updatePreVotesPreCommits');
				await finalityManager.addBlockHeader(header1, stateStore);

				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledTimes(
					1,
				);
				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledWith(
					header1,
					stateStore,
					bftHeaders,
				);
			});

			it('should throw error if blockheader has conflict (Violates disjointness condition)', async () => {
				const header1 = blockHeaderFixture({
					height: 34624,
					maxHeightPreviouslyForged: 34501,
				});
				const header2 = blockHeaderFixture({
					height: 34666,
					maxHeightPreviouslyForged: 34501,
					generatorPublicKey: header1.generatorPublicKey,
				});
				const headers = [header1];
				for (
					let height = header1.height + 1;
					height < header2.height;
					height += 1
				) {
					const header = blockHeaderFixture({
						height,
						maxHeightPreviouslyForged: height - 129,
					});
					headers.push(header);
				}
				headers.push(header2);

				try {
					for (const header of headers) {
						await finalityManager.addBlockHeader(header, stateStore);
					}
				} catch (error) {
					expect(error.message).toContain(
						'Violation of disjointness condition.',
					);
				}
			});
		});

		describe('recompute', () => {});
	});
});
