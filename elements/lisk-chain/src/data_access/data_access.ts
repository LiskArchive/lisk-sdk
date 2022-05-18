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

import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import { Transaction } from '../transaction';
import { RawBlock } from '../types';
import { BlockHeader } from '../block_header';
import { Block } from '../block';
import { Event } from '../event';

import { BlockCache } from './cache';
import { Storage as StorageAccess } from './storage';
import { BlockAssets } from '../block_assets';
import { CurrentState } from '../state_store';

interface DAConstructor {
	readonly db: KVStore;
	readonly minBlockHeaderCache: number;
	readonly maxBlockHeaderCache: number;
	readonly keepEventsForHeights: number;
}

export class DataAccess {
	private readonly _storage: StorageAccess;
	private readonly _blocksCache: BlockCache;

	public constructor({
		db,
		minBlockHeaderCache,
		maxBlockHeaderCache,
		keepEventsForHeights,
	}: DAConstructor) {
		this._storage = new StorageAccess(db, { keepEventsForHeights });
		this._blocksCache = new BlockCache(minBlockHeaderCache, maxBlockHeaderCache);
	}

	// BlockHeaders are all the block properties included for block signature + signature of block
	/** Begin: BlockHeaders */
	public addBlockHeader(blockHeader: BlockHeader): BlockHeader[] {
		return this._blocksCache.add(blockHeader);
	}

	public async removeBlockHeader(id: Buffer): Promise<BlockHeader[]> {
		const cachedItems = this._blocksCache.remove(id);

		if (!this._blocksCache.needsRefill) {
			return cachedItems;
		}

		// Get the height limits to fetch
		// The method getBlocksByHeightBetween uses gte & lte so we need to adjust values
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const upperHeightToFetch = this._blocksCache.items[0]?.height - 1 || 0;

		const lowerHeightToFetch = Math.max(
			upperHeightToFetch - (this._blocksCache.maxCachedItems - this._blocksCache.minCachedItems),
			1,
		);

		if (upperHeightToFetch - lowerHeightToFetch > 0) {
			const blockHeaders = await this.getBlockHeadersByHeightBetween(
				lowerHeightToFetch,
				upperHeightToFetch,
			);
			// The method returns in descending order but we need in ascending order so reverse the array
			this._blocksCache.refill(blockHeaders.reverse());
		}

		return cachedItems;
	}

	public resetBlockHeaderCache(): void {
		this._blocksCache.empty();
	}

	public async getBlockHeaderByID(id: Buffer): Promise<BlockHeader> {
		const cachedBlock = this._blocksCache.getByID(id);

		if (cachedBlock) {
			return cachedBlock;
		}
		const blockHeaderBuffer = await this._storage.getBlockHeaderByID(id);

		return BlockHeader.fromBytes(blockHeaderBuffer);
	}

	public async blockHeaderExists(id: Buffer): Promise<boolean> {
		const cachedBlock = this._blocksCache.getByID(id);
		if (cachedBlock) {
			return true;
		}
		try {
			// if header does not exist, it will throw not found error
			await this._storage.getBlockHeaderByID(id);
			return true;
		} catch (error) {
			return false;
		}
	}

	public async getBlockHeadersByIDs(
		arrayOfBlockIds: ReadonlyArray<Buffer>,
	): Promise<BlockHeader[]> {
		const cachedBlocks = this._blocksCache.getByIDs(arrayOfBlockIds);

		if (cachedBlocks.length) {
			return cachedBlocks;
		}
		const blocks = await this._storage.getBlockHeadersByIDs(arrayOfBlockIds);

		return blocks.map(block => BlockHeader.fromBytes(block));
	}

	public async getBlockHeaderByHeight(height: number): Promise<BlockHeader> {
		const cachedBlock = this._blocksCache.getByHeight(height);

		if (cachedBlock) {
			return cachedBlock;
		}
		const header = await this._storage.getBlockHeaderByHeight(height);

		return BlockHeader.fromBytes(header);
	}

	public async getBlockHeadersByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<BlockHeader[]> {
		const cachedBlocks = this._blocksCache.getByHeightBetween(fromHeight, toHeight);

		if (cachedBlocks.length) {
			return cachedBlocks;
		}

		const blocks = await this._storage.getBlockHeadersByHeightBetween(fromHeight, toHeight);

		return blocks.map(block => BlockHeader.fromBytes(block));
	}

	public async getBlockHeadersWithHeights(
		heightList: ReadonlyArray<number>,
	): Promise<BlockHeader[]> {
		const cachedBlocks = this._blocksCache.getByHeights(heightList);

		if (cachedBlocks.length) {
			return cachedBlocks;
		}

		const blocks = await this._storage.getBlockHeadersWithHeights(heightList);

		return blocks.map(block => BlockHeader.fromBytes(block));
	}

	public async getLastBlockHeader(): Promise<BlockHeader> {
		const cachedBlock = this._blocksCache.last;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (cachedBlock) {
			return cachedBlock;
		}

		const block = await this._storage.getLastBlockHeader();

		return BlockHeader.fromBytes(block);
	}

