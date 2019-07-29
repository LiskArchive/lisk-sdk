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

const syncParameters = {
	storage: storageMock,
	logger: loggerMock,
	exceptions: {},
	blockReward: {},
	maxTransactionsPerBlock,
	maxPayloadLength,
};

describe('synchronizer', () => {
	afterEach(async () => {
		jest.clearAllMocks();
	});

	describe('Synchronizer', () => {
		let sync;
		let sync1;
		let sync2;

		beforeEach(async () => {
			sync1 = {
				isActive: false,
				run: async () => {},
				isValidFor: async () => {},
			};
			sync2 = {
				isActive: false,
				run: async () => {},
				isValidFor: async () => {},
			};

			sync = new Synchronizer(syncParameters);
			sync.register(sync1);
			sync.register(sync2);
		});

		describe('constructor()', () => {
			it('should create instance of Synchronizer', async () => {
				expect(sync).toBeInstanceOf(Synchronizer);
			});

			it('should assign dependencies', async () => {
				expect(sync.storage).toBe(syncParameters.storage);
				expect(sync.logger).toBe(syncParameters.logger);
				expect(sync.blockReward).toBe(syncParameters.blockReward);
				expect(sync.exceptions).toBe(syncParameters.exceptions);
				expect(sync.constants).toEqual({
					maxTransactionsPerBlock,
					maxPayloadLength,
				});
				expect(sync.mechanisms).toEqual([sync1, sync2]);
			});
		});

		describe('register()', () => {
			it('should throw error if sync mechanism not have "isValidFor" async interface ', async () => {
				const syncMechanism = { isValidFor: () => {} };

				expect(() => sync.register(syncMechanism)).toThrow(
					'Sync mechanism must have "isValidFor" async interface'
				);
			});

			it('should throw error if sync mechanism not have "run" async interface ', async () => {
				const syncMechanism = { isValidFor: async () => {}, run: () => {} };

				expect(() => sync.register(syncMechanism)).toThrow(
					'Sync mechanism must have "run" async interface'
				);
			});

			it('should throw error if sync mechanism not have "isActive" interface ', async () => {
				const syncMechanism = {
					isValidFor: async () => {},
					run: async () => {},
				};

				expect(() => sync.register(syncMechanism)).toThrow(
					'Sync mechanism must have "isActive" interface'
				);
			});

			it('should register sync mechanisms', async () => {
				const syncMechanism1 = {
					isValidFor: async () => {},
					run: async () => {},
					isActive: false,
				};
				sync.register(syncMechanism1);

				expect(sync.mechanisms).toEqual([sync1, sync2, syncMechanism1]);
			});
		});

		describe('get isActive()', () => {
			it('should return false if there is no active mechanism', async () => {
				jest.spyOn(sync, 'activeMechanism', 'get').mockReturnValue(undefined);
				expect(sync.isActive).toBeFalsy();
			});

			it('should return false if activeMechanism.isActive = false', async () => {
				jest
					.spyOn(sync, 'activeMechanism', 'get')
					.mockReturnValue({ isActive: false });

				expect(sync.isActive).toBeFalsy();
			});

			it('should return true if activeMechanism.isActive = true', async () => {
				jest
					.spyOn(sync, 'activeMechanism', 'get')
					.mockReturnValue({ isActive: true });

				expect(sync.isActive).toBeTruthy();
			});
		});

		describe('get activeMechanism()', () => {
			it('should return sync1 if sync1.isActive=true', async () => {
				sync1.isActive = true;

				expect(sync.activeMechanism).toBe(sync1);
			});

			it('should return sync2 if sync2.isActive=true', async () => {
				sync2.isActive = true;

				expect(sync.activeMechanism).toBe(sync2);
			});
		});

		describe('async _determineSyncMechanism()', () => {
			it('should return sync1 if sync1.isValidFor return true', async () => {
				jest.spyOn(sync1, 'isValidFor').mockReturnValue(true);
				jest.spyOn(sync2, 'isValidFor').mockReturnValue(false);

				expect(await sync._determineSyncMechanism()).toBe(sync1);
			});

			it('should return sync2 if sync2.isValidFor return true', async () => {
				jest.spyOn(sync1, 'isValidFor').mockReturnValue(false);
				jest.spyOn(sync2, 'isValidFor').mockReturnValue(true);

				expect(await sync._determineSyncMechanism()).toBe(sync2);
			});
		});

		describe('_verifyBlockBeforeSync', () => {
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
				sync._verifyBlockBeforeSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifySignature).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifySignature).toHaveBeenCalledWith(
					receivedBlock,
					verifyResult
				);
			});

			it('should call verifyVersion', async () => {
				sync._verifyBlockBeforeSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyVersion).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyVersion).toHaveBeenCalledWith(
					receivedBlock,
					syncParameters.exceptions,
					verifyResult
				);
			});

			it('should call verifyReward', async () => {
				sync._verifyBlockBeforeSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyReward).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyReward).toHaveBeenCalledWith(
					syncParameters.blockReward,
					receivedBlock,
					syncParameters.exceptions,
					verifyResult
				);
			});

			it('should call verifyId', async () => {
				sync._verifyBlockBeforeSync(lastBlock, receivedBlock);

				expect(blocksVerify.verifyId).toHaveBeenCalledTimes(1);
				expect(blocksVerify.verifyId).toHaveBeenCalledWith(
					receivedBlock,
					verifyResult
				);
			});

			it('should call verifyPayload', async () => {
				sync._verifyBlockBeforeSync(lastBlock, receivedBlock);

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

				const result = sync._verifyBlockBeforeSync(lastBlock, receivedBlock);

				expect(result).toEqual({
					verified: false,
					errors: ['Error 2', 'Error 1'],
				});
			});

			it('should return verified = true if all steps passes', async () => {
				const result = sync._verifyBlockBeforeSync(lastBlock, receivedBlock);

				expect(result).toEqual({ verified: true, errors: [] });
			});
		});

		describe('async run()', () => {
			let receivedBlock;
			let lastBlock;

			beforeEach(async () => {
				receivedBlock = blockFixture();

				storageMock.entities.Block.getLastBlock.mockReturnValue(lastBlock);
				jest
					.spyOn(sync, '_verifyBlockBeforeSync')
					.mockReturnValue({ verified: true });
				jest.spyOn(sync, '_determineSyncMechanism').mockReturnValue(undefined);
			});

			it('should reject with error if there is already an active mechanism', async () => {
				// Make the sync1 as active
				sync1.isActive = true;

				await expect(sync.run()).rejects.toThrow(
					'Blocks Sychronizer with Object is already running'
				);
			});

			it('should get the last block from database', async () => {
				await sync.run(receivedBlock);

				expect(storageMock.entities.Block.getLastBlock).toHaveBeenCalledTimes(
					1
				);
			});

			it('should verify the block before sync', async () => {
				await sync.run(receivedBlock);

				expect(sync._verifyBlockBeforeSync).toHaveBeenCalledTimes(1);
				expect(sync._verifyBlockBeforeSync).toHaveBeenCalledWith(
					lastBlock,
					receivedBlock
				);
			});

			it('should reject with error if block verification failed', async () => {
				const validationError = 'Block verifyError';
				sync._verifyBlockBeforeSync.mockReturnValue({
					verified: false,
					errors: [validationError],
				});

				await expect(sync.run()).rejects.toThrow(
					`Block verification for chain synchronization failed with errors: ${validationError}`
				);
			});

			it('should determine the sync mechanism for received block', async () => {
				await sync.run(receivedBlock);

				expect(sync._determineSyncMechanism).toHaveBeenCalledTimes(1);
				expect(sync._determineSyncMechanism).toHaveBeenCalledWith(
					receivedBlock
				);
			});

			it('should log message if unable to determine sync mechanism', async () => {
				await sync.run(receivedBlock);

				expect(loggerMock.info).toHaveBeenCalledTimes(1);
				expect(loggerMock.info).toHaveBeenCalledWith(
					"Can't determine sync mechanism at the moment for block",
					receivedBlock
				);
			});

			it('should run the determined mechanism', async () => {
				const syncMechanism = { run: jest.fn() };
				sync._determineSyncMechanism.mockReturnValue(syncMechanism);

				await sync.run(receivedBlock);

				expect(syncMechanism.run).toHaveBeenCalledTimes(1);
				expect(syncMechanism.run).toHaveBeenCalledWith(receivedBlock);
			});

			it('should return the run function from determined mechanism', async () => {
				const run = jest.fn().mockReturnValue('sync run return');
				const syncMechanism = { run };
				sync._determineSyncMechanism.mockReturnValue(syncMechanism);

				const result = await sync.run(receivedBlock);

				expect(result).toBe('sync run return');
			});
		});
	});
});
