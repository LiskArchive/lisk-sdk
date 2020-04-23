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
import { Storage as StorageAccess } from '../../../src/data_access';

describe('data access - storage', () => {
	const defaultBlocks = [
		{
			id: 2,
			version: 2,
			height: 2,
			previousBlockId: 1,
			timestamp: 1000,
		},
		{
			id: 3,
			version: 2,
			height: 3,
			previousBlockId: 2,
			timestamp: 2000,
		},
	];

	const defaultAccounts = [
		{ publicKey: '1L', address: '1276152240083265771L', balance: '100' },
		{ publicKey: '2L', address: '5059876081639179984L', balance: '555' },
	];

	const defaultTransactions = [
		{
			type: 8,
			senderPublicKey:
				'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
		},
		{
			type: 8,
			senderPublicKey:
				'dfff1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8a',
		},
	];

	let storageMock: any;
	let storageAccess: StorageAccess;

	beforeEach(() => {
		storageMock = {
			entities: {
				Block: {
					get: jest.fn(),
					count: jest.fn(),
					isPersisted: jest.fn(),
					delete: jest.fn(),
				},
				TempBlock: {
					get: jest.fn(),
					isEmpty: jest.fn(),
					truncate: jest.fn(),
				},
				Account: {
					get: jest.fn(),
					resetMemTables: jest.fn(),
				},
				Transaction: {
					get: jest.fn(),
					isPersisted: jest.fn(),
				},
			},
		};

		storageAccess = new StorageAccess({
			...storageMock,
			minCachedItems: 3,
			maxCachedItems: 5,
		});
	});

	describe('#getBlockHeadersByIDs', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlockHeadersByIDs([
				'1',
				'2',
			]);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersByHeightBetween', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlockHeadersByHeightBetween(
				2,
				3,
			);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersWithHeights', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlockHeadersWithHeights([
				2,
			]);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getLastBlockHeader', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.get.mockResolvedValue([defaultBlocks[1]]);
		});

		it('should call storage.Block.get and return block', async () => {
			// Act
			const blockFromStorage = await storageAccess.getLastBlockHeader();

			// Assert
			expect(blockFromStorage).toEqual(defaultBlocks[1]);
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getLastCommonBlockHeader', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.get.mockResolvedValue([defaultBlocks[1]]);
		});

		it('should call storage.Block.get and return block', async () => {
			// Act
			const blockFromStorage = await storageAccess.getLastCommonBlockHeader([
				'2',
				'3',
			]);

			// Assert
			expect(blockFromStorage).toEqual(defaultBlocks[1]);
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlocksCount', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.count.mockResolvedValue(2);
		});

		it('should call storage.Block.get and return block', async () => {
			// Act
			const blockCountStorage = await storageAccess.getBlocksCount();

			// Assert
			expect(blockCountStorage).toEqual(2);
			expect(storageMock.entities.Block.count).toHaveBeenCalled();
		});
	});

	describe('#getBlocksByIDs', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlocksByIDs(['2', '3']);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlocksByHeightBetween', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlocksByHeightBetween(
				2,
				3,
			);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getLastBlock', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.get.mockResolvedValue([defaultBlocks[1]]);
		});

		it('should call storage.Block.get and return block', async () => {
			// Act
			const blockFromStorage = await storageAccess.getLastBlock();

			// Assert
			expect(blockFromStorage).toEqual(defaultBlocks[1]);
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getTempBlocks', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.TempBlock.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.TempBlock.get and return temporary blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getTempBlocks();

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageMock.entities.TempBlock.get).toHaveBeenCalled();
		});
	});

	describe('#isTempBlockEmpty', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.TempBlock.isEmpty.mockResolvedValue(true);
		});

		it('should call storage.TempBlock.isEmpty and return boolean', async () => {
			// Act
			const existsInStorage = await storageAccess.isTempBlockEmpty();

			// Assert
			expect(existsInStorage).toEqual(true);
			expect(storageMock.entities.TempBlock.isEmpty).toHaveBeenCalled();
		});
	});

	describe('#clearTempBlocks', () => {
		it('should call storage.TempBlock.truncate', async () => {
			// Act
			await storageAccess.clearTempBlocks();

			// Assert
			expect(storageMock.entities.TempBlock.truncate).toHaveBeenCalled();
		});
	});

	describe('#deleteBlocksWithHeightGreaterThan', () => {
		it('should call storage.Block.delete and return block', async () => {
			// Act
			await storageAccess.deleteBlocksWithHeightGreaterThan(1);

			// Assert
			expect(storageMock.entities.Block.delete).toHaveBeenCalled();
		});
	});

	describe('#isBlockPersisted', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Block.isPersisted.mockResolvedValue(true);
		});

		it('should call storage.Block.isPersisted and return boolean', async () => {
			// Act
			const existsInStorage = await storageAccess.isBlockPersisted('2');

			// Assert
			expect(existsInStorage).toEqual(true);
			expect(storageMock.entities.Block.isPersisted).toHaveBeenCalled();
		});
	});

	describe('#getAccountsByPublicKey', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Account.get.mockResolvedValue(defaultAccounts);
		});

		it('should call storage.Account.get and return accounts', async () => {
			// Act
			const accountsInStorage = await storageAccess.getAccountsByPublicKey([
				defaultAccounts[0].publicKey,
			]);

			// Assert
			expect(accountsInStorage).toEqual(defaultAccounts);
			expect(storageMock.entities.Account.get).toHaveBeenCalled();
		});
	});

	describe('#getAccountsByAddress', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Account.get.mockResolvedValue(defaultAccounts);
		});

		it('should call storage.Account.get and return accounts', async () => {
			// Act
			const accountsInStorage = await storageAccess.getAccountsByAddress([
				'1L',
				'2L',
			]);

			// Assert
			expect(accountsInStorage).toEqual(defaultAccounts);
			expect(storageMock.entities.Account.get).toHaveBeenCalled();
		});
	});

	describe('#resetAccountMemTables', () => {
		it('should call storage.Account.resetMemTables', async () => {
			// Act
			await storageAccess.resetAccountMemTables();

			// Assert
			expect(storageMock.entities.Account.resetMemTables).toHaveBeenCalled();
		});
	});

	describe('#getTransactionsByIDs', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Transaction.get.mockResolvedValue(
				defaultTransactions,
			);
		});

		it('should call storage.Transaction.get and return transactions', async () => {
			// Act
			const transactionsFromStorage = await storageAccess.getTransactionsByIDs([
				'2',
				'3',
			]);

			// Assert
			expect(transactionsFromStorage).toEqual(defaultTransactions);
			expect(storageMock.entities.Transaction.get).toHaveBeenCalled();
		});
	});

	describe('#isTransactionPersisted', () => {
		beforeEach(() => {
			// Arrange
			storageMock.entities.Transaction.isPersisted.mockResolvedValue(true);
		});

		it('should call storage.Transaction.isTransactionPersisted and return boolean', async () => {
			// Act
			const existsInStorage = await storageAccess.isTransactionPersisted('1L');

			// Assert
			expect(existsInStorage).toEqual(true);
			expect(storageMock.entities.Transaction.isPersisted).toHaveBeenCalled();
		});
	});
});
