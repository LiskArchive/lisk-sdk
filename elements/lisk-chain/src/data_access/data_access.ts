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
import { BaseTransaction, TransactionJSON } from '@liskhq/lisk-transactions';

import { KVStore } from '@liskhq/lisk-db';
import { Account } from '../account';
import {
	BlockHeader,
	BlockHeaderJSON,
	BlockInstance,
	BlockJSON,
} from '../types';

import { BlockCache } from './cache';
import { Storage as StorageAccess } from './storage';
import { TransactionInterfaceAdapter } from './transaction_interface_adapter';
import { StateStore } from '../state_store';

interface DAConstructor {
	readonly db: KVStore;
	readonly registeredTransactions: {
		readonly [key: number]: typeof BaseTransaction;
	};
	readonly minBlockHeaderCache: number;
	readonly maxBlockHeaderCache: number;
}

export class DataAccess {
	private readonly _storage: StorageAccess;
	private readonly _blocksCache: BlockCache;
	private readonly _transactionAdapter: TransactionInterfaceAdapter;

	public constructor({
		db,
		registeredTransactions,
		minBlockHeaderCache,
		maxBlockHeaderCache,
	}: DAConstructor) {
		this._storage = new StorageAccess(db);
		this._blocksCache = new BlockCache(
			minBlockHeaderCache,
			maxBlockHeaderCache,
		);
		this._transactionAdapter = new TransactionInterfaceAdapter(
			registeredTransactions,
		);
	}

	// BlockHeaders are all the block properties included for block signature + signature of block
	/** Begin: BlockHeaders */
	public addBlockHeader(blockHeader: BlockHeader): BlockHeader[] {
		return this._blocksCache.add(blockHeader);
	}

