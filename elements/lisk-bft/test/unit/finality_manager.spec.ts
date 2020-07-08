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

import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes, getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {
	FinalityManager,
	CONSENSUS_STATE_DELEGATE_LEDGER_KEY,
	BFTVotingLedgerSchema,
} from '../../src/finality_manager';
import {
	BFTChainDisjointError,
	BFTForkChoiceRuleError,
	BFTLowerChainBranchError,
	BlockHeader,
} from '../../src/types';
import { createFakeBlockHeader } from '../fixtures/blocks';
import { StateStoreMock } from '../utils/state_store_mock';
import { CONSENSUS_STATE_FINALIZED_HEIGHT_KEY, BFTFinalizedHeightCodecSchema } from '../../src';

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
		let dposStub: {
			getMinActiveHeight: jest.Mock;
			isStandbyDelegate: jest.Mock;
			isBootstrapPeriod: jest.Mock;
		};

		beforeEach(() => {
			dposStub = {
				getMinActiveHeight: jest.fn(),
				isStandbyDelegate: jest.fn(),
				isBootstrapPeriod: jest.fn().mockReturnValue(false),
			};

			finalityManager = new FinalityManager({
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
				expect(finalityManager.processingThreshold).toEqual(processingThreshold);
				expect(finalityManager.maxHeaders).toEqual(maxHeaders);
			});

			it('should throw error if activeDelegates is not positive', () => {
				expect(
					() =>
						new FinalityManager({
							dpos: dposStub,
							finalizedHeight,
							activeDelegates: 0,
						}),
				).toThrow('Must provide a positive activeDelegates');
			});
		});

		describe('verifyBlockHeaders', () => {
			let stateStore: StateStoreMock;

			it('should throw error if maxHeightPrevoted is not accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				const bftHeaders = generateValidHeaders(finalityManager.processingThreshold + 1);

				stateStore = new StateStoreMock([], {}, { lastBlockHeaders: bftHeaders });

				const header = createFakeBlockHeader({
					asset: { maxHeightPrevoted: 10 },
				});

				expect.assertions(1);
				try {
					await finalityManager.verifyBlockHeaders(header, stateStore);
				} catch (error) {
					// eslint-disable-next-line jest/no-try-expect
					expect(error.message).toContain('Wrong maxHeightPrevoted in blockHeader.');
				}
			});

			it('should not throw error if maxHeightPrevoted is accurate', async () => {
				// Add the header directly to list so verifyBlockHeaders can be validated against it
				const bftHeaders = generateValidHeaders(finalityManager.processingThreshold + 1);
				const header = createFakeBlockHeader({
					asset: { maxHeightPrevoted: 10 },
				});
				const delegateLedger = {
					delegates: [
						{
							address: getAddressFromPublicKey(header.generatorPublicKey),
							maxPreVoteHeight: 1,
							maxPreCommitHeight: 0,
						},
					],
					ledger: [
						{
							height: 10,
							preVotes: 69,
							preCommits: 0,
						},
					],
				};
				stateStore = new StateStoreMock(
					[],
					{
						[CONSENSUS_STATE_DELEGATE_LEDGER_KEY]: codec.encode(
							BFTVotingLedgerSchema,
							delegateLedger,
						),
					},
					{ lastBlockHeaders: bftHeaders },
				);

				await expect(finalityManager.verifyBlockHeaders(header, stateStore)).resolves.toBeTrue();
			});

			it("should return true if delegate didn't forge any block previously", async () => {
				const header = createFakeBlockHeader();
				stateStore = new StateStoreMock([], {}, { lastBlockHeaders: [] });

				await expect(finalityManager.verifyBlockHeaders(header, stateStore)).resolves.toBeTruthy();
			});

			it('should throw error if same delegate forged block on different height', async () => {
				const maxHeightPrevoted = 10;
				const generatorPublicKey = getRandomBytes(32);
				const lastBlock = createFakeBlockHeader({
					generatorPublicKey,
					asset: {
						maxHeightPreviouslyForged: 5,
						maxHeightPrevoted,
					},
					height: 10,
				});
				const currentBlock = createFakeBlockHeader({
					generatorPublicKey,
					asset: {
						maxHeightPrevoted,
						maxHeightPreviouslyForged: 6,
					},
					height: 9,
				});

				stateStore = new StateStoreMock([], {}, { lastBlockHeaders: [lastBlock] });

				await expect(finalityManager.verifyBlockHeaders(currentBlock, stateStore)).rejects.toThrow(
					BFTForkChoiceRuleError,
				);
			});

			it('should throw error if delegate forged block on same height', async () => {
				const maxHeightPreviouslyForged = 10;
				const generatorPublicKey = getRandomBytes(32);
				const lastBlock = createFakeBlockHeader({
					generatorPublicKey,
					asset: {
						maxHeightPreviouslyForged,
					},
					height: 10,
				});
				const currentBlock = createFakeBlockHeader({
					generatorPublicKey,
					asset: {
						maxHeightPreviouslyForged,
					},
					height: 10,
				});
				stateStore = new StateStoreMock([], {}, { lastBlockHeaders: [lastBlock] });

				await expect(finalityManager.verifyBlockHeaders(currentBlock, stateStore)).rejects.toThrow(
					BFTForkChoiceRuleError,
				);
			});

			it('should throw error if maxHeightPreviouslyForged has wrong value', async () => {
				const generatorPublicKey = getRandomBytes(32);
				const lastBlock = createFakeBlockHeader({
					generatorPublicKey,
					height: 10,
				});
				const currentBlock = createFakeBlockHeader({
					generatorPublicKey,
					asset: {
						maxHeightPreviouslyForged: 9,
					},
				});

				stateStore = new StateStoreMock([], {}, { lastBlockHeaders: [lastBlock] });

				await expect(finalityManager.verifyBlockHeaders(currentBlock, stateStore)).rejects.toThrow(
					BFTChainDisjointError,
				);
			});

			it('should throw error if maxHeightPrevoted has wrong value', async () => {
				const generatorPublicKey = getRandomBytes(32);
				const lastBlock = createFakeBlockHeader({
					generatorPublicKey,
					height: 9,
					asset: {
						maxHeightPrevoted: 10,
					},
				});
				const currentBlock = createFakeBlockHeader({
					generatorPublicKey,
					height: 10,
					asset: {
						maxHeightPreviouslyForged: 9,
						maxHeightPrevoted: 9,
					},
				});

				stateStore = new StateStoreMock([], {}, { lastBlockHeaders: [lastBlock] });

				await expect(finalityManager.verifyBlockHeaders(currentBlock, stateStore)).rejects.toThrow(
					BFTLowerChainBranchError,
				);
			});

			it('should return true if headers are valid', async () => {
				const [lastBlock, currentBlock] = generateValidHeaders(2);
				stateStore = new StateStoreMock([], {}, { lastBlockHeaders: [lastBlock] });

				await expect(
					finalityManager.verifyBlockHeaders(currentBlock, stateStore),
				).resolves.toBeTruthy();
			});
		});

		describe('addBlockHeader', () => {
			const delegateLedger = {
				delegates: [],
				ledger: [],
			};
			let stateStore: StateStoreMock;
			let bftHeaders: ReadonlyArray<BlockHeader>;

			beforeEach(() => {
				bftHeaders = generateValidHeaders(finalityManager.processingThreshold + 1);
				stateStore = new StateStoreMock(
					[],
					{
						[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: codec.encode(BFTFinalizedHeightCodecSchema, {
							finalizedHeight: 5,
						}),
						[CONSENSUS_STATE_DELEGATE_LEDGER_KEY]: codec.encode(
							BFTVotingLedgerSchema,
							delegateLedger,
						),
					},
					{ lastBlockHeaders: bftHeaders },
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
				expect(finalityManager.verifyBlockHeaders).toHaveBeenCalledWith(header1, stateStore);
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

				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledTimes(1);
				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledWith(
					header1,
					stateStore,
					bftHeaders,
				);
			});

			it('should not update prevotes and precommits in case of within bootstrap period', async () => {
				const header1 = createFakeBlockHeader({
					height: 2,
					asset: {
						maxHeightPreviouslyForged: 0,
					},
				});

				dposStub.isBootstrapPeriod.mockResolvedValue(true);
				jest.spyOn(finalityManager, 'updatePreVotesPreCommits');
				await finalityManager.addBlockHeader(header1, stateStore);

				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledTimes(1);
				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledWith(
					header1,
					stateStore,
					bftHeaders,
				);

				// Ignores a standby delegate from prevotes and precommit calculations
				await expect(
					finalityManager.updatePreVotesPreCommits(header1, stateStore, bftHeaders),
				).resolves.toEqual(false);
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

				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledTimes(1);
				expect(finalityManager.updatePreVotesPreCommits).toHaveBeenCalledWith(
					header1,
					stateStore,
					bftHeaders,
				);

				// Ignores a standby delegate from prevotes and precommit calculations
				await expect(
					finalityManager.updatePreVotesPreCommits(header1, stateStore, bftHeaders),
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
					expect(error.message).toContain('Violation of disjointedness condition.');
				}
			});
		});
	});
});
