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

const {
	Block: blockFixture,
} = require('../../../../../../mocha/fixtures/blocks');

describe('Synchronizer', () => {
	let synchronizer;
	let syncMechanism1;
	let syncMechanism2;
	let loggerMock;
	let processorMock;
	let blocksMock;
	let syncParameters;
	const stubs = {};

	beforeEach(async () => {
		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
		};

		processorMock = {
			validateDetached: jest.fn(),
			processValidated: jest.fn(),
		};

		blocksMock = {
			getTempBlocks: jest.fn(),
		};

		stubs.tx = jest.fn();

		syncParameters = {
			logger: loggerMock,
			processorModule: processorMock,
			blocksModule: blocksMock,
		};
		syncMechanism1 = {
			isActive: false,
			run: async () => {},
			isValidFor: async () => {},
		};
		syncMechanism2 = {
			isActive: false,
			run: async () => {},
			isValidFor: async () => {},
		};

		synchronizer = new Synchronizer(syncParameters);
		synchronizer.register(syncMechanism1);
		synchronizer.register(syncMechanism2);
	});

	describe('constructor()', () => {
		it('should create instance of Synchronizer', async () => {
			expect(synchronizer).toBeInstanceOf(Synchronizer);
		});

		it('should assign dependencies', async () => {
			expect(synchronizer.logger).toBe(syncParameters.logger);
			expect(synchronizer.processorModule).toBe(syncParameters.processorModule);
			expect(synchronizer.mechanisms).toEqual([syncMechanism1, syncMechanism2]);
		});
	});

	describe('register()', () => {
		it('should throw error if sync mechanism not have "isValidFor" async interface ', async () => {
			const syncMechanism = { isValidFor: () => {} };

			expect(() => synchronizer.register(syncMechanism)).toThrow(
				'Sync mechanism must have "isValidFor" async interface',
			);
		});

		it('should throw error if sync mechanism not have "run" async interface ', async () => {
			const syncMechanism = { isValidFor: async () => {}, run: () => {} };

			expect(() => synchronizer.register(syncMechanism)).toThrow(
				'Sync mechanism must have "run" async interface',
			);
		});

		it('should throw error if sync mechanism not have "isActive" interface ', async () => {
			const syncMechanism = {
				isValidFor: async () => {},
				run: async () => {},
			};

			expect(() => synchronizer.register(syncMechanism)).toThrow(
				'Sync mechanism must have "isActive" interface',
			);
		});

		it('should register sync mechanisms', async () => {
			const syncMechanism = {
				isValidFor: async () => {},
				run: async () => {},
				isActive: false,
			};
			synchronizer.register(syncMechanism);

			expect(synchronizer.mechanisms).toEqual([
				syncMechanism1,
				syncMechanism2,
				syncMechanism,
			]);
		});
	});

	describe('get isActive()', () => {
		it('should return false if there is no active mechanism', async () => {
			jest
				.spyOn(synchronizer, 'activeMechanism', 'get')
				.mockReturnValue(undefined);
			expect(synchronizer.isActive).toBeFalsy();
		});

		it('should return false if activeMechanism.isActive = false', async () => {
			jest
				.spyOn(synchronizer, 'activeMechanism', 'get')
				.mockReturnValue({ isActive: false });

			expect(synchronizer.isActive).toBeFalsy();
		});

		it('should return true if activeMechanism.isActive = true', async () => {
			jest
				.spyOn(synchronizer, 'activeMechanism', 'get')
				.mockReturnValue({ isActive: true });

			expect(synchronizer.isActive).toBeTruthy();
		});
	});

	describe('get activeMechanism()', () => {
		it('should return syncMechanism1 if syncMechanism1.isActive=true', async () => {
			syncMechanism1.isActive = true;

			expect(synchronizer.activeMechanism).toBe(syncMechanism1);
		});

		it('should return syncMechanism2 if syncMechanism2.isActive=true', async () => {
			syncMechanism2.isActive = true;

			expect(synchronizer.activeMechanism).toBe(syncMechanism2);
		});
	});

	describe('restoreBlocks()', () => {
		it('should return true on success', async () => {
			// Arrange
			const blocks = [{ id: 'block1' }, { id: 'block2' }];
			blocksMock.getTempBlocks = jest.fn().mockReturnValue(blocks);

			// Act
			const result = await synchronizer.restoreBlocks(stubs.tx);

			// Assert
			expect(blocksMock.getTempBlocks).toHaveBeenCalledWith(stubs.tx);
			expect(processorMock.processValidated).toHaveBeenCalledTimes(2);
			expect(processorMock.processValidated).toHaveBeenNthCalledWith(
				1,
				blocks[0],
			);
			expect(processorMock.processValidated).toHaveBeenNthCalledWith(
				2,
				blocks[1],
			);
			expect(result).toBeTrue();
		});

		it('should throw error when temp_block table is empty', async () => {
			// Arrange
			blocksMock.getTempBlocks = jest.fn().mockReturnValue([]);

			// Act && Assert
			await expect(synchronizer.restoreBlocks(stubs.tx)).rejects.toBe(
				'Temp_block table is empty',
			);
			expect(blocksMock.getTempBlocks).toHaveBeenCalledWith(stubs.tx);
			expect(processorMock.processValidated).not.toHaveBeenCalled();
		});
	});

	describe('async _determineSyncMechanism()', () => {
		it('should return syncMechanism1 if syncMechanism1.isValidFor return true', async () => {
			jest.spyOn(syncMechanism1, 'isValidFor').mockReturnValue(true);
			jest.spyOn(syncMechanism2, 'isValidFor').mockReturnValue(false);

			expect(await synchronizer._determineSyncMechanism()).toBe(syncMechanism1);
		});

		it('should return syncMechanism2 if syncMechanism2.isValidFor return true', async () => {
			jest.spyOn(syncMechanism1, 'isValidFor').mockReturnValue(false);
			jest.spyOn(syncMechanism2, 'isValidFor').mockReturnValue(true);

			expect(await synchronizer._determineSyncMechanism()).toBe(syncMechanism2);
		});
	});

	describe('async run()', () => {
		let receivedBlock;

		beforeEach(async () => {
			receivedBlock = blockFixture();

			jest
				.spyOn(synchronizer, '_determineSyncMechanism')
				.mockReturnValue(undefined);
		});

		it('should reject with error if there is already an active mechanism', async () => {
			// Make the syncMechanism1 as active
			syncMechanism1.isActive = true;

			await expect(synchronizer.run()).rejects.toThrow(
				'Blocks Sychronizer with Object is already running',
			);
		});

		it('should verify the block before sync', async () => {
			await synchronizer.run(receivedBlock);

			expect(processorMock.validateDetached).toHaveBeenCalledTimes(1);
			expect(processorMock.validateDetached).toHaveBeenCalledWith(
				receivedBlock,
			);
		});

		it('should reject with error if block verification failed', async () => {
			const validationError = new Error('Block verifyError');
			processorMock.validateDetached.mockRejectedValue(validationError);

			await expect(synchronizer.run()).rejects.toThrow(validationError);
		});

		it('should determine the sync mechanism for received block', async () => {
			await synchronizer.run(receivedBlock);

			expect(synchronizer._determineSyncMechanism).toHaveBeenCalledTimes(1);
			expect(synchronizer._determineSyncMechanism).toHaveBeenCalledWith(
				receivedBlock,
			);
		});

		it('should log message if unable to determine sync mechanism', async () => {
			await synchronizer.run(receivedBlock);

			expect(loggerMock.info).toHaveBeenCalledTimes(1);
			expect(loggerMock.info).toHaveBeenCalledWith(
				'Sync mechanism could not be determined for the given block',
				receivedBlock,
			);
		});

		it('should run the determined mechanism', async () => {
			const syncMechanism = { run: jest.fn() };
			synchronizer._determineSyncMechanism.mockReturnValue(syncMechanism);

			await synchronizer.run(receivedBlock);

			expect(syncMechanism.run).toHaveBeenCalledTimes(1);
			expect(syncMechanism.run).toHaveBeenCalledWith(receivedBlock);
		});

		it('should return the run function from determined mechanism', async () => {
			const run = jest.fn().mockReturnValue('sync run return');
			const syncMechanism = { run };
			synchronizer._determineSyncMechanism.mockReturnValue(syncMechanism);

			const result = await synchronizer.run(receivedBlock);

			expect(result).toBe('sync run return');
		});
	});
});
