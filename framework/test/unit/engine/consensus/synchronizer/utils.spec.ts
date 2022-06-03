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

import { Block } from '@liskhq/lisk-chain';
import {
	restoreBlocks,
	restoreBlocksUponStartup,
} from '../../../../../src/engine/consensus/synchronizer/utils';
import { createValidDefaultBlock } from '../../../../fixtures';

describe('#synchronizer/utils', () => {
	let chainMock: any;
	let blockExecutor: any;
	let loggerMock: any;
	let lastBlock: Block;

	beforeEach(async () => {
		lastBlock = await createValidDefaultBlock({
			header: {
				height: 1,
				maxHeightPrevoted: 0,
				maxHeightGenerated: 0,
			},
		});
		chainMock = {
			lastBlock,
			dataAccess: {
				getTempBlocks: jest.fn(),
				clearTempBlocks: jest.fn(),
			},
		};

		loggerMock = {
			trace: jest.fn(),
			info: jest.fn(),
			debug: jest.fn(),
			error: jest.fn(),
		};

		blockExecutor = {
			executeValidated: jest.fn(),
			deleteLastBlock: jest.fn(),
		};
	});

	describe('restoreBlocks()', () => {
		it('should return true on success', async () => {
			// Arrange
			const blocks = [await createValidDefaultBlock(), await createValidDefaultBlock()];
			chainMock.dataAccess.getTempBlocks = jest.fn().mockReturnValue(blocks);

			// Act
			const result = await restoreBlocks(chainMock, blockExecutor);

			// Assert
			expect(result).toBeTruthy();
		});

		it('should pass block to executeValidated with right flags', async () => {
			// Arrange
			const blocks = [await createValidDefaultBlock(), await createValidDefaultBlock()];
			chainMock.dataAccess.getTempBlocks = jest.fn().mockReturnValue(blocks);

			// Act
			await restoreBlocks(chainMock, blockExecutor);

			// Assert
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalled();
			expect(blockExecutor.executeValidated).toHaveBeenCalledTimes(2);
			expect(blockExecutor.executeValidated).toHaveBeenNthCalledWith(1, blocks[0], {
				removeFromTempTable: true,
			});
			expect(blockExecutor.executeValidated).toHaveBeenNthCalledWith(2, blocks[1], {
				removeFromTempTable: true,
			});
		});

		it('should return false when temp_blocks table is empty', async () => {
			// Arrange
			chainMock.dataAccess.getTempBlocks = jest.fn().mockReturnValue([]);

			// Act
			const result = await restoreBlocks(chainMock, blockExecutor);

			// Assert
			expect(result).toBeFalsy();
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalled();
			expect(blockExecutor.executeValidated).not.toHaveBeenCalled();
		});
	});

	describe('restoreBlocksUponStartup()', () => {
		let tempBlocks: Block[];
		beforeEach(async () => {
			tempBlocks = [
				await createValidDefaultBlock({
					header: {
						height: 11,
						previousBlockID: Buffer.from('height-10'),
						maxHeightPrevoted: 7,
						maxHeightGenerated: 0,
					},
				}),
				await createValidDefaultBlock({
					header: {
						height: 10,
						maxHeightPrevoted: 6,
						maxHeightGenerated: 0,
					},
				}),
			];
			chainMock.dataAccess.getTempBlocks.mockResolvedValue(tempBlocks);
		});

		it('should restore blocks if fork status = ForkStatus.DIFFERENT_CHAIN', async () => {
			// Arrange
			chainMock.lastBlock = await createValidDefaultBlock({
				header: {
					height: 1,
					maxHeightPrevoted: 0,
					maxHeightGenerated: 0,
				},
			});

			// Act
			await restoreBlocksUponStartup(loggerMock, chainMock, blockExecutor);

			// Assert
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalled();
		});

		it('should restore blocks if fork status = ForkStatus.VALID_BLOCK', async () => {
			// Arrange
			blockExecutor.deleteLastBlock.mockImplementation(async () => {
				chainMock.lastBlock = await createValidDefaultBlock({
					header: {
						previousBlockID: Buffer.from('height-9'),
						height: 9,
						maxHeightPrevoted: 0,
						maxHeightGenerated: 0,
					},
				});
			});
			chainMock.lastBlock = await createValidDefaultBlock({
				header: {
					previousBlockID: Buffer.from('height-9'),
					height: 10,
					maxHeightPrevoted: 0,
					maxHeightGenerated: 0,
				},
			});
			chainMock.lastBlock.header._id = Buffer.from('height-10');

			// Act
			await restoreBlocksUponStartup(loggerMock, chainMock, blockExecutor);

			// Assert
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalled();
		});

		it('should truncate temp_blocks table if fork status != ForkStatus.DIFFERENT_CHAIN || != ForkStatus.VALID_BLOCK', async () => {
			// Arrange
			blockExecutor.deleteLastBlock.mockResolvedValue({ height: 0 });

			chainMock.lastBlock = await createValidDefaultBlock({
				header: {
					height: 1,
					maxHeightPrevoted: 0,
					maxHeightGenerated: 0,
				},
			});

			// Act
			await restoreBlocksUponStartup(loggerMock, chainMock, blockExecutor);

			// Assert
			expect(chainMock.dataAccess.getTempBlocks).toHaveBeenCalled();
		});
	});
});
