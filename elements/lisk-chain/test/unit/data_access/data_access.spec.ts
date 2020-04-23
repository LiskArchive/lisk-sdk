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
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { DataAccess } from '../../../src/data_access';
import { BlockHeader as BlockHeaderInstance } from '../../fixtures/block';
import { BlockInstance, BlockJSON } from '../../../src/types';

describe('data_access.storage', () => {
	let dataAccess: DataAccess;
	let storageMock: any;
	let block: BlockInstance;

	beforeEach(() => {
		storageMock = {
			entities: {
				Block: {
					get: jest.fn().mockResolvedValue([{ height: 1 }]),
					getOne: jest.fn().mockResolvedValue([{ height: 1 }]),
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
					get: jest.fn().mockResolvedValue([{ balance: '0', address: '123L' }]),
					getOne: jest.fn(),
					resetMemTables: jest.fn(),
				},
				Transaction: {
					get: jest
						.fn()
						.mockResolvedValue([{ nonce: '2', type: 8, fee: '100' }]),
					isPersisted: jest.fn(),
				},
			},
		};

		dataAccess = new DataAccess({
			dbStorage: storageMock,
			registeredTransactions: { 8: TransferTransaction },
			minBlockHeaderCache: 3,
			maxBlockHeaderCache: 5,
		});
		block = {
			// eslint-disable-next-line new-cap
			...BlockHeaderInstance({ height: 1 }),
			totalAmount: 1,
			totalFee: 1,
			reward: 1,
			transactions: [],
		};
		dataAccess.deserializeBlockHeader = jest.fn().mockResolvedValue(block);
	});

	afterEach(() => {
		// Clear block cache
		(dataAccess as any)._blocksCache?.items?.shift();
		jest.clearAllMocks();
	});

	describe('#addBlockHeader', () => {
		it('should call blocksCache.add', () => {
			// Arrange
			(dataAccess as any)._blocksCache = { add: jest.fn() };
			// Act
			dataAccess.addBlockHeader(block);

			// Assert
			expect((dataAccess as any)._blocksCache.add).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersByIDs', () => {
		it('should not call storage if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getBlockHeadersByIDs([block.id]);

			// Assert
			expect(storageMock.entities.Block.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Act
			await dataAccess.getBlockHeadersByIDs([block.id]);

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeaderByHeight', () => {
		it('should not call storage if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getBlockHeaderByHeight(1);

			// Assert
			expect(storageMock.entities.Block.get).not.toHaveBeenCalled();
		});

		it('should return persisted block header if cache does not exist', async () => {
			// Act
			await dataAccess.getBlockHeaderByHeight(1);

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersByHeightBetween', () => {
		it('should not call storage if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader({ ...block, height: 0 });
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getBlockHeadersByHeightBetween(0, 1);

			// Assert
			expect(storageMock.entities.Block.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			(dataAccess as any)._blocksCache.items.shift();

			// Act
			await dataAccess.getBlockHeadersByHeightBetween(0, 1);

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersWithHeights', () => {
		it('should not call storage if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getBlockHeadersWithHeights([1]);

			// Assert
			expect(storageMock.entities.Block.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Act
			await dataAccess.getBlockHeadersWithHeights([1]);

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getLastBlockHeader', () => {
		it('should not call storage if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getLastBlockHeader();

			// Assert
			expect(storageMock.entities.Block.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Act
			await dataAccess.getLastBlockHeader();

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getLastCommonBlockHeader', () => {
		it('should not call storage if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getLastBlockHeader();

			// Assert
			expect(storageMock.entities.Block.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Act
			await dataAccess.getLastBlockHeader();

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockCount', () => {
		it('should call storage.getBlocksCount', async () => {
			// Act
			await dataAccess.getBlocksCount();

			// Assert
			expect(storageMock.entities.Block.count).toHaveBeenCalled();
		});
	});

	describe('#getBlocksByIDs', () => {
		it('should return persisted blocks if cache does not exist', async () => {
			// Act
			await dataAccess.getBlocksByIDs(['1']);

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getBlocksByHeightBetween', () => {
		it('should return persisted blocks if cache does not exist', async () => {
			// Act
			await dataAccess.getBlocksByHeightBetween(1, 2);

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#getLastBlock', () => {
		it('should call storage.getLastBlock', async () => {
			// Act
			await dataAccess.getLastBlock();

			// Assert
			expect(storageMock.entities.Block.get).toHaveBeenCalled();
		});
	});

	describe('#deleteBlocksWithHeightGreaterThan', () => {
		it('should call storage.Block.delete and return block', async () => {
			// Act
			await dataAccess.deleteBlocksWithHeightGreaterThan(1);

			// Assert
			expect(storageMock.entities.Block.delete).toHaveBeenCalled();
		});
	});

	describe('#isBlockPersisted', () => {
		it('should call storage.isBlockPersisted', async () => {
			// Act
			await dataAccess.isBlockPersisted(block.id);

			// Assert
			expect(storageMock.entities.Block.isPersisted).toHaveBeenCalled();
		});
	});

	describe('#getTempBlocks', () => {
		it('should call storage.getTempBlocks', async () => {
			// Act
			await dataAccess.getTempBlocks();

			// Assert
			expect(storageMock.entities.TempBlock.get).toHaveBeenCalled();
		});
	});

	describe('#isTempBlockEmpty', () => {
		it('should call storage.isTempBlockEmpty', async () => {
			// Act
			await dataAccess.isTempBlockEmpty();

			// Assert
			expect(storageMock.entities.TempBlock.isEmpty).toHaveBeenCalled();
		});
	});

	describe('#clearTempBlocks', () => {
		it('should call storage.clearTempBlocks', async () => {
			// Act
			await dataAccess.clearTempBlocks();

			// Assert
			expect(storageMock.entities.TempBlock.truncate).toHaveBeenCalled();
		});
	});

	describe('#getAccountsByPublicKey', () => {
		it('should call storage.getAccountsByPublicKey', async () => {
			// Act
			const [result] = await dataAccess.getAccountsByPublicKey(['1L']);

			// Assert
			expect(storageMock.entities.Account.get).toHaveBeenCalled();
			expect(typeof result.nonce).toBe('bigint');
		});
	});

	describe('#getAccountByAddress', () => {
		it('should call storage.getAccountsByAddress', async () => {
			// Act
			storageMock.entities.Account.getOne.mockResolvedValue({
				address: '1L',
				balance: '0',
			});
			const account = await dataAccess.getAccountByAddress('1L');

			// Assert
			expect(storageMock.entities.Account.getOne).toHaveBeenCalled();
			expect(typeof account.balance).toEqual('bigint');
		});
	});

	describe('#getAccountsByAddress', () => {
		it('should call storage.getAccountsByAddress', async () => {
			// Act
			storageMock.entities.Account.get.mockResolvedValue([
				{ address: '1L', balance: '0' },
			]);
			const accounts = await dataAccess.getAccountsByAddress(['1L']);

			// Assert
			expect(storageMock.entities.Account.get).toHaveBeenCalled();
			expect(typeof accounts[0].balance).toEqual('bigint');
		});
	});

	describe('#getTransactionsByIDs', () => {
		it('should call storage.getTransactionsByIDs', async () => {
			// Act
			const [result] = await dataAccess.getTransactionsByIDs(['1']);

			// Assert
			expect(storageMock.entities.Transaction.get).toHaveBeenCalled();
			expect(typeof result.fee).toBe('bigint');
		});
	});

	describe('#isTransactionPersisted', () => {
		it('should call storage.isTransactionPersisted', async () => {
			// Act
			await dataAccess.isTransactionPersisted('1');

			// Assert
			expect(storageMock.entities.Transaction.isPersisted).toHaveBeenCalled();
		});
	});

	describe('#resetAccountMemTables', () => {
		it('should call storage.resetAccountMemTables', async () => {
			// Act
			await dataAccess.resetAccountMemTables();

			// Assert
			expect(storageMock.entities.Account.resetMemTables).toHaveBeenCalled();
		});
	});

	describe('serialize', () => {
		it('should convert all the field to be JSON format', () => {
			const blockInstance = dataAccess.serialize(block);

			expect(blockInstance.reward).toBe(block.reward.toString());
			expect(blockInstance.totalFee).toBe(block.totalFee.toString());
			expect(blockInstance.totalAmount).toBe(block.totalAmount.toString());
		});
	});

	describe('deserialize', () => {
		const blockJSON = {
			totalFee: '10000000',
			totalAmount: '1',
			payloadHash:
				'564352bc451aca0e2aeca2aebf7a3d7af18dbac73eaa31623971bfc63d20339c',
			payloadLength: 117,
			numberOfTransactions: 1,
			version: 2,
			height: 2,
			transactions: [
				{
					id: '1065693148641117014',
					blockId: '7360015088758644957',
					type: 8,
					fee: '10000000',
					nonce: '0',
					senderPublicKey:
						'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
					signatures: [
						'c49a1b9e8f5da4ddd9c8ad49b6c35af84c233701d53a876ef6e385a46888800334e28430166e2de8cac207452913f0e8b439b03ef8a795748ea23e28b8b1c00c',
					],
					asset: {
						amount: '1',
						recipientId: '10361596175468657749L',
					},
				},
			],
			reward: '0',
			timestamp: 1000,
			generatorPublicKey:
				'1c51f8d57dd74b9cede1fa957f46559cd9596655c46ae9a306364dc5b39581d1',
			blockSignature:
				'acbe0321dfc4323dd0e6f41269d7dd875ae2bbc6adeb9a4b179cca00328c31e641599b5b0d16d9620886133ed977909d228ab777903f9c0d3842b9ea8630b909',
			id: '7360015088758644957',
			seedReveal: '00000000000000000000000000000000',
			previousBlockId: '1349213844499460766',
			maxHeightPreviouslyForged: 1,
			maxHeightPrevoted: 0,
		} as BlockJSON;

		it('should convert big number field to be instance', () => {
			const blockInstance = dataAccess.deserialize(blockJSON);

			expect(typeof blockInstance.totalAmount).toBe('bigint');
			expect(typeof blockInstance.totalFee).toBe('bigint');
			expect(typeof blockInstance.reward).toBe('bigint');
		});

		it('should convert transaction to be a class', () => {
			const blockInstance = dataAccess.deserialize(blockJSON);
			expect(blockInstance.transactions[0]).toBeInstanceOf(TransferTransaction);
		});
	});

	describe('removeBlockHeader', () => {
		it('should fetch older blocks from database when minCachedItems is below configured value', async () => {
			// Arrange
			jest.spyOn(dataAccess, 'getBlocksByHeightBetween');

			storageMock.entities.Block.get.mockResolvedValue([
				{ height: 9 },
				{ height: 8 },
				{ height: 7 },
			]);

			const blocks = [];
			for (let i = 0; i < 5; i += 1) {
				block = {
					// eslint-disable-next-line new-cap
					...BlockHeaderInstance({ height: i + 10 }),
					totalAmount: 1,
					totalFee: 1,
					reward: 1,
					transactions: [],
				};
				blocks.push(block);
				dataAccess.addBlockHeader(block);
			}

			// Act
			// Remove enough blocks for blocksCache.needsRefill to be true
			await dataAccess.removeBlockHeader(blocks[4].id);
			await dataAccess.removeBlockHeader(blocks[3].id);
			await dataAccess.removeBlockHeader(blocks[2].id);
			// Assert
			expect(dataAccess.getBlocksByHeightBetween).toHaveBeenCalledWith(7, 9);
		});
	});
});
