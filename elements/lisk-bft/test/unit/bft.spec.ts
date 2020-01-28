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

import { Block as blockFixture } from '../fixtures/blocks';
import { FinalityManager } from '../../src/finality_manager';
const { StateStore } = require('@liskhq/lisk-blocks');

import {
	BFT,
	extractBFTBlockHeaderFromBlock,
	CHAIN_STATE_FINALIZED_HEIGHT_KEY,
} from '../../src';

import { Storage, StateStore as StateStoreType, Block } from '../../src/types';

import { Slots } from '@liskhq/lisk-blocks';
import { Rounds } from '@liskhq/lisk-dpos';

const constants = {
	ACTIVE_DELEGATES: 101,
	EPOCH_TIME: '2016-05-24T17:00:00.000Z',
	BLOCK_TIME: 10,
};

const generateBlocks = ({
	startHeight,
	numberOfBlocks,
}: {
	readonly startHeight: number;
	readonly numberOfBlocks: number;
}): Block[] => {
	return new Array(numberOfBlocks).fill(0).map((_v, index) => {
		const height = startHeight + index;
		return blockFixture({ height, version: 2 });
	});
};

describe('bft', () => {
	describe('BFT', () => {
		let storageMock: Storage;

		let rounds: Rounds;
		let slots: Slots;
		let activeDelegates: number;
		let startingHeight: number;
		let bftParams: {
			readonly storage: Storage;
			readonly rounds: Rounds;
			readonly slots: Slots;
			readonly activeDelegates: number;
			readonly startingHeight: number;
		};

		beforeEach(() => {
			storageMock = {
				entities: {
					Block: {
						get: jest.fn().mockResolvedValue([]),
					},
					ChainState: {
						get: jest.fn().mockResolvedValue([]),
					},
				},
			};

			slots = new Slots({
				epochTime: constants.EPOCH_TIME,
				interval: constants.BLOCK_TIME,
			});
			rounds = new Rounds({ blocksPerRound: activeDelegates });

			activeDelegates = 101;
			startingHeight = 0;
			bftParams = {
				storage: storageMock,
				rounds,
				slots,
				activeDelegates,
				startingHeight,
			};
		});

		describe('#constructor', () => {
			it('should create instance of BFT', async () => {
				expect(new BFT(bftParams)).toBeInstanceOf(BFT);
			});

			it('should assign all parameters correctly', async () => {
				const bft = new BFT(bftParams);

				expect(bft.finalityManager).toBeUndefined();
				expect(bft.storage).toBe(storageMock);
				expect(bft.constants).toEqual({ activeDelegates, startingHeight });
			});
		});

		describe('#init', () => {
			it('should initialize finality manager', async () => {
				const stateStore = new StateStore(storageMock);
				const bft = new BFT(bftParams);

				await bft.init(stateStore);

				expect(bft.finalityManager).toBeInstanceOf(FinalityManager);
			});

			it('should load blocks from lastBlockHeight - TWO_ROUNDS if its highest', async () => {
				// Arrange
				const startingHeight = 1;
				const finalizedHeight = 200;
				const lastBlockHeight = 600;
				const stateStore = new StateStore(storageMock);
				const bft = new BFT({ ...bftParams, startingHeight });

				const loadTillHeight = lastBlockHeight;
				// since both limits are inclusive
				// 5 - 3 = 2 but 3, 4, 5 are actually 3
				const loadFromHeight = lastBlockHeight - activeDelegates * 2 + 1;

				const lastBlock = blockFixture({ height: lastBlockHeight });
				const blocksToLoad = generateBlocks({
					startHeight: loadFromHeight,
					numberOfBlocks: loadTillHeight - loadFromHeight + 1,
				});
				const minActiveHeightsOfDelegates = blocksToLoad.reduce(
					(acc, currentBLock) => {
						acc[currentBLock.generatorPublicKey] = [];
						return acc;
					},
					{} as any,
				);

				jest
					.spyOn(bft, 'finalityManager', 'get')
					.mockReturnValue(
						new FinalityManager({ finalizedHeight, activeDelegates }),
					);

				jest
					.spyOn(storageMock.entities.ChainState, 'get')
					.mockResolvedValue([
						{ key: CHAIN_STATE_FINALIZED_HEIGHT_KEY, value: finalizedHeight },
					]);

				jest.spyOn(storageMock.entities.Block, 'get').mockImplementation(
					(filters: object, options?: object): Promise<Block[]> => {
						const isFiltersEmpty = !Object.keys(filters).length;
						const { limit, sort } = options as any;

						// If asked for last block
						if (isFiltersEmpty && limit === 1 && sort === 'height:desc') {
							return Promise.resolve([lastBlock]);
						}

						if (!isFiltersEmpty) {
							/*
								Since there is no way to generate pre-determined
								public keys for random blocks so we have to add this condition
								inside the mock implementation.

								"minActiveHeightsOfDelegates" should contain all public keys for blocks
								this function is going to return.So we generated the blocks first and add this check here,

								If we generate the blocks here then we can't know the pre-determined keys
								If we don't add this condition, then the test will be false positive
							 */
							if (
								(filters as any).height_gte != blocksToLoad[0].height ||
								(filters as any).height_lte !=
									blocksToLoad[blocksToLoad.length - 1].height
							) {
								throw `BFT tries to load blocks out of range. Valid Range (${
									blocksToLoad[0].height
								} - ${
									blocksToLoad[blocksToLoad.length - 1].height
								}), Loaded ( ${(filters as any).height_gte} - ${
									(filters as any).height_lte
								})`;
							}

							return Promise.resolve(blocksToLoad);
						}

						return Promise.resolve([]);
					},
				);

				// Act
				await stateStore.chainState.cache();
				await bft.init(stateStore, minActiveHeightsOfDelegates);

				// Assert
				expect(bft.finalityManager.minHeight).toBe(loadFromHeight);
				expect(bft.finalityManager.maxHeight).toBe(loadTillHeight);
			});

			it('should load blocks from startingHeight if its highest', async () => {
				// Arrange
				const startingHeight = 550;
				const finalizedHeight = 200;
				const lastBlockHeight = 600;
				const bft = new BFT({ ...bftParams, startingHeight });
				const stateStore = new StateStore(storageMock);

				const loadTillHeight = lastBlockHeight;
				const loadFromHeight = startingHeight;

				const lastBlock = blockFixture({ height: lastBlockHeight });
				const blocksToLoad = generateBlocks({
					startHeight: loadFromHeight,
					numberOfBlocks: loadTillHeight - loadFromHeight + 1,
				});
				const minActiveHeightsOfDelegates = blocksToLoad.reduce(
					(acc, currentBLock) => {
						acc[currentBLock.generatorPublicKey] = [];
						return acc;
					},
					{} as any,
				);

				jest
					.spyOn(bft, 'finalityManager', 'get')
					.mockReturnValue(
						new FinalityManager({ finalizedHeight, activeDelegates }),
					);

				jest
					.spyOn(storageMock.entities.ChainState, 'get')
					.mockResolvedValue([
						{ key: CHAIN_STATE_FINALIZED_HEIGHT_KEY, value: finalizedHeight },
					]);

				jest.spyOn(storageMock.entities.Block, 'get').mockImplementation(
					(filters: object, options?: object): Promise<Block[]> => {
						const isFiltersEmpty = !Object.keys(filters).length;
						const { limit, sort } = options as any;

						// If asked for last block
						if (isFiltersEmpty && limit === 1 && sort === 'height:desc') {
							return Promise.resolve([lastBlock]);
						}

						if (!isFiltersEmpty) {
							/*
								Since there is no way to generate pre-determined
								public keys for random blocks so we have to add this condition
								inside the mock implementation.

								"minActiveHeightsOfDelegates" should contain all public keys for blocks
								this function is going to return.So we generated the blocks first and add this check here,

								If we generate the blocks here then we can't know the pre-determined keys
								If we don't add this condition, then the test will be false positive
							 */
							if (
								(filters as any).height_gte != blocksToLoad[0].height ||
								(filters as any).height_lte !=
									blocksToLoad[blocksToLoad.length - 1].height
							) {
								throw `BFT tries to load blocks out of range. ${
									blocksToLoad.length
								} Valid Range (${blocksToLoad[0].height} - ${
									blocksToLoad[blocksToLoad.length - 1].height
								}), Loaded ( ${(filters as any).height_gte} - ${
									(filters as any).height_lte
								})`;
							}

							return Promise.resolve(blocksToLoad);
						}

						return Promise.resolve([]);
					},
				);

				// Act
				await stateStore.chainState.cache();
				await bft.init(stateStore, minActiveHeightsOfDelegates);

				// Assert
				expect(bft.finalityManager.minHeight).toBe(loadFromHeight);
				expect(bft.finalityManager.maxHeight).toBe(loadTillHeight);
			});
		});

		describe('#addNewBlock', () => {
			const block1 = blockFixture({ height: 1, version: 2 });
			const lastFinalizedHeight = 5;

			let bft: BFT;
			let stateStore: StateStoreType;

			beforeEach(async () => {
				stateStore = new StateStore(storageMock);
				bft = new BFT(bftParams);

				(storageMock as any).entities.Block.get.mockReturnValue([]);
				(storageMock as any).entities.ChainState.get.mockResolvedValue([
					{ key: CHAIN_STATE_FINALIZED_HEIGHT_KEY, value: lastFinalizedHeight },
				]);
				jest.spyOn(stateStore.chainState, 'set');

				await stateStore.chainState.cache();
				await bft.init(stateStore);
			});

			describe('when valid block which does not change the finality is added', () => {
				it('should update the latest finalized height to storage', async () => {
					await bft.addNewBlock(block1, stateStore);
					expect(stateStore.chainState.set).toHaveBeenCalledWith(
						CHAIN_STATE_FINALIZED_HEIGHT_KEY,
						lastFinalizedHeight,
					);
				});
			});
		});

		describe('#deleteBlocks', () => {
			let bft: BFT;
			let stateStore: StateStoreType;

			beforeEach(async () => {
				stateStore = new StateStore(storageMock);
				bft = new BFT(bftParams);

				(storageMock as any).entities.Block.get.mockReturnValue([]);
				(storageMock as any).entities.ChainState.get.mockResolvedValue([
					{ key: CHAIN_STATE_FINALIZED_HEIGHT_KEY, value: 1 },
				]);

				await stateStore.chainState.cache();
				await bft.init(stateStore);

				(storageMock as any).entities.Block.get.mockClear();
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

				(storageMock as any).entities.ChainState.get.mockResolvedValue([
					{ key: CHAIN_STATE_FINALIZED_HEIGHT_KEY, value: 5 },
				]);
				await stateStore.chainState.cache();
				await bft.init(stateStore);
				const blocks = [
					blockFixture({ height: 4, version: 2 }),
					blockFixture({ height: 5, version: 2 }),
					blockFixture({ height: 6, version: 2 }),
				];

				// Act & Assert
				await expect(bft.deleteBlocks(blocks)).rejects.toThrow(
					'Can not delete block below or same as finalized height',
				);
			});

			it('should reject with error if blocks deleted contains block with same as finalized height', async () => {
				// Arrange
				bft = new BFT(bftParams);
				(storageMock as any).entities.ChainState.get.mockResolvedValue([
					{ key: 'BFT.finalizedHeight', value: 5 },
				]);
				await stateStore.chainState.cache();
				await bft.init(stateStore);
				const blocks = [
					blockFixture({ height: 5, version: 2 }),
					blockFixture({ height: 6, version: 2 }),
				];

				// Act & Assert
				await expect(bft.deleteBlocks(blocks)).rejects.toThrow(
					'Can not delete block below or same as finalized height',
				);
			});

			it('should delete the block headers form list for all given blocks', async () => {
				// Arrange
				const block1 = blockFixture({ height: 1, version: 2 });
				const block2 = blockFixture({ height: 2, version: 2 });
				const block3 = blockFixture({ height: 3, version: 2 });
				const block4 = blockFixture({ height: 4, version: 2 });
				await bft.addNewBlock(block1, stateStore);
				await bft.addNewBlock(block2, stateStore);
				await bft.addNewBlock(block3, stateStore);
				await bft.addNewBlock(block4, stateStore);

				// Act
				await bft.deleteBlocks([block3, block4]);

				// Assert
				expect(bft.finalityManager.minHeight).toEqual(1);
				expect(bft.finalityManager.maxHeight).toEqual(2);
				expect(bft.finalityManager.headers.items).toEqual([
					extractBFTBlockHeaderFromBlock(block1),
					extractBFTBlockHeaderFromBlock(block2),
				]);
			});

			it('should load more blocks from storage if remaining in headers list is less than 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const numberOfBlocksToDelete = 50;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 100 blocks from height 401 to 500
				const blocksInBft = blocks.slice(400);

				// Last 50 blocks from height 451 to 500
				const blocksToDelete = blocks.slice(-numberOfBlocksToDelete);

				// Will fetch 202 - (450 - 401) = 153 more blocks
				const blocksFetchedFromStorage = blocks.slice(400 - 153, 400).reverse();

				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block, stateStore);
				}

				// When asked by BFT, return last [blocksToDelete] blocks ()
				(storageMock as any).entities.Block.get.mockReturnValue(
					blocksFetchedFromStorage,
				);

				// minActiveHeightsOfDelegates is provided to deleteBlocks function
				// in block_processor_v2 from DPoS module.
				const minActiveHeightsOfDelegates = blocks.reduce((acc, block) => {
					// the value is not important in this test.
					acc[block.generatorPublicKey] = [1];
					return acc;
				}, {} as any);

				// Act - Delete top 50 blocks (500-450 height)
				await bft.deleteBlocks(blocksToDelete, minActiveHeightsOfDelegates);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(450);
				expect(bft.finalityManager.minHeight).toEqual(
					450 - activeDelegates * 2,
				);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.get).toHaveBeenLastCalledWith(
					{ height_lte: 400, height_gte: 450 - activeDelegates * 2 },
					{ limit: null, sort: 'height:desc' },
				);
			});

			it('should not load more blocks from storage if remaining in headers list is more than 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const numberOfBlocksToDelete = 50;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 300 blocks from height 201 to 500
				const blocksInBft = blocks.slice(200);

				// Last 50 blocks from height 451 to 500
				const blocksToDelete = blocks.slice(-numberOfBlocksToDelete);

				// minActiveHeightsOfDelegates is provided to deleteBlocks function
				// in block_processor_v2 from DPoS module.
				const minActiveHeightsOfDelegates = blocks.reduce((acc, block) => {
					// the value is not important in this test.
					acc[block.generatorPublicKey] = [1];
					return acc;
				}, {} as any);

				// Load last 300 blocks to bft (201 to 500)
				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block, stateStore);
				}

				// Act
				await bft.deleteBlocks(blocksToDelete, minActiveHeightsOfDelegates);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(450);
				expect(bft.finalityManager.minHeight).toEqual(201);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(0);
			});

			it('should not load more blocks from storage if remaining in headers list is exactly 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 300 blocks from height 201 to 500
				const blocksInBft = blocks.slice(200);

				// Delete blocks keeping exactly two rounds in the list from (201 to 298)
				const blocksToDelete = blocks.slice(
					-1 * (300 - activeDelegates * 2 - 1),
				);

				// minActiveHeightsOfDelegates is provided to deleteBlocks function
				// in block_processor_v2 from DPoS module.
				const minActiveHeightsOfDelegates = blocks.reduce((acc, block) => {
					// the value is not important in this test.
					acc[block.generatorPublicKey] = [1];
					return acc;
				}, {} as any);

				// Load last 300 blocks to bft (201 to 500)
				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block, stateStore);
				}

				// Act
				await bft.deleteBlocks(blocksToDelete, minActiveHeightsOfDelegates);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(403);
				expect(bft.finalityManager.minHeight).toEqual(
					403 - activeDelegates * 2,
				);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(0);
			});
		});

		describe('#isBFTProtocolCompliant', () => {
			let bft: BFT;
			let blocks: Block[];
			let stateStore: StateStoreType;

			beforeEach(async () => {
				// Arrange
				bft = new BFT(bftParams);
				(storageMock as any).entities.Block.get.mockReturnValue([]);
				(storageMock as any).entities.ChainState.get.mockResolvedValue([
					{ key: 'BFT.finalizedHeight', value: 1 },
				]);
				stateStore = new StateStore(storageMock);
				await stateStore.chainState.cache();
				await bft.init(stateStore);

				// Setup BFT module with blocks
				const numberOfBlocks = 101;
				blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});

				for (const block of blocks) {
					await bft.addNewBlock(block, stateStore);
				}
			});

			it('should THROW if block is not provided', async () => {
				// Act & Assert
				expect(() => (bft as any).isBFTProtocolCompliant()).toThrow(
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
				expect((bft as any).isBFTProtocolCompliant(block)).toBe(true);
			});

			it('should return FALSE when B.maxHeightPreviouslyForged is equal to B.height', async () => {
				// Arrange
				const block = {
					height: 203,
					maxHeightPreviouslyForged: 203,
				};

				// Act & Assert
				expect((bft as any).isBFTProtocolCompliant(block)).toBe(false);
			});

			it('should return FALSE when B.maxHeightPreviouslyForged is greater than B.height', async () => {
				// Arrange
				const block = {
					height: 203,
					maxHeightPreviouslyForged: 204,
				};

				// Act & Assert
				expect((bft as any).isBFTProtocolCompliant(block)).toBe(false);
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
					expect((bft as any).isBFTProtocolCompliant(block)).toBe(false);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 403,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect((bft as any).isBFTProtocolCompliant(block)).toBe(true);
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
					expect((bft as any).isBFTProtocolCompliant(block)).toBe(false);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 404,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect((bft as any).isBFTProtocolCompliant(block)).toBe(true);
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
					expect((bft as any).isBFTProtocolCompliant(block)).toBe(true);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 405,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect((bft as any).isBFTProtocolCompliant(block)).toBe(true);
				});
			});
		});

		// // TODO: Remove tests for private methods
		// describe('#_initFinalityManager', () => {
		// 	let stateStore;
		//
		// 	beforeEach(async () => {
		// 		storageMock.entities.ChainState.get.mockResolvedValue([
		// 			{ key: 'BFT.finalizedHeight', value: 1 },
		// 		]);
		// 		stateStore = new StateStore(storageMock);
		// 		jest.spyOn(stateStore.chainState, 'get');
		//
		// 		await stateStore.chainState.cache();
		// 	});
		//
		// 	it('should call state store to get stored finalized height', async () => {
		// 		const bft = new BFT(bftParams);
		//
		// 		const result = await bft._initFinalityManager(stateStore);
		//
		// 		expect(stateStore.chainState.get).toHaveBeenCalledTimes(1);
		// 		expect(stateStore.chainState.get).toHaveBeenCalledWith(
		// 			'BFT.finalizedHeight',
		// 		);
		// 		expect(result).toBeInstanceOf(FinalityManager);
		// 	});
		//
		// 	it('should initialize finalityManager with stored FINALIZED_HEIGHT if its highest', async () => {
		// 		// Arrange
		// 		const finalizedHeight = 500;
		// 		const startingHeightLower = 300;
		// 		storageMock.entities.ChainState.get.mockResolvedValue([
		// 			{ key: 'BFT.finalizedHeight', value: finalizedHeight },
		// 		]);
		// 		await stateStore.chainState.cache();
		//
		// 		const bft = new BFT({
		// 			...bftParams,
		// 			...{ startingHeight: startingHeightLower },
		// 		});
		//
		// 		// Act
		// 		const finalityManager = await bft._initFinalityManager(stateStore);
		//
		// 		// Assert
		// 		expect(finalityManager).toBeInstanceOf(FinalityManager);
		// 		expect(finalityManager.activeDelegates).toEqual(activeDelegates);
		// 		expect(finalityManager.finalizedHeight).toEqual(finalizedHeight);
		// 	});
		//
		// 	it('should initialize finalityManager with stored startingHeight - TWO_ROUNDS if its highest', async () => {
		// 		// Arrange
		// 		const finalizedHeight = 500;
		// 		const startingHeightHigher = 800;
		// 		storageMock.entities.ChainState.get.mockResolvedValue([
		// 			{ key: 'BFT.finalizedHeight', value: finalizedHeight },
		// 		]);
		// 		await stateStore.chainState.cache();
		// 		const bft = new BFT({
		// 			...bftParams,
		// 			...{ startingHeight: startingHeightHigher },
		// 		});
		//
		// 		// Act
		// 		const finalityManager = await bft._initFinalityManager(stateStore);
		//
		// 		// Assert
		// 		expect(finalityManager).toBeInstanceOf(FinalityManager);
		// 		expect(finalityManager.activeDelegates).toEqual(activeDelegates);
		// 		expect(finalityManager.finalizedHeight).toEqual(
		// 			startingHeightHigher - activeDelegates * 2,
		// 		);
		// 	});
		// });
		//
		// describe('#_getLastBlockHeight', () => {
		// 	it('should call BlockEntity.get with particular parameters', async () => {
		// 		const bft = new BFT(bftParams);
		// 		storageMock.entities.Block.get.mockReturnValue([]);
		//
		// 		await bft._getLastBlockHeight();
		//
		// 		expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
		// 		expect(storageMock.entities.Block.get).toHaveBeenCalledWith(
		// 			{},
		// 			{
		// 				limit: 1,
		// 				sort: 'height:desc',
		// 			},
		// 		);
		// 	});
		//
		// 	it('should return block height if block available', async () => {
		// 		const bft = new BFT(bftParams);
		//
		// 		const lastBlockHeight = 5;
		// 		const block = { height: lastBlockHeight };
		// 		storageMock.entities.Block.get.mockReturnValue([block]);
		//
		// 		const result = await bft._getLastBlockHeight();
		//
		// 		expect(result).toEqual(lastBlockHeight);
		// 	});
		//
		// 	it('should return zero if no block available', async () => {
		// 		const bft = new BFT(bftParams);
		// 		storageMock.entities.Block.get.mockReturnValue([]);
		//
		// 		await bft._getLastBlockHeight();
		//
		// 		const result = await bft._getLastBlockHeight();
		//
		// 		expect(result).toEqual(0);
		// 	});
		// });
		//
		// describe('#_loadBlocksFromStorage', () => {
		// 	const fromHeight = 0;
		// 	const tillHeight = 10;
		//
		// 	let bft;
		// 	let stateStore;
		//
		// 	beforeEach(async () => {
		// 		bft = new BFT(bftParams);
		// 		storageMock.entities.Block.get.mockReturnValue([]);
		// 		storageMock.entities.ChainState.get.mockResolvedValue([
		// 			{ key: 'BFT.finalizedHeight', value: 1 },
		// 		]);
		// 		stateStore = new StateStore(storageMock);
		// 		await stateStore.chainState.cache();
		//
		// 		await bft.init(stateStore);
		// 	});
		//
		// 	it('should call fetch blocks from storage particular parameters', async () => {
		// 		// Arrange
		// 		storageMock.entities.Block.get.mockClear();
		// 		const minActiveHeightsOfDelegates = {};
		//
		// 		// Act
		// 		await bft._loadBlocksFromStorage({
		// 			fromHeight,
		// 			tillHeight,
		// 			minActiveHeightsOfDelegates,
		// 		});
		//
		// 		// Assert
		// 		expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
		// 		expect(storageMock.entities.Block.get).toHaveBeenCalledWith(
		// 			{
		// 				height_gte: fromHeight,
		// 				height_lte: tillHeight,
		// 			},
		// 			{
		// 				limit: null,
		// 				sort: 'height:asc',
		// 			},
		// 		);
		// 	});
		//
		// 	// As BFT applies only to block version 2
		// 	it('should skip loading blocks with version !== 2', async () => {
		// 		// Arrange
		// 		const blockWithVersion1 = blockFixture({ version: 1 });
		// 		const blockWithVersion2 = blockFixture({ version: 2 });
		// 		storageMock.entities.Block.get.mockReturnValue([
		// 			blockWithVersion1,
		// 			blockWithVersion2,
		// 		]);
		// 		const delegateMinHeightActive = slots.calcRoundStartHeight(
		// 			slots.calcRound(blockWithVersion2.height),
		// 		);
		// 		const minActiveHeightsOfDelegates = {
		// 			[blockWithVersion2.generatorPublicKey]: [delegateMinHeightActive],
		// 		};
		//
		// 		// Act
		// 		await bft._loadBlocksFromStorage({
		// 			fromHeight,
		// 			tillHeight,
		// 			minActiveHeightsOfDelegates,
		// 		});
		//
		// 		// Assert
		// 		expect(bft.finalityManager.headers).toHaveLength(1);
		// 		expect(bft.finalityManager.headers.items).toEqual([
		// 			extractBFTBlockHeaderFromBlock({
		// 				...blockWithVersion2,
		// 				delegateMinHeightActive,
		// 			}),
		// 		]);
		// 	});
		//
		// 	it('should load block headers to finalityManager', async () => {
		// 		// Arrange
		// 		const block = blockFixture({ version: 2, height: 520 });
		// 		const delegateMinHeightActive = constants.ACTIVE_DELEGATES * 4 + 1;
		// 		const minActiveHeightsOfDelegates = {
		// 			[block.generatorPublicKey]: [delegateMinHeightActive],
		// 		};
		// 		const blockHeader = extractBFTBlockHeaderFromBlock({
		// 			...block,
		// 			delegateMinHeightActive,
		// 		});
		// 		storageMock.entities.Block.get.mockReturnValue([block]);
		//
		// 		// Act
		// 		await bft._loadBlocksFromStorage({
		// 			fromHeight,
		// 			tillHeight,
		// 			minActiveHeightsOfDelegates,
		// 		});
		//
		// 		// Assert
		// 		expect(bft.finalityManager.headers.items).toHaveLength(1);
		// 		expect(bft.finalityManager.headers.items).toEqual([blockHeader]);
		// 	});
		// });
	});
});
