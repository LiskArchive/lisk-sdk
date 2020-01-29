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

import {
	Account,
	BlockHeader,
	BlockHeaderJSON,
	BlockInstance,
	BlockJSON,
	BlockRound,
	Storage as DBStorage,
	StorageTransaction,
	TempBlock,
} from '../types';

import { Blocks as BlocksCache } from './cache';
import { Storage as StorageAccess } from './storage';
import { TransactionInterfaceAdapter } from './transaction_interface_adapter';

interface DAConstructor {
	readonly dbStorage: DBStorage;
	readonly networkIdentifier: string;
	readonly registeredTransactions: {
		readonly [key: number]: typeof BaseTransaction;
	};
}
export class DataAccess {
	private readonly _storage: StorageAccess;
	private readonly _blocksCache: BlocksCache;
	private readonly _transactionAdapter: TransactionInterfaceAdapter;

	public constructor({
		dbStorage,
		networkIdentifier,
		registeredTransactions,
	}: DAConstructor) {
		this._storage = new StorageAccess(dbStorage);
		this._blocksCache = new BlocksCache();
		this._transactionAdapter = new TransactionInterfaceAdapter(
			networkIdentifier,
			registeredTransactions,
		);
	}

	public get transactionAdapter(): TransactionInterfaceAdapter {
		return this._transactionAdapter;
	}

