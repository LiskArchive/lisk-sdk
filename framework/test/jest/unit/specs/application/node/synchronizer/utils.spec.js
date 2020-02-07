/*
 * Copyright © 2019 Lisk Foundation
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

const { ForkStatus } = require('@liskhq/lisk-bft');
const {
	restoreBlocks,
	restoreBlocksUponStartup,
} = require('../../../../../../../src/application/node/synchronizer/utils');

describe('#synchronizer/utils', () => {
	let chainMock;
	let processorMock;
	let storageMock;
	let loggerMock;
	const stubs = {};

	beforeEach(async () => {
		chainMock = {
			lastBlock: jest.fn(),
			dataAccess: {
				getTempBlocks: jest.fn(),
				clearTempBlocks: jest.fn(),
			},
		};

		loggerMock = {
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
		};

		processorMock = {
			processValidated: jest.fn(),
			forkStatus: jest.fn(),
			deserialize: jest.fn(),
			deleteLastBlock: jest.fn(),
		};

		storageMock = {
			entities: {
				TempBlock: {
					get: jest.fn(),
					truncate: jest.fn(),
				},
			},
		};

		stubs.tx = jest.fn();
	});

	describe('restoreBlocks()', () => {
		it('should return true on success', async () => {
			// Arrange
			const blocks = [{ id: 'block1' }, { id: 'block2' }];
			chainMock.dataAccess.getTempBlocks = jest.fn().mockReturnValue(blocks);

			// Act
			const result = await restoreBlocks(chainMock, processorMock, stubs.tx);

			// Assert
			expect(result).toBeTruthy();
		});

		it('should pass block to processValidated with right flags', async () => {
			// Arrange
			const blocks = [{ id: 'block1' }, { id: 'block2' }];
			processorMock.deserialize
				.mockResolvedValueOnce(blocks[0])
				.mockResolvedValueOnce(blocks[1]);
			chainMock.dataAccess.getTempBlocks = jest.fn().mockReturnValue(blocks);

			// Act
			await restoreBlocks(chainMock, processorMock, stubs.tx);

			// Assert
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalledWith(
				{},
				{ sort: 'height:asc', limit: null },
				stubs.tx,
			);
			expect(processorMock.processValidated).toHaveBeenCalledTimes(2);
			expect(processorMock.processValidated).toHaveBeenNthCalledWith(
				1,
				blocks[0],
				{ removeFromTempTable: true },
			);
			expect(processorMock.processValidated).toHaveBeenNthCalledWith(
				2,
				blocks[1],
				{ removeFromTempTable: true },
			);
		});

		it('should return false when temp_blocks table is empty', async () => {
			// Arrange
			chainMock.dataAccess.getTempBlocks = jest.fn().mockReturnValue([]);

			// Act
			const result = await restoreBlocks(chainMock, processorMock, stubs.tx);

			// Assert
			expect(result).toBeFalsy();
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalledWith(
				{},
				{ sort: 'height:asc', limit: null },
				stubs.tx,
			);
			expect(processorMock.processValidated).not.toHaveBeenCalled();
		});
	});

	describe('restoreBlocksUponStartup()', () => {
		let tempBlocks;
		beforeEach(async () => {
			tempBlocks = [
				{
					id: 1,
					height: 10,
					fullBlock: {
						height: 10,
						heightPrevoted: 6,
					},
				},
				{
					id: 2,
					height: 11,
					fullBlock: {
						height: 11,
						heightPrevoted: 5,
					},
				},
			];
			storageMock.entities.TempBlock.get.mockResolvedValue(tempBlocks);
			chainMock.dataAccess.getTempBlocks.mockResolvedValue(tempBlocks);
		});

		it('should restore blocks if fork status = ForkStatus.DIFFERENT_CHAIN', async () => {
			// Arrange
			processorMock.forkStatus.mockResolvedValue(ForkStatus.DIFFERENT_CHAIN);

			processorMock.deserialize.mockResolvedValue(tempBlocks[1]);

			// Act
			await restoreBlocksUponStartup(
				loggerMock,
				chainMock,
				processorMock,
				storageMock,
			);

			// Assert
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalled();
			expect(storageMock.entities.TempBlock.truncate).not.toHaveBeenCalled();
		});

		it('should restore blocks if fork status = ForkStatus.VALID_BLOCK', async () => {
			// Arrange
			processorMock.forkStatus.mockResolvedValue(ForkStatus.VALID_BLOCK);

			processorMock.deserialize.mockResolvedValue(tempBlocks[1]);

			// Act
			await restoreBlocksUponStartup(
				loggerMock,
				chainMock,
				processorMock,
				storageMock,
			);

			// Assert
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalled();
		});

		it('should truncate temp_blocks table if fork status != ForkStatus.DIFFERENT_CHAIN || != ForkStatus.VALID_BLOCK', async () => {
			// Arrange
			processorMock.forkStatus.mockResolvedValue(ForkStatus.DISCARD);
			processorMock.deleteLastBlock.mockResolvedValue({ height: 0 });

			chainMock.lastBlock = {
				id: 999999,
				height: 1,
			};

			processorMock.deserialize.mockResolvedValue(chainMock.lastBlock);

			// Act
			await restoreBlocksUponStartup(
				loggerMock,
				chainMock,
				processorMock,
				storageMock,
			);

			// Assert
			expect(chainMock.dataAccess.getTempBlocks).not.toHaveBeenCalled();
		});

		it('should call forkStatus with lowest block object', async () => {
			// Arrange
			processorMock.forkStatus.mockResolvedValue(ForkStatus.DIFFERENT_CHAIN);

			processorMock.deserialize.mockResolvedValue(tempBlocks[0].fullBlock);

			// Act
			await restoreBlocksUponStartup(
				loggerMock,
				chainMock,
				processorMock,
				storageMock,
			);

			// Assert
			expect(processorMock.forkStatus).toHaveBeenCalledWith(
				tempBlocks[0].fullBlock,
			);
		});
	});
});
