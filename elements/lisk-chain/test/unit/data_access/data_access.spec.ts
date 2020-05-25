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
import { Readable } from 'stream';
import { when } from 'jest-when';
import {
	KVStore,
	formatInt,
	NotFoundError,
	getFirstPrefix,
	getLastPrefix,
} from '@liskhq/lisk-db';
import { TransferTransaction } from '@liskhq/lisk-transactions';
import { DataAccess } from '../../../src/data_access';
import { BlockHeader as BlockHeaderInstance } from '../../fixtures/block';
import { BlockInstance, BlockJSON } from '../../../src/types';

jest.mock('@liskhq/lisk-db');

describe('data_access', () => {
	let dataAccess: DataAccess;
	let db: any;
	let block: BlockInstance;

	beforeEach(() => {
		db = new KVStore('temp');
		(db.createReadStream as jest.Mock).mockReturnValue(Readable.from([]));
		(formatInt as jest.Mock).mockImplementation(num => num);
		(getFirstPrefix as jest.Mock).mockImplementation(str => str);
		(getLastPrefix as jest.Mock).mockImplementation(str => str);
		dataAccess = new DataAccess({
			db,
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
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getBlockHeadersByIDs([block.id]);

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			(db.get as jest.Mock).mockResolvedValue(
				Buffer.from(JSON.stringify(block)),
			);
			// Act
			await dataAccess.getBlockHeadersByIDs([block.id]);

			// Assert
			expect(db.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeaderByHeight', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getBlockHeaderByHeight(1);

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted block header if cache does not exist', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([
					{
						value: Buffer.from(JSON.stringify(block.id)),
					},
				]),
			);
			when(db.get)
				.calledWith(`blocks:height:${formatInt(block.height)}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(block.id)) as never)
				.calledWith(`blocks:id:${block.id}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(block)) as never);
			// Act
			await dataAccess.getBlockHeaderByHeight(1);

			// Assert
			expect(db.get).toHaveBeenCalledTimes(2);
			expect(db.get).toHaveBeenCalledWith(
				`blocks:height:${formatInt(block.height)}`,
			);
			expect(db.get).toHaveBeenCalledWith(`blocks:id:${block.id}`);
		});
	});

	describe('#getBlockHeadersByHeightBetween', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader({ ...block, height: 0 });
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getBlockHeadersByHeightBetween(0, 1);

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			(dataAccess as any)._blocksCache.items.shift();
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([
					{
						value: Buffer.from(JSON.stringify(block.id)),
					},
				]),
			);
			(db.get as jest.Mock).mockResolvedValue(
				Buffer.from(JSON.stringify(block)),
			);

			// Act
			await dataAccess.getBlockHeadersByHeightBetween(0, 1);

			// Assert
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(db.get).toHaveBeenCalledTimes(1);
		});
	});

	describe('#getBlockHeadersWithHeights', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getBlockHeadersWithHeights([1]);

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			when(db.get)
				.calledWith(`blocks:height:${formatInt(block.height)}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(block.id)) as never)
				.calledWith(`blocks:id:${block.id}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(block)) as never);
			// Act
			await dataAccess.getBlockHeadersWithHeights([1]);

			// Assert
			expect(db.get).toHaveBeenCalledTimes(2);
			expect(db.get).toHaveBeenCalledWith(
				`blocks:height:${formatInt(block.height)}`,
			);
			expect(db.get).toHaveBeenCalledWith(`blocks:id:${block.id}`);
		});
	});

	describe('#getLastBlockHeader', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getLastBlockHeader();

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			(db.get as jest.Mock).mockResolvedValue(
				Buffer.from(JSON.stringify(block)),
			);
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([
					{
						value: Buffer.from(JSON.stringify(block.id)),
					},
				]),
			);
			// Act
			await dataAccess.getLastBlockHeader();

			// Assert
			expect(db.get).toHaveBeenCalledTimes(1);
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(db.get).toHaveBeenCalledWith(`blocks:id:${block.id}`);
		});
	});

	describe('#getLastCommonBlockHeader', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block);

			// Act
			await dataAccess.getLastCommonBlockHeader([block.id]);

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			(db.get as jest.Mock).mockResolvedValue(
				Buffer.from(JSON.stringify(block)),
			);
			// Act
			await dataAccess.getLastCommonBlockHeader([block.id, 'random-id']);

			// Assert
			expect(db.get).toHaveBeenCalledTimes(2);
		});
	});

	describe('#getBlocksByIDs', () => {
		it('should return persisted blocks by ids', async () => {
			// Arrange
			when(db.get)
				.mockRejectedValue(new NotFoundError('Data not found') as never)
				.calledWith('blocks:id:1')
				.mockResolvedValue(Buffer.from(JSON.stringify(block)) as never);
			// Act
			await dataAccess.getBlocksByIDs(['1']);

			// Assert
			expect(db.get).toHaveBeenCalledWith('blocks:id:1');
		});
	});

	describe('#getBlocksByHeightBetween', () => {
		it('should return persisted blocks within the height range', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([
					{
						value: Buffer.from(JSON.stringify(block.id)),
					},
				]),
			);
			when(db.get)
				.mockRejectedValue(new NotFoundError('Data not found') as never)
				.calledWith(`blocks:id:${block.id}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(block)) as never);
			// Act
			await dataAccess.getBlocksByHeightBetween(1, 2);

			// Assert
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(db.get).toHaveBeenCalledTimes(2);
		});
	});

	describe('#getLastBlock', () => {
		it('should get the highest height block', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([
					{
						value: Buffer.from(JSON.stringify(block.id)),
					},
				]),
			);
			when(db.get)
				.mockRejectedValue(new NotFoundError('Data not found') as never)
				.calledWith(`blocks:id:${block.id}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(block)) as never);
			// Act
			await dataAccess.getLastBlock();

			// Assert
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(db.get).toHaveBeenCalledTimes(2);
		});
	});

	describe('#isBlockPersisted', () => {
		it('should call check if the id exists in the database', async () => {
			// Act
			await dataAccess.isBlockPersisted(block.id);

			// Assert
			expect(db.exists).toHaveBeenCalledWith(`blocks:id:${block.id}`);
		});
	});

	describe('#getTempBlocks', () => {
		it('should call get temp blocks using stream', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockImplementation(() =>
				Readable.from([
					{
						value: Buffer.from(JSON.stringify(block)),
					},
				]),
			);
			// Act
			await dataAccess.getTempBlocks();

			// Assert
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
		});
	});

	describe('#isTempBlockEmpty', () => {
		it('should return false when temp block exist', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockImplementation(() =>
				Readable.from([
					{
						value: Buffer.from(JSON.stringify(block)),
					},
				]),
			);
			// Act
			const result = await dataAccess.isTempBlockEmpty();

			// Assert
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(result).toBeFalse();
		});

		it('should return true when temp block exist', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockImplementation(() =>
				Readable.from([]),
			);
			// Act
			const result = await dataAccess.isTempBlockEmpty();

			// Assert
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(result).toBeTrue();
		});
	});

	describe('#clearTempBlocks', () => {
		it('should call db clear function', async () => {
			// Act
			await dataAccess.clearTempBlocks();

			// Assert
			expect(db.clear).toHaveBeenCalledTimes(1);
			expect(db.clear).toHaveBeenCalledWith({
				gte: expect.stringContaining('tempBlocks:height'),
				lte: expect.stringContaining('tempBlocks:height'),
			});
		});
	});

	describe('#getAccountsByPublicKey', () => {
		it('should convert public key to address and get by address', async () => {
			// Arrange
			const account = {
				publicKey:
					'456efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
				address: 'cc96c0a5db38b968f563e7af6fb435585c889111',
				nonce: '0',
			};
			when(db.get)
				.calledWith(`accounts:address:${account.address}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(account)) as never);
			// Act
			const [result] = await dataAccess.getAccountsByPublicKey([
				account.publicKey,
			]);

			// Assert
			expect(db.get).toHaveBeenCalledWith(
				`accounts:address:${account.address}`,
			);
			expect(typeof result.nonce).toBe('bigint');
		});
	});

	describe('#getAccountByAddress', () => {
		it('should get account by address and decode them', async () => {
			// Arrange
			const account = {
				publicKey:
					'456efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
				address: '7546125166665832140L',
				nonce: '0',
				balance: '100',
			};
			when(db.get)
				.calledWith(`accounts:address:${account.address}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(account)) as never);
			// Act
			const result = await dataAccess.getAccountByAddress(account.address);

			// Assert
			expect(db.get).toHaveBeenCalledWith(
				`accounts:address:${account.address}`,
			);
			expect(typeof result.balance).toEqual('bigint');
		});
	});

	describe('#getAccountsByAddress', () => {
		it('should get accounts by each address and decode them', async () => {
			// Arrange
			const accounts = [
				{
					publicKey:
						'456efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e',
					address: '7546125166665832140L',
					nonce: '0',
					balance: '100',
				},
				{
					publicKey:
						'd468707933e4f24888dc1f00c8f84b2642c0edf3d694e2bb5daa7a0d87d18708',
					address: '10676488814586252632L',
					nonce: '0',
					balance: '300',
				},
			];
			when(db.get)
				.calledWith(`accounts:address:${accounts[0].address}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(accounts[0])) as never)
				.calledWith(`accounts:address:${accounts[1].address}`)
				.mockResolvedValue(Buffer.from(JSON.stringify(accounts[1])) as never);
			// Act
			const result = await dataAccess.getAccountsByAddress(
				accounts.map(acc => acc.address),
			);

			// Assert
			expect(db.get).toHaveBeenCalledTimes(2);
			expect(typeof result[0].balance).toEqual('bigint');
		});
	});

	describe('#getTransactionsByIDs', () => {
		it('should get transaction by id', async () => {
			// Arrange
			when(db.get)
				.calledWith('transactions:id:1')
				.mockResolvedValue(
					Buffer.from(
						JSON.stringify({
							id: '1',
							fee: '100',
							nonce: '0',
							type: 8,
						}),
					) as never,
				);
			// Act
			const [result] = await dataAccess.getTransactionsByIDs(['1']);

			// Assert
			expect(db.get).toHaveBeenCalledWith('transactions:id:1');
			expect(typeof result.fee).toBe('bigint');
		});
	});

	describe('#isTransactionPersisted', () => {
		it('should call exists with the id', async () => {
			// Act
			await dataAccess.isTransactionPersisted('1');

			// Assert
			expect(db.exists).toHaveBeenCalledWith('transactions:id:1');
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

			db.get.mockResolvedValue([{ height: 9 }, { height: 8 }, { height: 7 }]);

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