	/** Begin: BlockHeaders */
	public async getBlockHeadersByIDs(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockHeader[]> {
		const cachedBlocks = this._blocksCache.getByIDs(arrayOfBlockIds);

		if (cachedBlocks.length) {
			return cachedBlocks;
		}
		const blocks = await this._storage.getBlockHeadersByIDs(arrayOfBlockIds);

		return blocks?.map(block => this.deserializeBlockHeader(block));
	}

	public async getBlockHeaderByHeight(
		height: number,
	): Promise<BlockHeader | undefined> {
		const cachedBlock = this._blocksCache.getByHeight(height);

		if (cachedBlock) {
			return cachedBlock;
		}

		const block = await this._storage.getBlockByHeight(height);

		return block && this.deserializeBlockHeader(block);
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

		return blocks?.map(block => this.deserializeBlockHeader(block));
	}

	public async getBlockHeadersWithHeights(
		heightList: ReadonlyArray<number>,
	): Promise<BlockHeader[]> {
		const cachedBlocks = this._blocksCache.getByHeights(heightList);

		if (cachedBlocks.length) {
			return cachedBlocks;
		}

		const blocks = await this._storage.getBlockHeadersWithHeights(heightList);

		return blocks?.map(block => this.deserializeBlockHeader(block));
	}

	public async getLastBlockHeader(): Promise<BlockHeader | undefined> {
		const cachedBlock = this._blocksCache.getLastBlockHeader();

		if (cachedBlock) {
			return cachedBlock;
		}

		const block = await this._storage.getLastBlockHeader();

		return block && this.deserializeBlockHeader(block);
	}

	public async getLastCommonBlockHeader(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockHeader | undefined> {
		const cachedBlock = this._blocksCache.getLastCommonBlockHeader(
			arrayOfBlockIds,
		);

		if (cachedBlock) {
			return cachedBlock;
		}

		const block = await this._storage.getLastCommonBlockHeader(arrayOfBlockIds);

		return block && this.deserializeBlockHeader(block);
	}

	/** Begin: BlockHeaders */

	/** Begin: Blocks */

	public async getBlocksCount(): Promise<number> {
		const blocksCount = await this._storage.getBlocksCount();

		return blocksCount;
	}

	public async getBlocksByIDs(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockInstance[]> {
		const blocks = await this._storage.getBlocksByIDs(arrayOfBlockIds);

		return blocks?.map(block => this.deserialize(block));
	}

	public async getBlockByHeight(
		height: number,
	): Promise<BlockHeader | undefined> {
		const block = await this._storage.getBlockByHeight(height);

		return block && this.deserialize(block);
	}

	public async getBlocksByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<BlockInstance[]> {
		const blocks = await this._storage.getBlocksByHeightBetween(
			fromHeight,
			toHeight,
		);

		return blocks?.map(block => this.deserialize(block));
	}

	public async getLastBlock(): Promise<BlockInstance | undefined> {
		const block = await this._storage.getLastBlock();

		return block && this.deserialize(block);
	}

	public async getFirstBlockIdWithInterval(
		height: number,
		interval: number,
	): Promise<BlockRound[]> {
		const blockIds = await this._storage.getFirstBlockIdWithInterval(
			height,
			interval,
		);

		return blockIds;
	}

	public async isBlockPersisted(blockId: string): Promise<boolean> {
		const isPersisted = await this._storage.isBlockPersisted(blockId);

		return isPersisted;
	}

	public async getTempBlocks(): Promise<TempBlock[]> {
		const blocks = await this._storage.getTempBlocks();

		return blocks;
	}

	public async isTempBlockEmpty(): Promise<boolean> {
		const isEmpty = await this._storage.isTempBlockEmpty();

		return isEmpty;
	}

	public clearTempBlocks(): void {
		this._storage.clearTempBlocks();
	}
	/** Begin: Blocks */

	public async getAccountsByPublicKey(
		arrayOfPublicKeys: ReadonlyArray<string>,
		tx?: StorageTransaction,
	): Promise<Account[]> {
		const accounts = await this._storage.getAccountsByPublicKey(
			arrayOfPublicKeys,
			tx,
		);

		return accounts;
	}

	public async getAccountsByAddress(
		arrayOfAddresses: ReadonlyArray<string>,
		tx?: StorageTransaction,
	): Promise<Account[]> {
		const accounts = await this._storage.getAccountsByAddress(
			arrayOfAddresses,
			tx,
		);

		return accounts;
	}

	public async getDelegateAccounts(
		tx?: StorageTransaction,
	): Promise<Account[]> {
		const accounts = await this._storage.getDelegateAccounts(tx);

		return accounts;
	}

	public async getTransactionsByIDs(
		arrayOfTransactionIds: ReadonlyArray<string>,
	): Promise<TransactionJSON[]> {
		const transactions = await this._storage.getTransactionsByIDs(
			arrayOfTransactionIds,
		);

		return transactions;
	}

	public async isTransactionPersisted(transactionId: string): Promise<boolean> {
		const isPersisted = await this._storage.isTransactionPersisted(
			transactionId,
		);

		return isPersisted;
	}

	public async resetAccountMemTables(): Promise<void> {
		await this._storage.resetAccountMemTables();
	}

	// tslint:disable-next-line:prefer-function-over-method
	public serialize(blockInstance: BlockInstance): BlockJSON {
		const blockJSON = {
			...blockInstance,
			totalAmount: blockInstance.totalAmount.toString(),
			totalFee: blockInstance.totalFee.toString(),
			reward: blockInstance.reward.toString(),
			transactions: blockInstance.transactions.map(tx => ({
				...tx.toJSON(),
				blockId: blockInstance.id,
			})),
		};

		return blockJSON;
	}

	public deserialize(blockJSON: BlockJSON): BlockInstance {
		const transactions = (blockJSON.transactions || []).map(transaction =>
			this._transactionAdapter.fromJSON(transaction),
		);

		return {
			...blockJSON,
			totalAmount: BigInt(blockJSON.totalAmount || 0),
			totalFee: BigInt(blockJSON.totalFee || 0),
			reward: BigInt(blockJSON.reward || 0),
			transactions,
		};
	}

	// tslint:disable-next-line:prefer-function-over-method
	public deserializeBlockHeader(blockHeader: BlockHeaderJSON): BlockHeader {
		return {
			...blockHeader,
			totalAmount: BigInt(blockHeader.totalAmount || 0),
			totalFee: BigInt(blockHeader.totalFee || 0),
			reward: BigInt(blockHeader.reward || 0),
		};
	}

	public deserializeTransaction(
		transactionJSON: TransactionJSON,
	): BaseTransaction {
		return this._transactionAdapter.fromJSON(transactionJSON);
	}
}
