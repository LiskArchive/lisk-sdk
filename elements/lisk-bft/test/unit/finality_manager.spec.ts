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
import { createFakeDefaultAccount } from '../fixtures/accounts';
import { createFakeBlockHeader } from '../fixtures/blocks';
import { StateStoreMock } from './state_store_mock';

const generateValidHeaders = (count: number): any[] => {
	return [...Array(count)].map((_, index) => {
		return createFakeBlockHeader({
			height: index + 1,
			asset: {
				maxHeightPreviouslyForged: index,
			},
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
				timeSinceGenesis: jest.Mock;
			};
		};
		let dposStub: {
			getMinActiveHeight: jest.Mock;
			isStandbyDelegate: jest.Mock;
		};

		beforeEach(() => {
			chainStub = {
				dataAccess: {
					getBlockHeadersByHeightBetween: jest.fn(),
					getLastBlockHeader: jest.fn(),
				},
				slots: {
					getSlotNumber: jest.fn(),
					isWithinTimeslot: jest.fn(),
					timeSinceGenesis: jest.fn(),
				},
			};

			dposStub = {
				getMinActiveHeight: jest.fn(),
				isStandbyDelegate: jest.fn(),
			};

			finalityManager = new FinalityManager({
				chain: chainStub,
				dpos: dposStub,
				finalizedHeight,
				activeDelegates,
			});
		});

		describe('constructor', () => {
			it('should initialize the object correctly', () => {
				expect(finalityManager).toBeInstanceOf(FinalityManager);
				expect(finalityManager.activeDelegates).toEqual(activeDelegates);
				expect(finalityManager.preVoteThreshold).toEqual(preVoteThreshold);
				expect(finalityManager.preCommitThreshold).toEqual(preCommitThreshold);
				expect(finalityManager.processingThreshold).toEqual(
					processingThreshold,
				);
				expect(finalityManager.maxHeaders).toEqual(maxHeaders);
			});

			it('should throw error if activeDelegates is not positive', () => {
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
			it('should throw error if maxHeightPrevoted is not accurate', () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				const bftHeaders = generateValidHeaders(
					finalityManager.processingThreshold + 1,
				);

				const header = createFakeBlockHeader({
					asset: { maxHeightPrevoted: 10 },
				});

				expect.assertions(1);
				try {
					finalityManager.verifyBlockHeaders(header, bftHeaders);
				} catch (error) {
					// eslint-disable-next-line jest/no-try-expect
					expect(error.message).toContain(
						'Wrong maxHeightPrevoted in blockHeader.',
					);
				}
			});

			it('should not throw error if maxHeightPrevoted is accurate', () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				const bftHeaders = generateValidHeaders(
					finalityManager.processingThreshold + 1,
				);
				const header = createFakeBlockHeader({
					asset: { maxHeightPrevoted: 10 },
				});
				finalityManager.chainMaxHeightPrevoted = 10;

				expect(() =>
					finalityManager.verifyBlockHeaders(header, bftHeaders),
				).not.toThrow();
			});

			it("should return true if delegate didn't forge any block previously", () => {
				const header = createFakeBlockHeader();

				expect(finalityManager.verifyBlockHeaders(header, [])).toBeTruthy();
			});

			it('should throw error if same delegate forged block on different height', () => {
				const maxHeightPrevoted = 10;
				const delegateAccount = createFakeDefaultAccount();
				const lastBlock = createFakeBlockHeader({
					generatorPublicKey: delegateAccount.publicKey,
					asset: {
						maxHeightPreviouslyForged: 5,
						maxHeightPrevoted,
					},
					height: 10,
				});
				const currentBlock = createFakeBlockHeader({
					generatorPublicKey: delegateAccount.publicKey,
					asset: {
						maxHeightPrevoted,
						maxHeightPreviouslyForged: 6,
					},
					height: 9,
				});

				expect(() =>
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toThrow(BFTForkChoiceRuleError);
			});

			it('should throw error if delegate forged block on same height', () => {
				const maxHeightPreviouslyForged = 10;
				const delegateAccount = createFakeDefaultAccount();
				const lastBlock = createFakeBlockHeader({
					generatorPublicKey: delegateAccount.publicKey,
					asset: {
						maxHeightPreviouslyForged,
					},
					height: 10,
				});
				const currentBlock = createFakeBlockHeader({
					generatorPublicKey: delegateAccount.publicKey,
					asset: {
						maxHeightPreviouslyForged,
					},
					height: 10,
				});

				expect(() =>
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toThrow(BFTForkChoiceRuleError);
			});

			it('should throw error if maxHeightPreviouslyForged has wrong value', () => {
				const delegateAccount = createFakeDefaultAccount();
				const lastBlock = createFakeBlockHeader({
					generatorPublicKey: delegateAccount.publicKey,
					height: 10,
				});
				const currentBlock = createFakeBlockHeader({
					generatorPublicKey: delegateAccount.publicKey,
					asset: {
						maxHeightPreviouslyForged: 9,
					},
				});

				expect(() =>
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toThrow(BFTChainDisjointError);
			});

			it('should throw error if maxHeightPrevoted has wrong value', () => {
				const delegateAccount = createFakeDefaultAccount();
				const lastBlock = createFakeBlockHeader({
					generatorPublicKey: delegateAccount.publicKey,
					height: 9,
					asset: {
						maxHeightPrevoted: 10,
					},
				});
				const currentBlock = createFakeBlockHeader({
					generatorPublicKey: delegateAccount.publicKey,
					height: 10,
					asset: {
						maxHeightPreviouslyForged: 9,
						maxHeightPrevoted: 9,
					},
				});

				expect(() =>
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toThrow(BFTLowerChainBranchError);
			});

			it('should return true if headers are valid', () => {
				const [lastBlock, currentBlock] = generateValidHeaders(2);

				expect(
					finalityManager.verifyBlockHeaders(currentBlock, [lastBlock]),
				).toBeTruthy();
			});
		});

		describe('addBlockHeader', () => {
			let stateStore: StateStoreMock;
			let bftHeaders: ReadonlyArray<BlockHeader>;

			beforeEach(() => {
				stateStore = new StateStoreMock();
				bftHeaders = generateValidHeaders(
					finalityManager.processingThreshold + 1,
				);
				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(
					bftHeaders,
				);
			});

			it('should call verifyBlockHeaders with the provided header', async () => {
				const header1 = createFakeBlockHeader({
					height: 2,
					asset: {
						maxHeightPreviouslyForged: 0,
					},
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
				const header1 = createFakeBlockHeader({
					height: 2,
					asset: {
						maxHeightPreviouslyForged: 0,
					},
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

			it('should not update prevotes and precommits in case of a standby delegate', async () => {
				const header1 = createFakeBlockHeader({
					height: 2,
					asset: {
						maxHeightPreviouslyForged: 0,
					},
				});

				dposStub.isStandbyDelegate.mockResolvedValue(true);
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

				// Ignores a standby delegate from prevotes and precommit calculations
				await expect(
					finalityManager.updatePreVotesPreCommits(
						header1,
						stateStore,
						bftHeaders,
					),
				).resolves.toEqual(false);
			});

			it('should throw error if blockheader has conflict (Violates disjointness condition)', async () => {
				const header1 = createFakeBlockHeader({
					height: 34624,
					asset: {
						maxHeightPreviouslyForged: 34501,
					},
				});
				const header2 = createFakeBlockHeader({
					height: 34666,
					generatorPublicKey: header1.generatorPublicKey,
					asset: {
						maxHeightPreviouslyForged: 34501,
					},
				});
				const headers = [header1];
				for (
					// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
					let height = header1.height + 1;
					height < header2.height;
					height += 1
				) {
					const header = createFakeBlockHeader({
						height,
						asset: {
							maxHeightPreviouslyForged: height - 129,
						},
					});
					headers.push(header);
				}
				headers.push(header2);

				try {
					for (const header of headers) {
						await finalityManager.addBlockHeader(header, stateStore);
					}
				} catch (error) {
					// eslint-disable-next-line jest/no-try-expect
					expect(error.message).toContain(
						'Violation of disjointedness condition.',
					);
				}
			});
		});

		// eslint-disable-next-line @typescript-eslint/no-empty-function
		describe('recompute', () => {});
	});
});
