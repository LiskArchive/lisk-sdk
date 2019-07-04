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
	Synchronizer,
} = require('../../../../../../../src/modules/chain/synchronizer/synchronizer');

const BlockSynchronizationMechanism = require('../../../../../../../src/modules/chain/synchronizer/block_synchronization_mechanism');
const FastChainSwitchingMechanism = require('../../../../../../../src/modules/chain/synchronizer/fast_chain_switching_mechanism');

const blocksVerify = require('../../../../../../../src/modules/chain/blocks/verify');

const {
	Block: blockFixture,
} = require('../../../../../../mocha/fixtures/blocks');

jest.mock(
	'../../../../../../../src/modules/chain/synchronizer/block_synchronization_mechanism'
);
jest.mock(
	'../../../../../../../src/modules/chain/synchronizer/fast_chain_switching_mechanism'
);
jest.mock('../../../../../../../src/modules/chain/blocks/verify');

const activeDelegates = 101;
const maxPayloadLength = 10000;
const maxTransactionsPerBlock = 25;

const storageMock = {
	entities: {
		Block: {
			getOne: jest.fn(),
		},
	},
};

const slotsMock = {
	getSlotNumber: jest.fn(),
	calcRound: jest.fn(),
};

const dposMock = {
	getRoundDelegates: jest.fn().mockReturnValue([]),
};

const bftMock = {};

const syncParameters = {
	storage: storageMock,
	logger: {},
	exceptions: {},
	blockReward: {},
	slots: slotsMock,
	dpos: dposMock,
	bft: bftMock,
	activeDelegates,
	maxTransactionsPerBlock,
	maxPayloadLength,
};

