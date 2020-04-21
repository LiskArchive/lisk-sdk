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

import { BlockHeader as blockFixture } from '../fixtures/blocks';
import { FinalityManager } from '../../src/finality_manager';

import { BFT, CONSENSUS_STATE_FINALIZED_HEIGHT_KEY } from '../../src';
import { BlockHeader, Chain, DPoS } from '../../src/types';
import { StateStoreMock } from './state_store_mock';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const extractBFTInfo = (bft: BFT) => ({
	finalizedHeight: bft.finalizedHeight,
	maxHeightPrevoted: bft.maxHeightPrevoted,
	preVotes: { ...(bft.finalityManager as any).preVotes },
	preCommits: { ...(bft.finalityManager as any).preCommits },
	state: { ...(bft.finalityManager as any).state },
});

const generateBlocks = ({
	startHeight,
	numberOfBlocks,
}: {
	readonly startHeight: number;
	readonly numberOfBlocks: number;
}): BlockHeader[] => {
	return new Array(numberOfBlocks).fill(0).map((_v, index) => {
		const height = startHeight + index;
		return blockFixture({ height, version: 2 });
	});
};

describe('bft', () => {
	describe('BFT', () => {
		let activeDelegates: number;
		let startingHeight: number;
		let bftParams: {
			readonly chain: Chain;
			readonly dpos: DPoS;
			readonly activeDelegates: number;
			readonly startingHeight: number;
		};

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
			isStandbyDelegate: jest.Mock;
		};
		let lastBlock: BlockHeader;

		beforeEach(() => {
			lastBlock = blockFixture({ height: 1, version: 2 });
			chainStub = {
				dataAccess: {
					getBlockHeadersByHeightBetween: jest
						.fn()
						.mockResolvedValue([lastBlock]),
					getLastBlockHeader: jest.fn().mockResolvedValue(lastBlock),
				},
				slots: {
					getSlotNumber: jest.fn(),
					isWithinTimeslot: jest.fn(),
					getEpochTime: jest.fn(),
				},
			};

			dposStub = {
				getMinActiveHeight: jest.fn(),
				isStandbyDelegate: jest.fn(),
			};
			activeDelegates = 101;
			startingHeight = 0;
			bftParams = {
				chain: chainStub,
				dpos: dposStub,
				activeDelegates,
				startingHeight,
			};
		});

		describe('#constructor', () => {
			it('should create instance of BFT', () => {
				expect(new BFT(bftParams)).toBeInstanceOf(BFT);
			});

			it('should assign all parameters correctly', () => {
				const bft = new BFT(bftParams);

				expect(bft.finalityManager).toBeUndefined();
				expect((bft as any)._chain).toBe(chainStub);
				expect((bft as any)._dpos).toBe(dposStub);
				expect(bft.constants).toEqual({ activeDelegates, startingHeight });
			});
		});

		describe('#init', () => {
			it('should initialize finality manager', async () => {
				const stateStore = new StateStoreMock();
				const bft = new BFT(bftParams);

				await bft.init(stateStore);

				expect(bft.finalityManager).toBeInstanceOf(FinalityManager);
			});

			it('should recompute the properties to the last block', async () => {
				const stateStore = new StateStoreMock();
				const bft = new BFT(bftParams);

				await bft.init(stateStore);

				expect(chainStub.dataAccess.getLastBlockHeader).toHaveBeenCalledTimes(
					1,
				);
				expect(
					chainStub.dataAccess.getBlockHeadersByHeightBetween,
				).toHaveBeenCalledTimes(1);
				expect(
					chainStub.dataAccess.getBlockHeadersByHeightBetween,
				).toHaveBeenCalledWith(1, 1);
			});

			it('should set the finality height to the value from chain state', async () => {
				const finalizedHeight = 5;
				const stateStore = new StateStoreMock({
					[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: String(finalizedHeight),
				});
				const bft = new BFT(bftParams);

				await bft.init(stateStore);

				expect(bft.finalizedHeight).toEqual(finalizedHeight);
			});
		});

		describe('#addNewBlock', () => {
			const block1 = blockFixture({ height: 2, version: 2 });
			const lastFinalizedHeight = String('5');

			let bft: BFT;
			let stateStore: StateStoreMock;

			beforeEach(async () => {
				stateStore = new StateStoreMock({
					[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: lastFinalizedHeight,
				});
				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue([
					blockFixture({ height: 1, version: 2 }),
				]);
				bft = new BFT(bftParams);
				await bft.init(stateStore);
			});

			describe('when valid block which does not change the finality is added', () => {
				it('should update the latest finalized height to storage', async () => {
					await bft.addNewBlock(block1, stateStore);
					const finalizedHeight = await stateStore.consensus.get(
						CONSENSUS_STATE_FINALIZED_HEIGHT_KEY,
					);

					expect(finalizedHeight).toEqual(lastFinalizedHeight);
				});
			});
		});

		describe('#deleteBlocks', () => {
			let bft: BFT;
			let stateStore: StateStoreMock;

			beforeEach(async () => {
				stateStore = new StateStoreMock({
					[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: '1',
				});
				bft = new BFT(bftParams);
				await bft.init(stateStore);
			});

			it('should reject with error if no blocks are provided', async () => {
				// Act & Assert
				await expect((bft as any).deleteBlocks()).rejects.toThrow(
					'Must provide blocks which are deleted',
				);
			});

			it('should reject with error if blocks are not provided as array', async () => {
				// Act & Assert
				await expect((bft as any).deleteBlocks({})).rejects.toThrow(
					'Must provide list of blocks',
				);
			});

			it('should reject with error if blocks deleted contains block with lower than finalized height', async () => {
				// Arrange
				bft = new BFT(bftParams);
				stateStore = new StateStoreMock({
					[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: '5',
				});

				await bft.init(stateStore);
				const blocks = [
					blockFixture({ height: 4, version: 2 }),
					blockFixture({ height: 5, version: 2 }),
					blockFixture({ height: 6, version: 2 }),
				];

				// Act & Assert
				await expect(bft.deleteBlocks(blocks, stateStore)).rejects.toThrow(
					'Can not delete block below or same as finalized height',
				);
			});

			it('should reject with error if blocks deleted contains block with same as finalized height', async () => {
				// Arrange
				bft = new BFT(bftParams);
				stateStore = new StateStoreMock({
					[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: '5',
				});
				await bft.init(stateStore);
				const blocks = [
					blockFixture({ height: 5, version: 2 }),
					blockFixture({ height: 6, version: 2 }),
				];

				// Act & Assert
				await expect(bft.deleteBlocks(blocks, stateStore)).rejects.toThrow(
					'Can not delete block below or same as finalized height',
				);
			});

			it('should recompute BFT properties up to height', async () => {
				// Arrange
				bft = new BFT(bftParams);
				stateStore = new StateStoreMock();
				await bft.init(stateStore);
				const blocks = [blockFixture({ height: 6, version: 2 })];

				await bft.deleteBlocks(blocks, stateStore);

				// Act & Assert
				expect(
					chainStub.dataAccess.getBlockHeadersByHeightBetween,
				).toHaveBeenCalledWith(1, 5);
			});
		});
		describe('#reset', () => {
			it('should reset headers and related stats to initial state except finality', async () => {
				// Arrange
				const stateStore = new StateStoreMock({
					key: 'BFT.finalizedHeight',
					value: '5',
				});
				const bft = new BFT(bftParams);
				await bft.init(stateStore);
				const initialInfo = extractBFTInfo(bft);
				const numberOfBlocks = 500;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				for (const block of blocks) {
					await bft.addNewBlock(
						{
							...block,
							maxHeightPrevoted: bft.finalityManager.chainMaxHeightPrevoted,
						},
						stateStore,
					);
				}
				const beforeResetInfo = extractBFTInfo(bft);

				// Act
				bft.reset();
				const afterResetInfo = extractBFTInfo(bft);

				// Assert
				expect(beforeResetInfo).not.toEqual(initialInfo);
				// Finalized height should not change
				expect(afterResetInfo).toEqual({
					finalizedHeight: 1,
					maxHeightPrevoted: 0,
					preVotes: {},
					preCommits: {},
					state: {},
				});
			});
		});

		describe('#isBFTProtocolCompliant', () => {
			let bft: BFT;
			let blocks: BlockHeader[];
			let stateStore: StateStoreMock;

			beforeEach(async () => {
				// Arrange
				bft = new BFT(bftParams);

				stateStore = new StateStoreMock({
					[CONSENSUS_STATE_FINALIZED_HEIGHT_KEY]: '1',
				});
				await bft.init(stateStore);

				// Setup BFT module with blocks
				const numberOfBlocks = 101;
				blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(
					blocks,
				);
			});

			it('should THROW if block is not provided', async () => {
				// Act & Assert
				await expect((bft as any).isBFTProtocolCompliant()).rejects.toThrow(
					'No block was provided to be verified',
				);
			});

			it('should return TRUE when B.maxHeightPreviouslyForged is equal to 0', async () => {
				// Arrange
				const block = {
					height: 102,
					generatorPublicKey: 'zxc',
					maxHeightPreviouslyForged: 0,
				};

				// Act & Assert
				await expect(
					bft.isBFTProtocolCompliant(block as BlockHeader),
				).resolves.toBe(true);
			});

			it('should return FALSE when B.maxHeightPreviouslyForged is equal to B.height', async () => {
				// Arrange
				const block = {
					height: 203,
					maxHeightPreviouslyForged: 203,
				};

				// Act & Assert
				await expect(
					bft.isBFTProtocolCompliant(block as BlockHeader),
				).resolves.toBe(false);
			});

			it('should return FALSE when B.maxHeightPreviouslyForged is greater than B.height', async () => {
				// Arrange
				const block = {
					height: 203,
					maxHeightPreviouslyForged: 204,
				};

				// Act & Assert
				await expect(
					bft.isBFTProtocolCompliant(block as BlockHeader),
				).resolves.toBe(false);
			});

			describe('when B.height - B.maxHeightPreviouslyForged is less than 303', () => {
				it('should return FALSE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 403,
						generatorPublicKey: 'zxc',
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					await expect(
						bft.isBFTProtocolCompliant(block as BlockHeader),
					).resolves.toBe(false);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 403,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					await expect(
						bft.isBFTProtocolCompliant(block as BlockHeader),
					).resolves.toBe(true);
				});
			});

			describe('when B.height - B.maxHeightPreviouslyForged is equal to 303', () => {
				it('should return FALSE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 404,
						generatorPublicKey: 'zxc',
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					await expect(
						bft.isBFTProtocolCompliant(block as BlockHeader),
					).resolves.toBe(false);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 404,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					await expect(
						bft.isBFTProtocolCompliant(block as BlockHeader),
					).resolves.toBe(true);
				});
			});

			describe('when B.height - B.maxHeightPreviouslyForged is greater than 303', () => {
				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 405,
						generatorPublicKey: 'zxc',
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					await expect(
						bft.isBFTProtocolCompliant(block as BlockHeader),
					).resolves.toBe(true);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 405,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					await expect(
						bft.isBFTProtocolCompliant(block as BlockHeader),
					).resolves.toBe(true);
				});
			});
		});
	});
});