	public async getHighestCommonBlockID(
		arrayOfBlockIds: ReadonlyArray<Buffer>,
	): Promise<Buffer | undefined> {
		const headers = this._blocksCache.getByIDs(arrayOfBlockIds);
		headers.sort((a, b) => b.height - a.height);
		const cachedBlockHeader = headers[0];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (cachedBlockHeader) {
			return cachedBlockHeader.id;
		}

		const storageBlockHeaders = [];
		for (const id of arrayOfBlockIds) {
			try {
				// it should not decode the asset since it might include the genesis block
				const blockHeader = await this.getBlockHeaderByID(id);
				storageBlockHeaders.push(blockHeader);
			} catch (error) {
				if (!(error instanceof NotFoundError)) {
					throw error;
				}
			}
		}
		storageBlockHeaders.sort((a, b) => b.height - a.height);

		return storageBlockHeaders[0]?.id;
	}

	/** End: BlockHeaders */

	/** Begin: Blocks */

	public async getBlockByID(id: Buffer): Promise<Block> {
		const block = await this._storage.getBlockByID(id);
		return this._decodeRawBlock(block);
	}

	public async getBlocksByIDs(arrayOfBlockIds: ReadonlyArray<Buffer>): Promise<Block[]> {
		const blocks = await this._storage.getBlocksByIDs(arrayOfBlockIds);

		return blocks.map(block => this._decodeRawBlock(block));
	}

	public async getBlockByHeight(height: number): Promise<Block> {
		const block = await this._storage.getBlockByHeight(height);

		return this._decodeRawBlock(block);
	}

	public async getBlocksByHeightBetween(fromHeight: number, toHeight: number): Promise<Block[]> {
		const blocks = await this._storage.getBlocksByHeightBetween(fromHeight, toHeight);

		return blocks.map(block => this._decodeRawBlock(block));
	}

	public async getLastBlock(): Promise<Block> {
		const block = await this._storage.getLastBlock();

		return this._decodeRawBlock(block);
	}

	public async getEvents(height: number): Promise<Event[]> {
		const events = await this._storage.getEvents(height);

		return events;
	}

	public async isBlockPersisted(blockId: Buffer): Promise<boolean> {
		const isPersisted = await this._storage.isBlockPersisted(blockId);

		return isPersisted;
	}

	public async getTempBlocks(): Promise<Block[]> {
		const blocks = await this._storage.getTempBlocks();

		return blocks.map(block => Block.fromBytes(block));
	}

	public async isTempBlockEmpty(): Promise<boolean> {
		const isEmpty = await this._storage.isTempBlockEmpty();

		return isEmpty;
	}

	public async clearTempBlocks(): Promise<void> {
		await this._storage.clearTempBlocks();
	}
	/** End: Blocks */

	/** Begin: Transactions */
	public async getTransactionByID(id: Buffer): Promise<Transaction> {
		const transaction = await this._storage.getTransactionByID(id);
		return Transaction.fromBytes(transaction);
	}

	public async getTransactionsByIDs(
		arrayOfTransactionIds: ReadonlyArray<Buffer>,
	): Promise<Transaction[]> {
		const transactions = await this._storage.getTransactionsByIDs(arrayOfTransactionIds);

		return transactions.map(transaction => Transaction.fromBytes(transaction));
	}

	public async isTransactionPersisted(transactionId: Buffer): Promise<boolean> {
		const isPersisted = await this._storage.isTransactionPersisted(transactionId);

		return isPersisted;
	}
	/** End: Transactions */

	public async getFinalizedHeight(): Promise<number> {
		return this._storage.getFinalizedHeight();
	}

	/*
		Save Block
	*/
	public async saveBlock(
		block: Block,
		events: Event[],
		state: CurrentState,
		finalizedHeight: number,
		removeFromTemp = false,
	): Promise<void> {
		const { id: blockID, height } = block.header;
		const encodedHeader = block.header.getBytes();

		const encodedTransactions = [];
		for (const tx of block.transactions) {
			const txID = tx.id;
			const encodedTx = tx.getBytes();
			encodedTransactions.push({ id: txID, value: encodedTx });
		}
		const encodedEvents = events.map(e => e.getBytes());
		await this._storage.saveBlock(
			blockID,
			height,
			finalizedHeight,
			encodedHeader,
			encodedTransactions,
			encodedEvents,
			block.assets.getBytes(),
			state,
			removeFromTemp,
		);
	}

	public async deleteBlock(block: Block, state: CurrentState, saveToTemp = false): Promise<void> {
		const { id: blockID, height } = block.header;
		const txIDs = block.transactions.map(tx => tx.id);

		const encodedBlock = block.getBytes();
		await this._storage.deleteBlock(
			blockID,
			height,
			txIDs,
			block.assets.getBytes(),
			encodedBlock,
			state,
			saveToTemp,
		);
	}

	private _decodeRawBlock(block: RawBlock): Block {
		const header = BlockHeader.fromBytes(block.header);
		const transactions = block.transactions.map(txBytes => Transaction.fromBytes(txBytes));
		const assets = BlockAssets.fromBytes(block.assets);
		return new Block(header, transactions, assets);
	}
}