describe('synchronizer', () => {
	afterEach(async () => {
		jest.clearAllMocks();
	});

	describe('Synchronizer', () => {
		let sync;

		beforeEach(async () => {
			sync = new Synchronizer(syncParameters);
		});

		describe('constructor()', () => {
			it('should create instance of Synchronizer', async () => {
				expect(sync).toBeInstanceOf(Synchronizer);
			});

			it('should assign dependencies', async () => {
				expect(sync.storage).toBe(syncParameters.storage);
				expect(sync.logger).toBe(syncParameters.logger);
				expect(sync.dpos).toBe(syncParameters.dpos);
				expect(sync.bft).toBe(syncParameters.bft);
				expect(sync.slots).toBe(syncParameters.slots);
				expect(sync.blockReward).toBe(syncParameters.blockReward);
				expect(sync.exceptions).toBe(syncParameters.exceptions);
				expect(sync.constants).toEqual({
					activeDelegates,
					maxTransactionsPerBlock,
					maxPayloadLength,
				});
				expect(sync.activeMechanism).toBeNull();
			});

			it('should initialize sync mechanism', async () => {
				expect(BlockSynchronizationMechanism).toHaveBeenCalledTimes(1);
				expect(BlockSynchronizationMechanism).toHaveBeenCalledWith({
					storage: syncParameters.storage,
					logger: syncParameters.logger,
				});
				expect(sync.blockSynchronizationMechanism).toBeInstanceOf(
					BlockSynchronizationMechanism
				);

				expect(FastChainSwitchingMechanism).toHaveBeenCalledTimes(1);
				expect(FastChainSwitchingMechanism).toHaveBeenCalledWith({
					storage: syncParameters.storage,
					logger: syncParameters.logger,
				});
				expect(sync.fastChainSwitchingMechanism).toBeInstanceOf(
					FastChainSwitchingMechanism
				);
			});
		});

		describe('isActive()', () => {
			it('should return false if there is no active mechanism', async () => {
				expect(sync.isActive()).toBeFalsy();
			});

			it('should return activeMechanism.isActive if there is any activeMechanism', async () => {
				sync.activeMechanism = { isActive: false };
				expect(sync.isActive()).toBeFalsy();

				sync.activeMechanism = { isActive: true };
				expect(sync.isActive()).toBeTruthy();
			});
		});

		describe('_determineSyncMechanism()', () => {
			const finalizedBlockHeight = 100;
			const lastBlockHeight = 200;
			const lastBlock = blockFixture({ height: lastBlockHeight });
			const finalizedBlock = blockFixture({ height: finalizedBlockHeight });

			beforeEach(async () => {
				jest.spyOn(sync, '_lastBlock').mockReturnValue(lastBlock);
				jest
					.spyOn(sync, '_verifyBlockBeforeChainSync')
					.mockReturnValue({ verified: true });
				sync.bft.finalizedHeight = finalizedBlockHeight;

				storageMock.entities.Block.getOne.mockReturnValue(finalizedBlock);
			});

			it('should get the last block', async () => {
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
				await sync._determineSyncMechanism(receivedBlock);

				expect(sync._lastBlock).toHaveBeenCalledTimes(1);
			});

			it('should invoke verifyBlockBeforeChainSync with last block', async () => {
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
				await sync._determineSyncMechanism(receivedBlock);

				expect(sync._verifyBlockBeforeChainSync).toHaveBeenCalledTimes(1);
				expect(sync._verifyBlockBeforeChainSync).toHaveBeenCalledWith(
					lastBlock,
					receivedBlock
				);
			});

			it('should throw error if verifyBlockBeforeChainSync failed', async () => {
				sync._verifyBlockBeforeChainSync.mockReturnValue({
					verified: false,
					errors: ['Error 1', 'Error 2'],
				});
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });

				await expect(
					sync._determineSyncMechanism(receivedBlock)
				).rejects.toThrow(
					'Block verification for chain synchronization failed with errors: Error 1,Error 2'
				);
			});

			it('should get finalized block from storage', async () => {
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
				await sync._determineSyncMechanism(receivedBlock);

				expect(storageMock.entities.Block.getOne).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.getOne).toHaveBeenCalledWith({
					height_eq: finalizedBlockHeight,
				});
			});

			it('should get slot numbers for finalizedBlock and current slot', async () => {
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
				await sync._determineSyncMechanism(receivedBlock);

				expect(slotsMock.getSlotNumber).toHaveBeenCalledTimes(2);
				expect(slotsMock.getSlotNumber).toHaveBeenNthCalledWith(
					1,
					finalizedBlock.timestamp
				);
				expect(slotsMock.getSlotNumber).toHaveBeenNthCalledWith(2);
			});

			it('should return blockSynchronizationMechanism if is behind the three rounds', async () => {
				const currentSlot = 5000;
				const finalizedBlockSlot = 4000; // Behind more than 3 rounds
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
				slotsMock.getSlotNumber.mockImplementation(timestamp => {
					if (timestamp === finalizedBlock.timestamp) {
						return finalizedBlockSlot;
					}

					return currentSlot;
				});

				const result = await sync._determineSyncMechanism(receivedBlock);

				expect(result).toBe(sync.blockSynchronizationMechanism);
			});

			it('should return null if gap between received block and last block is more than two rounds', async () => {
				const currentSlot = 500;
				const finalizedBlockSlot = 200; // Within three rounds
				const receivedBlockHeight = lastBlockHeight + 203; // Ahead more than 2 rounds
				const receivedBlock = blockFixture({ height: receivedBlockHeight });
				slotsMock.getSlotNumber.mockImplementation(timestamp => {
					if (timestamp === finalizedBlock.timestamp) {
						return finalizedBlockSlot;
					}

					return currentSlot;
				});

				const result = await sync._determineSyncMechanism(receivedBlock);

				expect(result).toBeNull();
				expect(slotsMock.calcRound).not.toHaveBeenCalled();
			});

			it('should return null if received block delegate is not part of that round delegate list', async () => {
				const currentSlot = 500;
				const finalizedBlockSlot = 200; // Within three rounds
				const receivedBlockHeight = lastBlockHeight + 180; // Within two rounds
				const receivedBlock = blockFixture({ height: receivedBlockHeight });
				slotsMock.getSlotNumber.mockImplementation(timestamp => {
					if (timestamp === finalizedBlock.timestamp) {
						return finalizedBlockSlot;
					}

					return currentSlot;
				});
				dposMock.getRoundDelegates.mockReturnValue([
					receivedBlock.generatorPublicKey,
				]);

				const result = await sync._determineSyncMechanism(receivedBlock);

				expect(result).toBe(sync.fastChainSwitchingMechanism);
			});

			it('should return fastChainSwitchingMechanism if received block delegate is part of that round delegate list', async () => {
				const currentSlot = 500;
				const finalizedBlockSlot = 200; // Within three rounds
				const receivedBlockHeight = lastBlockHeight + 180; // Within two rounds
				const receivedBlock = blockFixture({ height: receivedBlockHeight });
				slotsMock.getSlotNumber.mockImplementation(timestamp => {
					if (timestamp === finalizedBlock.timestamp) {
						return finalizedBlockSlot;
					}

					return currentSlot;
				});
				dposMock.getRoundDelegates.mockReturnValue([]);

				const result = await sync._determineSyncMechanism(receivedBlock);

				expect(result).toBeNull();
			});
		});

		describe('verifyBlockBeforeChainSync', () => {
			const lastBlock = blockFixture();
			const receivedBlock = blockFixture();
			const verifyResult = {
				errors: [],
				verified: true,
			};

			beforeEach(async () => {
				blocksVerify.verifySignature.mockReturnValue(verifyResult);
				blocksVerify.verifyVersion.mockReturnValue(verifyResult);
				blocksVerify.verifyReward.mockReturnValue(verifyResult);
				blocksVerify.verifyId.mockReturnValue(verifyResult);
				blocksVerify.verifyPayload.mockReturnValue(verifyResult);
			});

			it('should call verifySignature', async () => {
				sync._verifyBlockBeforeChainSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifySignature).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifySignature).toHaveBeenCalledWith(
					receivedBlock,
					verifyResult
				);
			});

			it('should call verifyVersion', async () => {
				sync._verifyBlockBeforeChainSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyVersion).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyVersion).toHaveBeenCalledWith(
					receivedBlock,
					syncParameters.exceptions,
					verifyResult
				);
			});

			it('should call verifyReward', async () => {
				sync._verifyBlockBeforeChainSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyReward).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyReward).toHaveBeenCalledWith(
					syncParameters.blockReward,
					receivedBlock,
					syncParameters.exceptions,
					verifyResult
				);
			});

			it('should call verifyId', async () => {
				sync._verifyBlockBeforeChainSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyId).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyId).toHaveBeenCalledWith(
					receivedBlock,
					verifyResult
				);
			});

			it('should call verifyPayload', async () => {
				sync._verifyBlockBeforeChainSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyPayload).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyPayload).toHaveBeenCalledWith(
					receivedBlock,
					syncParameters.maxTransactionsPerBlock,
					syncParameters.maxPayloadLength,
					verifyResult
				);
			});

			it('should return verified = false and errors if any of verify steps fail', async () => {
				blocksVerify.verifyPayload.mockReturnValue({
					verified: false,
					errors: ['Error 1', 'Error 2'],
				});

				const result = sync._verifyBlockBeforeChainSync(
					lastBlock,
					receivedBlock
				);

				expect(result).toEqual({
					verified: false,
					errors: ['Error 2', 'Error 1'],
				});
			});

			it('should return verified = true if all steps passes', async () => {
				const result = sync._verifyBlockBeforeChainSync(
					lastBlock,
					receivedBlock
				);

				expect(result).toEqual({ verified: true, errors: [] });
			});
		});
	});
});