	public async removeBlockHeader(id: string): Promise<BlockHeader[]> {
		const cachedItems = this._blocksCache.remove(id);

		if (!this._blocksCache.needsRefill) {
			return cachedItems;
		}

		// Get the height limits to fetch
		// The method getBlocksByHeightBetween uses gte & lte so we need to adjust values
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const upperHeightToFetch = this._blocksCache.items[0]?.height - 1 || 0;

		const lowerHeightToFetch = Math.max(
			upperHeightToFetch -
				(this._blocksCache.maxCachedItems - this._blocksCache.minCachedItems),
			1,
		);

		if (upperHeightToFetch - lowerHeightToFetch > 0) {
			const blockHeaders = await this.getBlocksByHeightBetween(
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

	public async getBlockHeaderByID(id: string): Promise<BlockHeader> {
		const cachedBlock = this._blocksCache.getByID(id);

		if (cachedBlock) {
			return cachedBlock;
		}
		const blockJSON = await this._storage.getBlockHeaderByID(id);

		return this.deserializeBlockHeader(blockJSON);
	}

	public async getBlockHeadersByIDs(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockHeader[]> {
		const cachedBlocks = this._blocksCache.getByIDs(arrayOfBlockIds);

		if (cachedBlocks.length) {
			return cachedBlocks;
		}
		const blocks = await this._storage.getBlockHeadersByIDs(arrayOfBlockIds);

		return blocks.map(block => this.deserializeBlockHeader(block));
	}

	public async getBlockHeaderByHeight(height: number): Promise<BlockHeader> {
		const cachedBlock = this._blocksCache.getByHeight(height);

		if (cachedBlock) {
			return cachedBlock;
		}
		const header = await this._storage.getBlockHeaderByHeight(height);

		return this.deserializeBlockHeader(header);
	}

	public async getBlockHeadersByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<BlockHeader[]> {
		const cachedBlocks = this._blocksCache.getByHeightBetween(
			fromHeight,
			toHeight,
		);

		if (cachedBlocks.length) {
			return cachedBlocks;
		}

		const blocks = await this._storage.getBlockHeadersByHeightBetween(
			fromHeight,
			toHeight,
		);

		return blocks.map(block => this.deserializeBlockHeader(block));
	}

	public async getBlockHeadersWithHeights(
		heightList: ReadonlyArray<number>,
	): Promise<BlockHeader[]> {
		const cachedBlocks = this._blocksCache.getByHeights(heightList);

		if (cachedBlocks.length) {
			return cachedBlocks;
		}

		const blocks = await this._storage.getBlockHeadersWithHeights(heightList);

		return blocks.map(block => this.deserializeBlockHeader(block));
	}

	public async getLastBlockHeader(): Promise<BlockHeader> {
		const cachedBlock = this._blocksCache.last;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (cachedBlock) {
			return cachedBlock;
		}

		const block = await this._storage.getLastBlockHeader();

		return this.deserializeBlockHeader(block);
	}

	public async getLastCommonBlockHeader(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockHeader | undefined> {
		const blocks = this._blocksCache.getByIDs(arrayOfBlockIds);
		const cachedBlock = blocks[blocks.length - 1];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (cachedBlock) {
			return cachedBlock;
		}

		const block = await this._storage.getLastCommonBlockHeader(arrayOfBlockIds);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		return block ? this.deserializeBlockHeader(block) : undefined;
	}

	/** End: BlockHeaders */

	/** Begin: Blocks */

	public async getBlockByID(id: string): Promise<BlockInstance> {
		const blockJSON = await this._storage.getBlockByID(id);

		return this.deserialize(blockJSON);
	}

	public async getBlocksByIDs(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockInstance[]> {
		const blocks = await this._storage.getBlocksByIDs(arrayOfBlockIds);

		return blocks.map(block => this.deserialize(block));
	}

	public async getBlockByHeight(
		height: number,
	): Promise<BlockHeader | undefined> {
		const block = await this._storage.getBlockByHeight(height);

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		return block ? this.deserialize(block) : undefined;
	}

	public async getBlocksByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<BlockInstance[]> {
		const blocks = await this._storage.getBlocksByHeightBetween(
			fromHeight,
			toHeight,
		);

		return blocks.map(block => this.deserialize(block));
	}

	public async getLastBlock(): Promise<BlockInstance> {
		const block = await this._storage.getLastBlock();

		return this.deserialize(block);
	}

	public async isBlockPersisted(blockId: string): Promise<boolean> {
		const isPersisted = await this._storage.isBlockPersisted(blockId);

		return isPersisted;
	}

	public async getTempBlocks(): Promise<BlockJSON[]> {
		const blocks = await this._storage.getTempBlocks();

		return blocks;
	}

	public async isTempBlockEmpty(): Promise<boolean> {
		const isEmpty = await this._storage.isTempBlockEmpty();

		return isEmpty;
	}

	public async clearTempBlocks(): Promise<void> {
		await this._storage.clearTempBlocks();
	}
	/** End: Blocks */

	/** Begin: ChainState */
	public async getChainState(key: string): Promise<string | undefined> {
		return this._storage.getChainState(key);
	}
	/** End: ChainState */

	/** Begin ConsensusState */
	public async getConsensusState(key: string): Promise<string | undefined> {
		return this._storage.getConsensusState(key);
	}
	/** End: ConsensusState */

	/** Begin: Accounts */
	public async getAccountsByPublicKey(
		arrayOfPublicKeys: ReadonlyArray<string>,
	): Promise<Account[]> {
		const accounts = await this._storage.getAccountsByPublicKey(
			arrayOfPublicKeys,
		);

		return accounts.map(account => new Account(account));
	}

	public async getAccountByAddress(address: string): Promise<Account> {
		const account = await this._storage.getAccountByAddress(address);

		return new Account(account);
	}

	public async getAccountsByAddress(
		arrayOfAddresses: ReadonlyArray<string>,
	): Promise<Account[]> {
		const accounts = await this._storage.getAccountsByAddress(arrayOfAddresses);

		return accounts.map(account => new Account(account));
	}
	/** End: Accounts */

	/** Begin: Transactions */
	public async getTransactionsByIDs(
		arrayOfTransactionIds: ReadonlyArray<string>,
	): Promise<BaseTransaction[]> {
		const transactions = await this._storage.getTransactionsByIDs(
			arrayOfTransactionIds,
		);

		return transactions.map(transaction =>
			this.deserializeTransaction(transaction),
		);
	}

	public async isTransactionPersisted(transactionId: string): Promise<boolean> {
		const isPersisted = await this._storage.isTransactionPersisted(
			transactionId,
		);

		return isPersisted;
	}
	/** End: Transactions */

	public serialize(blockInstance: BlockInstance): BlockJSON {
		const { transactions, ...blockHeader } = blockInstance;
		const blockHeaderJSON = this.serializeBlockHeader(blockHeader);
		const transactionsJSON = transactions.map(tx => ({
			...tx.toJSON(),
			blockId: blockInstance.id,
		}));

		return {
			...blockHeaderJSON,
			transactions: transactionsJSON,
		};
	}

	public deserialize(blockJSON: BlockJSON): BlockInstance {
		const transactions =
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			blockJSON.transactions?.map(transaction =>
				this._transactionAdapter.fromJSON(transaction),
			) ?? [];

		return {
			...blockJSON,
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			totalAmount: BigInt(blockJSON.totalAmount || 0),
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			totalFee: BigInt(blockJSON.totalFee || 0),
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			reward: BigInt(blockJSON.reward || 0),
			transactions,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	public serializeBlockHeader(blockHeader: BlockHeader): BlockHeaderJSON {
		return {
			...blockHeader,
			totalAmount: blockHeader.totalAmount.toString(),
			totalFee: blockHeader.totalFee.toString(),
			reward: blockHeader.reward.toString(),
		};
	}

	// eslint-disable-next-line class-methods-use-this
	public deserializeBlockHeader(blockHeader: BlockHeaderJSON): BlockHeader {
		return {
			...blockHeader,
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			totalAmount: BigInt(blockHeader.totalAmount || 0),
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			totalFee: BigInt(blockHeader.totalFee || 0),
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			reward: BigInt(blockHeader.reward || 0),
		};
	}

	public deserializeTransaction(
		transactionJSON: TransactionJSON,
	): BaseTransaction {
		return this._transactionAdapter.fromJSON(transactionJSON);
	}

	/*
		Save Block
	*/
	public async saveBlock(
		block: BlockInstance,
		stateStore: StateStore,
		removeFromTemp = false,
	): Promise<void> {
		const blockJSON = this.serialize(block);

		return this._storage.saveBlock(blockJSON, stateStore, removeFromTemp);
	}

	/*
		Delete Block
	*/
	public async deleteBlock(
		block: BlockInstance,
		stateStore: StateStore,
		saveToTemp = false,
	): Promise<void> {
		const blockJSON = this.serialize(block);

		return this._storage.deleteBlock(blockJSON, stateStore, saveToTemp);
	}
}
