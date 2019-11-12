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

const {
	restoreBlocks,
	restoreBlocksUponStartup,
} = require('../../../../../../../src/modules/chain/synchronizer/utils');
const {
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_VALID_BLOCK,
	FORK_STATUS_DISCARD,
} = require('../../../../../../../src/modules/chain/bft');

describe('#synchronizer/utils', () => {
	let blocksMock;
	let processorMock;
	let storageMock;
	let loggerMock;
	const stubs = {};

	beforeEach(async () => {
		blocksMock = {
			getTempBlocks: jest.fn(),
			lastBlock: jest.fn(),
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
			blocksMock.getTempBlocks = jest.fn().mockReturnValue(blocks);

			// Act
			const result = await restoreBlocks(blocksMock, processorMock, stubs.tx);

			// Assert
			expect(result).toBeTruthy();
		});

		it('should pass block to processValidated with right flags', async () => {
			// Arrange
			const blocks = [{ id: 'block1' }, { id: 'block2' }];
			processorMock.deserialize
				.mockResolvedValueOnce(blocks[0])
				.mockResolvedValueOnce(blocks[1]);
			blocksMock.getTempBlocks = jest.fn().mockReturnValue(blocks);

			// Act
			await restoreBlocks(blocksMock, processorMock, stubs.tx);

			// Assert
			expect(blocksMock.getTempBlocks).toHaveBeenCalledWith(
				{},
				{ sort: 'height:asc' },
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

		it('should return false when temp_block table is empty', async () => {
			// Arrange
			blocksMock.getTempBlocks = jest.fn().mockReturnValue([]);

			// Act
			const result = await restoreBlocks(blocksMock, processorMock, stubs.tx);

			// Assert
			expect(result).toBeFalsy();
			expect(blocksMock.getTempBlocks).toHaveBeenCalledWith(
				{},
				{ sort: 'height:asc' },
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
			blocksMock.getTempBlocks.mockResolvedValue(tempBlocks);
		});

		it('should restore blocks if fork status = FORK_STATUS_DIFFERENT_CHAIN', async () => {
			// Arrange
			processorMock.forkStatus.mockResolvedValue(FORK_STATUS_DIFFERENT_CHAIN);

			processorMock.deserialize.mockResolvedValue(tempBlocks[1]);

			// Act
			await restoreBlocksUponStartup(
				loggerMock,
				blocksMock,
				processorMock,
				storageMock,
			);

			// Assert
			expect(blocksMock.getTempBlocks).toHaveBeenCalled();
			expect(storageMock.entities.TempBlock.truncate).not.toHaveBeenCalled();
		});

		it('should restore blocks if fork status = FORK_STATUS_VALID_BLOCK', async () => {
			// Arrange
			processorMock.forkStatus.mockResolvedValue(FORK_STATUS_VALID_BLOCK);

			processorMock.deserialize.mockResolvedValue(tempBlocks[1]);

			// Act
			await restoreBlocksUponStartup(
				loggerMock,
				blocksMock,
				processorMock,
				storageMock,
			);

			// Assert
			expect(blocksMock.getTempBlocks).toHaveBeenCalled();
			expect(storageMock.entities.TempBlock.truncate).not.toHaveBeenCalled();
		});

		it('should truncate temp_block table if fork status != FORK_STATUS_DIFFERENT_CHAIN || != FORK_STATUS_VALID_BLOCK', async () => {
			// Arrange
			processorMock.forkStatus.mockResolvedValue(FORK_STATUS_DISCARD);
			processorMock.deleteLastBlock.mockResolvedValue({ height: 0 });

			blocksMock.lastBlock = {
				id: 999999,
				height: 1,
			};

			processorMock.deserialize.mockResolvedValue(blocksMock.lastBlock);

			// Act
			await restoreBlocksUponStartup(
				loggerMock,
				blocksMock,
				processorMock,
				storageMock,
			);

			// Assert
			expect(storageMock.entities.TempBlock.truncate).toHaveBeenCalled();
			expect(blocksMock.getTempBlocks).not.toHaveBeenCalled();
		});

		it('should call forkStatus with lowest block object', async () => {
			// Arrange
			processorMock.forkStatus.mockResolvedValue(FORK_STATUS_DIFFERENT_CHAIN);

			processorMock.deserialize.mockResolvedValue(tempBlocks[0].fullBlock);

			// Act
			await restoreBlocksUponStartup(
				loggerMock,
				blocksMock,
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
