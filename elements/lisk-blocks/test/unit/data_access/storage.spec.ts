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

import { Storage as StorageAccess } from '../../src/data_access';

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
		{ address: '1276152240083265771L', balance: '100' },
		{ address: '11237980039345381032L', balance: '555' },
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

	let storageStub: any;
	let storageAccess: any;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Block: {
					get: jest.fn(),
					count: jest.fn(),
					getFirstBlockIdOfLastRounds: jest.fn(),
					isPersisted: jest.fn(),
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

		storageAccess = new StorageAccess(storageStub);
	});

	describe('#getBlockHeadersByIDs', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlockHeadersByIDs([
				2,
				3,
			]);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersByHeightBetween', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlockHeadersByHeightBetween(
				[2, 3],
			);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersWithHeights', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlockHeadersWithHeights([
				2,
			]);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersWithInterval', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getBlockHeadersWithInterval(
				[2],
			);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getLastBlockHeader', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue([defaultBlocks[1]]);
		});

		it('should call storage.Block.get and return block', async () => {
			// Act
			const blockFromStorage = await storageAccess.getLastBlockHeader();

			// Assert
			expect(blockFromStorage).toEqual(defaultBlocks[1]);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getLastCommonBlockHeader', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue([defaultBlocks[1]]);
		});

		it('should call storage.Block.get and return block', async () => {
			// Act
			const blockFromStorage = await storageAccess.getLastCommonBlockHeader([
				2,
				3,
			]);

			// Assert
			expect(blockFromStorage).toEqual(defaultBlocks[1]);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockCount', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.count.mockResolvedValue(2);
		});

		it('should call storage.Block.get and return block', async () => {
			// Act
			const blockCountStorage = await storageAccess.getBlockCount();

			// Assert
			expect(blockCountStorage).toEqual(2);
			expect(storageStub.entities.Block.count).toHaveBeenCalled();
		});
	});

	describe('#getExtendedBlocksByIDs', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getExtendedBlocksByIDs([
				2,
				3,
			]);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getExtendedBlocksByHeightBetween', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.Block.get and return blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getExtendedBlocksByHeightBetween(
				[2, 3],
			);

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getExtendedLastBlock', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.get.mockResolvedValue([defaultBlocks[1]]);
		});

		it('should call storage.Block.get and return block', async () => {
			// Act
			const blockFromStorage = await storageAccess.getExtendedLastBlock();

			// Assert
			expect(blockFromStorage).toEqual(defaultBlocks[1]);
			expect(storageStub.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getTempBlocks', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.TempBlock.get.mockResolvedValue(defaultBlocks);
		});

		it('should call storage.TempBlock.get and return temporary blocks', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getTempBlocks();

			// Assert
			expect(blocksFromStorage).toEqual(defaultBlocks);
			expect(storageStub.entities.TempBlock.get).toHaveBeenCalled();
		});
	});

	describe('#isTempBlockEmpty', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.TempBlock.isEmpty.mockResolvedValue(true);
		});

		it('should call storage.TempBlock.isEmpty and return boolean', async () => {
			// Act
			const existsInStorage = await storageAccess.isTempBlockEmpty();

			// Assert
			expect(existsInStorage).toEqual(true);
			expect(storageStub.entities.TempBlock.isEmpty).toHaveBeenCalled();
		});
	});

	describe('#clearTempBlocks', () => {
		it('should call storage.TempBlock.truncate', async () => {
			// Act
			await storageAccess.clearTempBlocks();

			// Assert
			expect(storageStub.entities.TempBlock.truncate).toHaveBeenCalled();
		});
	});

	describe('#getFirstBlockIdWithInterval', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.getFirstBlockIdOfLastRounds.mockResolvedValue([
				2,
				3,
			]);
		});

		it('should call storage.Block.getFirstBlockIdOfLastRounds and return block IDs', async () => {
			// Act
			const blocksFromStorage = await storageAccess.getFirstBlockIdWithInterval(
				10,
				5,
			);

			// Assert
			expect(blocksFromStorage).toEqual([2, 3]);
			expect(
				storageStub.entities.Block.getFirstBlockIdOfLastRounds,
			).toHaveBeenCalled();
		});
	});

	describe('#isBlockPersisted', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Block.isPersisted.mockResolvedValue(true);
		});

		it('should call storage.Block.isPersisted and return boolean', async () => {
			// Act
			const existsInStorage = await storageAccess.isBlockPersisted(2);

			// Assert
			expect(existsInStorage).toEqual(true);
			expect(storageStub.entities.Block.isPersisted).toHaveBeenCalled();
		});
	});

	describe('#getAccountsByPublicKey', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);
		});

		it('should call storage.Account.get and return accounts', async () => {
			// Act
			const accountsInStorage = await storageAccess.getAccountsByPublicKey();

			// Assert
			expect(accountsInStorage).toEqual(defaultAccounts);
			expect(storageStub.entities.Account.get).toHaveBeenCalled();
		});
	});

	describe('#getAccountsByAddress', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);
		});

		it('should call storage.Account.get and return accounts', async () => {
			// Act
			const accountsInStorage = await storageAccess.getAccountsByAddress([
				'1L',
				'2L',
			]);

			// Assert
			expect(accountsInStorage).toEqual(defaultAccounts);
			expect(storageStub.entities.Account.get).toHaveBeenCalled();
		});
	});

	describe('#getDelegateAccounts', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Account.get.mockResolvedValue(defaultAccounts);
		});

		it('should call storage.Account.get and return accounts', async () => {
			// Act
			const delegateAccountsInStorage = await storageAccess.getDelegateAccounts();

			// Assert
			expect(delegateAccountsInStorage).toEqual(defaultAccounts);
			expect(storageStub.entities.Account.get).toHaveBeenCalled();
		});
	});

	describe('#resetAccountMemTables', () => {
		it('should call storage.Account.resetMemTables', async () => {
			// Act
			await storageAccess.resetAccountMemTables();

			// Assert
			expect(storageStub.entities.Account.resetMemTables).toHaveBeenCalled();
		});
	});

	describe('#getTransactionsByIDs', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Transaction.get.mockResolvedValue(
				defaultTransactions,
			);
		});

		it('should call storage.Transaction.get and return transactions', async () => {
			// Act
			const transactionsFromStorage = await storageAccess.getTransactionsByIDs([
				2,
				3,
			]);

			// Assert
			expect(transactionsFromStorage).toEqual(defaultTransactions);
			expect(storageStub.entities.Transaction.get).toHaveBeenCalled();
		});
	});

	describe('#isTransactionPersisted', () => {
		beforeEach(async () => {
			// Arrange
			storageStub.entities.Transaction.isPersisted.mockResolvedValue(true);
		});

		it('should call storage.Transaction.isTransactionPersisted and return boolean', async () => {
			// Act
			const existsInStorage = await storageAccess.isTransactionPersisted('1L');

			// Assert
			expect(existsInStorage).toEqual(true);
			expect(storageStub.entities.Transaction.isPersisted).toHaveBeenCalled();
		});
	});
});
