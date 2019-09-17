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
	FastChainSwitchingMechanism,
} = require('../../../../../../../../src/modules/chain/synchronizer/fast_chain_switching_mechanism');
const {
	Block: blockFixture,
} = require('../../../../../../../mocha/fixtures/blocks');

describe('fast_chain_switching_mechanism', () => {
	afterEach(async () => {
		jest.clearAllMocks();
	});

	describe('FastChainSwitchingMechanism', () => {
		const activeDelegates = 101;
		const channelMock = { invoke: jest.fn() };

		const lastBlockGetterMock = jest.fn();
		const blocksMock = {};
		Object.defineProperty(blocksMock, 'lastBlock', {
			get: lastBlockGetterMock,
		});

		const storageMock = {
			entities: {
				Block: {
					getLastBlock: jest.fn(),
				},
			},
		};
		const dposMock = {
			getForgerPublicKeysForRound: jest.fn().mockReturnValue([]),
		};
		const slotsMock = {
			getSlotNumber: jest.fn(),
			calcRound: jest.fn(),
		};
		const syncParams = {
			channel: channelMock,
			blocks: blocksMock,
			storage: storageMock,
			slots: slotsMock,
			dpos: dposMock,
			activeDelegates,
		};

		let syncMechanism;

		beforeEach(() => {
			syncMechanism = new FastChainSwitchingMechanism(syncParams);
		});

		describe('#constructor', () => {
			it('should create instance of FastChainSwitchingMechanism', async () => {
				expect(syncMechanism).toBeInstanceOf(FastChainSwitchingMechanism);
			});

			it('should assign dependencies', async () => {
				expect(syncMechanism.storage).toBe(syncParams.storage);
				expect(syncMechanism.logger).toBe(syncParams.logger);
				expect(syncMechanism.slots).toBe(syncParams.slots);
				expect(syncMechanism.blocks).toBe(syncParams.blocks);
				expect(syncMechanism.dpos).toBe(syncParams.dpos);
				expect(syncMechanism.constants).toEqual({
					activeDelegates,
				});
				expect(syncMechanism.active).toBeFalsy();
			});
		});

		describe('async isValidFor()', () => {
			const lastBlockHeight = 200;
			const finalizedBlockHeight = 100;
			const lastBlock = blockFixture({ height: lastBlockHeight });
			const finalizedBlock = blockFixture({ height: finalizedBlockHeight });

			beforeEach(async () => {
				lastBlockGetterMock.mockReturnValue(lastBlock);
			});

			it('should get the last block from blocks module', async () => {
				const receivedBlock = blockFixture({ height: lastBlockHeight + 1 });
				await syncMechanism.isValidFor(receivedBlock);

				expect(lastBlockGetterMock).toHaveBeenCalledTimes(1);
			});

			it('should return false if gap between received block and last block is more than two rounds', async () => {
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

				const result = await syncMechanism.isValidFor(receivedBlock);

				expect(result).toBeFalsy();
				expect(slotsMock.calcRound).not.toHaveBeenCalled();
			});

			it('should return true if received block delegate is part of that round delegate list', async () => {
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
				dposMock.getForgerPublicKeysForRound.mockReturnValue([
					receivedBlock.generatorPublicKey,
				]);

				const result = await syncMechanism.isValidFor(receivedBlock);

				expect(result).toBeTruthy();
			});

			it('should return false if received block delegate is not part of that round delegate list', async () => {
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
				dposMock.getForgerPublicKeysForRound.mockReturnValue([]);

				const result = await syncMechanism.isValidFor(receivedBlock);

				expect(result).toBeFalsy();
			});
		});
	});
});
