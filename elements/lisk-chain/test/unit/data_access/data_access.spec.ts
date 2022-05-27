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
import { formatInt, NotFoundError, getFirstPrefix, getLastPrefix, KVStore } from '@liskhq/lisk-db';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { DataAccess } from '../../../src/data_access';
import { createFakeBlockHeader, createValidDefaultBlock } from '../../utils/block';
import { Transaction } from '../../../src/transaction';
import { concatDBKeys } from '../../../src/utils';
import {
	DB_KEY_BLOCKS_HEIGHT,
	DB_KEY_BLOCKS_ID,
	DB_KEY_TRANSACTIONS_ID,
	DB_KEY_TEMPBLOCKS_HEIGHT,
	DB_KEY_BLOCK_EVENTS,
} from '../../../src/db_keys';
import { Block } from '../../../src/block';
import { Event } from '../../../src/event';
import { BlockAssets, BlockHeader } from '../../../src';
import { encodeByteArray } from '../../../src/data_access/storage';

jest.mock('@liskhq/lisk-db');

describe('data_access', () => {
	let dataAccess: DataAccess;
	let db: any;
	let block: Block;

	beforeEach(async () => {
		db = new KVStore('temp');
		(db.createReadStream as jest.Mock).mockReturnValue(Readable.from([]));
		(formatInt as jest.Mock).mockImplementation(n => {
			const buf = Buffer.alloc(4);
			buf.writeUInt32BE(n, 0);
			return buf;
		});
		(getFirstPrefix as jest.Mock).mockImplementation(str => str);
		(getLastPrefix as jest.Mock).mockImplementation(str => str);
		dataAccess = new DataAccess({
			db,
			minBlockHeaderCache: 3,
			maxBlockHeaderCache: 5,
			keepEventsForHeights: 1,
		});
		block = await createValidDefaultBlock({ header: { height: 1 } });
	});

	afterEach(() => {
		// Clear block cache
		// eslint-disable-next-line no-unused-expressions
		(dataAccess as any)._blocksCache?.items?.shift();
		jest.clearAllMocks();
	});

	describe('#addBlockHeader', () => {
		it('should call blocksCache.add', () => {
			// Arrange
			(dataAccess as any)._blocksCache = { add: jest.fn() };
			// Act
			dataAccess.addBlockHeader(block.header);

			// Assert
			expect((dataAccess as any)._blocksCache.add).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeadersByIDs', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block.header);

			// Act
			await dataAccess.getBlockHeadersByIDs([block.header.id]);

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			(db.get as jest.Mock).mockResolvedValue(block.header.getBytes());
			// Act
			await dataAccess.getBlockHeadersByIDs([block.header.id]);

			// Assert
			expect(db.get).toHaveBeenCalled();
		});
	});

	describe('#getBlockHeaderByHeight', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block.header);

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
						value: block.header.id,
					},
				]),
			);
			when(db.get)
				.calledWith(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(block.header.height)))
				.mockResolvedValue(block.header.id as never)
				.calledWith(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id))
				.mockResolvedValue(block.header.getBytes() as never);
			// Act
			await dataAccess.getBlockHeaderByHeight(1);

			// Assert
			expect(db.get).toHaveBeenCalledTimes(2);
			expect(db.get).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(block.header.height)),
			);
			expect(db.get).toHaveBeenCalledWith(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id));
		});
	});

	describe('#getBlockHeadersByHeightBetween', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(new BlockHeader({ ...block.header['_getAllProps'](), height: 0 }));
			dataAccess.addBlockHeader(block.header);

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
						value: block.header.id,
					},
				]),
			);
			(db.get as jest.Mock).mockResolvedValue(block.header.getBytes());

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
			dataAccess.addBlockHeader(block.header);

			// Act
			await dataAccess.getBlockHeadersWithHeights([1]);

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			when(db.get)
				.calledWith(concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(block.header.height)))
				.mockResolvedValue(block.header.id as never)
				.calledWith(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id))
				.mockResolvedValue(block.header.getBytes() as never);
			// Act
			await dataAccess.getBlockHeadersWithHeights([1]);

			// Assert
			expect(db.get).toHaveBeenCalledTimes(2);
			expect(db.get).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_BLOCKS_HEIGHT, formatInt(block.header.height)),
			);
			expect(db.get).toHaveBeenCalledWith(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id));
		});
	});

	describe('#getLastBlockHeader', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block.header);

			// Act
			await dataAccess.getLastBlockHeader();

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			(db.get as jest.Mock).mockResolvedValue(block.header.getBytes());
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([
					{
						value: block.header.id,
					},
				]),
			);
			// Act
			await dataAccess.getLastBlockHeader();

			// Assert
			expect(db.get).toHaveBeenCalledTimes(1);
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(db.get).toHaveBeenCalledWith(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id));
		});
	});

	describe('#getHighestCommonBlockID', () => {
		it('should not call db if cache exists', async () => {
			// Arrange
			dataAccess.addBlockHeader(block.header);

			// Act
			await dataAccess.getHighestCommonBlockID([block.header.id]);

			// Assert
			expect(db.get).not.toHaveBeenCalled();
		});

		it('should return the highest height block from the cache if cache exist', async () => {
			// Arrange
			dataAccess.addBlockHeader(block.header);
			const additionalBlocks = [
				(await createValidDefaultBlock({ header: { height: 2 } })).header,
				(await createValidDefaultBlock({ header: { height: 3 } })).header,
				(await createValidDefaultBlock({ header: { height: 4 } })).header,
				(await createValidDefaultBlock({ header: { height: 5 } })).header,
				(await createValidDefaultBlock({ header: { height: 6 } })).header,
			];
			for (const header of additionalBlocks) {
				dataAccess.addBlockHeader(header);
			}

			// Act
			const commonBlockHeaderID = await dataAccess.getHighestCommonBlockID(
				additionalBlocks.slice(1, 4).map(h => h.id),
			);

			expect(commonBlockHeaderID).toEqual(additionalBlocks[3].id);
		});

		it('should return persisted blocks if cache does not exist', async () => {
			// Arrange
			(db.get as jest.Mock).mockResolvedValue(block.header.getBytes());
			// Act
			await dataAccess.getHighestCommonBlockID([block.header.id, Buffer.from('random-id')]);

			// Assert
			expect(db.get).toHaveBeenCalledTimes(2);
		});

		it('should get the block with highest height from provided ids parameter', async () => {
			// Arrange
			const headers = [createFakeBlockHeader(), createFakeBlockHeader()];
			jest.spyOn<any, any>(dataAccess, 'getBlockHeaderByID').mockImplementation(async (id: any) => {
				if (id.equals(headers[0].id)) {
					return Promise.resolve(headers[0]);
				}
				throw new NotFoundError('data not found');
			});

			// Act
			const result = await dataAccess.getHighestCommonBlockID(headers.map(h => h.id));

			// Assert
			expect(dataAccess['getBlockHeaderByID']).toHaveBeenCalledWith(headers[0].id);
			expect(dataAccess['getBlockHeaderByID']).toHaveBeenCalledWith(headers[1].id);
			expect(result).toEqual(headers[0].id);
		});

		it('should not throw error if unable to get blocks from the storage', async () => {
			// Arrange
			const ids = [Buffer.from('1'), Buffer.from('2')];
			jest
				.spyOn<any, any>(dataAccess, 'getBlockHeaderByID')
				.mockRejectedValue(new NotFoundError('data not found'));
			// Act && Assert
			const result = await dataAccess.getHighestCommonBlockID(ids);
			expect(dataAccess['getBlockHeaderByID']).toHaveBeenCalledWith(ids[0]);
			expect(dataAccess['getBlockHeaderByID']).toHaveBeenCalledWith(ids[1]);
			expect(result).toBeUndefined();
		});
	});

	describe('#getBlocksByIDs', () => {
		it('should return persisted blocks by ids', async () => {
			// Arrange
			when(db.get)
				.mockRejectedValue(new NotFoundError('Data not found') as never)
				.calledWith(concatDBKeys(DB_KEY_BLOCKS_ID, formatInt(1)))
				.mockResolvedValue(block.header.getBytes() as never);
			// Act
			await dataAccess.getBlocksByIDs([formatInt(1)]);

			// Assert
			expect(db.get).toHaveBeenCalledWith(concatDBKeys(DB_KEY_BLOCKS_ID, formatInt(1)));
		});
	});

	describe('#getBlocksByHeightBetween', () => {
		it('should return persisted blocks within the height range', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([
					{
						value: block.header.id,
					},
				]),
			);
			when(db.get)
				.mockRejectedValue(new NotFoundError('Data not found') as never)
				.calledWith(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id))
				.mockResolvedValue(block.header.getBytes() as never);
			// Act
			await dataAccess.getBlocksByHeightBetween(1, 2);

			// Assert
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(db.get).toHaveBeenCalledTimes(3);
		});
	});

	describe('#getLastBlock', () => {
		it('should get the highest height block', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockReturnValue(
				Readable.from([
					{
						value: block.header.id,
					},
				]),
			);
			when(db.get)
				.mockRejectedValue(new NotFoundError('Data not found') as never)
				.calledWith(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id))
				.mockResolvedValue(block.header.getBytes() as never);
			// Act
			await dataAccess.getLastBlock();

			// Assert
			expect(db.createReadStream).toHaveBeenCalledTimes(1);
			expect(db.get).toHaveBeenCalledTimes(3);
		});
	});

	describe('#getEvents', () => {
		it('should get the events related to heights', async () => {
			const original = [
				new Event({
					data: getRandomBytes(20),
					index: 0,
					moduleID: Buffer.from([0, 0, 0, 2]),
					topics: [getRandomBytes(32)],
					typeID: Buffer.from([0, 0, 0, 0]),
				}),
				new Event({
					data: getRandomBytes(20),
					index: 1,
					moduleID: Buffer.from([0, 0, 0, 3]),
					topics: [getRandomBytes(32)],
					typeID: Buffer.from([0, 0, 0, 0]),
				}),
			];
			db.get.mockResolvedValue(encodeByteArray(original.map(e => e.getBytes())) as never);

			const resp = await dataAccess.getEvents(30);
			expect(db.get).toHaveBeenCalledWith(concatDBKeys(DB_KEY_BLOCK_EVENTS, formatInt(30)));
			expect(resp).toEqual(original);
		});
	});

	describe('#isBlockPersisted', () => {
		it('should call check if the id exists in the database', async () => {
			// Act
			await dataAccess.isBlockPersisted(block.header.id);

			// Assert
			expect(db.exists).toHaveBeenCalledWith(concatDBKeys(DB_KEY_BLOCKS_ID, block.header.id));
		});
	});

	describe('#getTempBlocks', () => {
		it('should call get temp blocks using stream', async () => {
			// Arrange
			(db.createReadStream as jest.Mock).mockImplementation(() =>
				Readable.from([
					{
						value: block.getBytes(),
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
						value: block.getBytes(),
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
			(db.createReadStream as jest.Mock).mockImplementation(() => Readable.from([]));
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
				gte: DB_KEY_TEMPBLOCKS_HEIGHT,
				lte: DB_KEY_TEMPBLOCKS_HEIGHT,
			});
		});
	});

	describe('#getTransactionsByIDs', () => {
		it('should get transaction by id', async () => {
			const tx = new Transaction({
				moduleID: 2,
				commandID: 0,
				fee: BigInt('10000000'),
				nonce: BigInt('0'),
				senderPublicKey: Buffer.from(
					'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
					'hex',
				),
				signatures: [
					Buffer.from(
						'c49a1b9e8f5da4ddd9c8ad49b6c35af84c233701d53a876ef6e385a46888800334e28430166e2de8cac207452913f0e8b439b03ef8a795748ea23e28b8b1c00c',
						'hex',
					),
				],
				params: Buffer.alloc(0),
			});
			// Arrange
			when(db.get)
				.calledWith(concatDBKeys(DB_KEY_TRANSACTIONS_ID, tx.id))
				.mockResolvedValue(tx.getBytes() as never);
			// Act
			const [result] = await dataAccess.getTransactionsByIDs([tx.id]);

			// Assert
			expect(db.get).toHaveBeenCalledWith(concatDBKeys(DB_KEY_TRANSACTIONS_ID, tx.id));
			expect(typeof result.fee).toBe('bigint');
		});
	});

	describe('#isTransactionPersisted', () => {
		it('should call exists with the id', async () => {
			// Act
			await dataAccess.isTransactionPersisted(Buffer.from('1'));

			// Assert
			expect(db.exists).toHaveBeenCalledWith(
				concatDBKeys(DB_KEY_TRANSACTIONS_ID, Buffer.from('1')),
			);
		});
	});

	describe('removeBlockHeader', () => {
		it('should fetch older blocks from database when minCachedItems is below configured value', async () => {
			// Arrange
			jest.spyOn(dataAccess, 'getBlockHeadersByHeightBetween');

			const blocks = [];
			for (let i = 0; i < 5; i += 1) {
				block = new Block(createFakeBlockHeader({ height: i + 10 }), [], new BlockAssets());
				blocks.push(block);
				dataAccess.addBlockHeader(block.header);
			}

			// Act
			// Remove enough blocks for blocksCache.needsRefill to be true
			await dataAccess.removeBlockHeader(blocks[4].header.id);
			await dataAccess.removeBlockHeader(blocks[3].header.id);
			await dataAccess.removeBlockHeader(blocks[2].header.id);
			// Assert
			expect(dataAccess.getBlockHeadersByHeightBetween).toHaveBeenCalledWith(7, 9);
		});
	});
});
