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

const blocksVerify = require('../../../../../../../src/modules/chain/blocks/verify');

const {
	Block: blockFixture,
} = require('../../../../../../mocha/fixtures/blocks');

jest.mock('../../../../../../../src/modules/chain/blocks/verify');

describe('synchronizer', () => {
	afterEach(async () => {
		jest.clearAllMocks();
	});

	describe('Synchronizer', () => {
		const maxPayloadLength = 10000;
		const maxTransactionsPerBlock = 25;

		const storageMock = {
			entities: {
				Block: {
					getLastBlock: jest.fn(),
				},
			},
		};

		const loggerMock = {
			info: jest.fn(),
		};

		const lastBlockGetterMock = jest.fn();
		const blocksMock = {};
		Object.defineProperty(blocksMock, 'lastBlock', {
			get: lastBlockGetterMock,
		});

		const syncParameters = {
			storage: storageMock,
			logger: loggerMock,
			blocks: blocksMock,
			exceptions: {},
			blockReward: {},
			maxTransactionsPerBlock,
			maxPayloadLength,
		};

		let synchronizer;
		let syncMechanism1;
		let syncMechanism2;

		beforeEach(async () => {
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
				expect(synchronizer.storage).toBe(syncParameters.storage);
				expect(synchronizer.logger).toBe(syncParameters.logger);
				expect(synchronizer.blocks).toBe(syncParameters.blocks);
				expect(synchronizer.blockReward).toBe(syncParameters.blockReward);
				expect(synchronizer.exceptions).toBe(syncParameters.exceptions);
				expect(synchronizer.constants).toEqual({
					maxTransactionsPerBlock,
					maxPayloadLength,
				});
				expect(synchronizer.mechanisms).toEqual([
					syncMechanism1,
					syncMechanism2,
				]);
			});
		});

		describe('register()', () => {
			it('should throw error if sync mechanism not have "isValidFor" async interface ', async () => {
				const syncMechanism = { isValidFor: () => {} };

				expect(() => synchronizer.register(syncMechanism)).toThrow(
					'Sync mechanism must have "isValidFor" async interface'
				);
			});

			it('should throw error if sync mechanism not have "run" async interface ', async () => {
				const syncMechanism = { isValidFor: async () => {}, run: () => {} };

				expect(() => synchronizer.register(syncMechanism)).toThrow(
					'Sync mechanism must have "run" async interface'
				);
			});

			it('should throw error if sync mechanism not have "isActive" interface ', async () => {
				const syncMechanism = {
					isValidFor: async () => {},
					run: async () => {},
				};

				expect(() => synchronizer.register(syncMechanism)).toThrow(
					'Sync mechanism must have "isActive" interface'
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

		describe('async _determineSyncMechanism()', () => {
			it('should return syncMechanism1 if syncMechanism1.isValidFor return true', async () => {
				jest.spyOn(syncMechanism1, 'isValidFor').mockReturnValue(true);
				jest.spyOn(syncMechanism2, 'isValidFor').mockReturnValue(false);

				expect(await synchronizer._determineSyncMechanism()).toBe(
					syncMechanism1
				);
			});

			it('should return syncMechanism2 if syncMechanism2.isValidFor return true', async () => {
				jest.spyOn(syncMechanism1, 'isValidFor').mockReturnValue(false);
				jest.spyOn(syncMechanism2, 'isValidFor').mockReturnValue(true);

				expect(await synchronizer._determineSyncMechanism()).toBe(
					syncMechanism2
				);
			});
		});

		describe('_validateBlockBeforeSync', () => {
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
				synchronizer._validateBlockBeforeSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifySignature).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifySignature).toHaveBeenCalledWith(
					receivedBlock,
					verifyResult
				);
			});

			it('should call verifyVersion', async () => {
				synchronizer._validateBlockBeforeSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyVersion).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyVersion).toHaveBeenCalledWith(
					receivedBlock,
					syncParameters.exceptions,
					verifyResult
				);
			});

			it('should call verifyReward', async () => {
				synchronizer._validateBlockBeforeSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyReward).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyReward).toHaveBeenCalledWith(
					syncParameters.blockReward,
					receivedBlock,
					syncParameters.exceptions,
					verifyResult
				);
			});

			it('should call verifyId', async () => {
				synchronizer._validateBlockBeforeSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyId).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyId).toHaveBeenCalledWith(
					receivedBlock,
					verifyResult
				);
			});

			it('should call verifyPayload', async () => {
				synchronizer._validateBlockBeforeSync(lastBlock, receivedBlock);

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

				const result = synchronizer._validateBlockBeforeSync(
					lastBlock,
					receivedBlock
				);

				expect(result).toEqual({
					verified: false,
					errors: ['Error 2', 'Error 1'],
				});
			});

			it('should return verified = true if all steps passes', async () => {
				const result = synchronizer._validateBlockBeforeSync(
					lastBlock,
					receivedBlock
				);

				expect(result).toEqual({ verified: true, errors: [] });
			});
		});

		describe('async run()', () => {
			let receivedBlock;
			let lastBlock;

			beforeEach(async () => {
				receivedBlock = blockFixture();

				lastBlockGetterMock.mockReturnValue(lastBlock);
				jest
					.spyOn(synchronizer, '_validateBlockBeforeSync')
					.mockReturnValue({ verified: true });
				jest
					.spyOn(synchronizer, '_determineSyncMechanism')
					.mockReturnValue(undefined);
			});

			it('should reject with error if there is already an active mechanism', async () => {
				// Make the syncMechanism1 as active
				syncMechanism1.isActive = true;

				await expect(synchronizer.run()).rejects.toThrow(
					'Blocks Sychronizer with Object is already running'
				);
			});

			it('should get the last block from blocks module', async () => {
				await synchronizer.run(receivedBlock);

				expect(lastBlockGetterMock).toHaveBeenCalledTimes(1);
			});

			it('should verify the block before sync', async () => {
				await synchronizer.run(receivedBlock);

				expect(synchronizer._validateBlockBeforeSync).toHaveBeenCalledTimes(1);
				expect(synchronizer._validateBlockBeforeSync).toHaveBeenCalledWith(
					lastBlock,
					receivedBlock
				);
			});

			it('should reject with error if block verification failed', async () => {
				const validationError = 'Block verifyError';
				synchronizer._validateBlockBeforeSync.mockReturnValue({
					verified: false,
					errors: [validationError],
				});

				await expect(synchronizer.run()).rejects.toThrow(
					`Block verification for chain synchronization failed with errors: ${validationError}`
				);
			});

			it('should determine the sync mechanism for received block', async () => {
				await synchronizer.run(receivedBlock);

				expect(synchronizer._determineSyncMechanism).toHaveBeenCalledTimes(1);
				expect(synchronizer._determineSyncMechanism).toHaveBeenCalledWith(
					receivedBlock
				);
			});

			it('should log message if unable to determine sync mechanism', async () => {
				await synchronizer.run(receivedBlock);

				expect(loggerMock.info).toHaveBeenCalledTimes(1);
				expect(loggerMock.info).toHaveBeenCalledWith(
					'Sync mechanism could not be determined for the given block',
					receivedBlock
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
});
