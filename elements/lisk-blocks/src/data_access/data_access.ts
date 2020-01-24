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
import { TransactionJSON } from '@liskhq/lisk-transactions';

import {
	Account,
	BlockJSON,
	Storage as DBStorage,
	StorageTransaction,
	TempBlock,
} from '../types';

import { Storage } from './storage';

export class DataAccess {
	private readonly _storage: Storage;

	public constructor(dbStorage: DBStorage) {
		this._storage = new Storage(dbStorage);
	}

	public async getBlockHeadersByIDs(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.getBlockHeadersByIDs(arrayOfBlockIds);

		return blocks;
	}

	public async getBlockHeadersByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.getBlockHeadersByHeightBetween(
			fromHeight,
			toHeight,
		);

		return blocks;
	}

	public async getBlockHeadersWithHeights(
		heightList: ReadonlyArray<number>,
	): Promise<BlockJSON[]> {
		const block = await this._storage.getBlockHeadersWithHeights(heightList);

		return block;
	}

	public async getBlockHeadersWithInterval(
		fromHeight: number,
		toHeight: number,
		numberOfActiveDelegates: number,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.getBlockHeadersWithInterval(
			fromHeight,
			toHeight,
			numberOfActiveDelegates,
		);

		return blocks;
	}

	public async getLastBlockHeader(): Promise<BlockJSON> {
		const block = await this._storage.getLastBlockHeader();

		return block;
	}

	public async getLastCommonBlockHeader(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockJSON> {
		const block = await this._storage.getLastCommonBlockHeader(arrayOfBlockIds);

		return block;
	}

	public async getExtendedBlocksById(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockJSON[]> {
		const block = await this._storage.getExtendedBlocksById(arrayOfBlockIds);

		return block;
	}

	public async getExtendedBlocksByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.getExtendedBlocksByHeightBetween(
			fromHeight,
			toHeight,
		);

		return blocks;
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

	public async getExtendedLastBlock(): Promise<BlockJSON> {
		const block = await this._storage.getExtendedLastBlock();

		return block;
	}

	public async getFirstBlockIdWithInterval(
		height: number,
		interval: number,
	): Promise<Array<Partial<BlockJSON>>> {
		const blocks = await this._storage.getFirstBlockIdWithInterval(
			height,
			interval,
		);

		return blocks;
	}

	public async isBlockPersisted(blockId: string): Promise<boolean> {
		const isPersisted = await this._storage.isBlockPersisted(blockId);

		return isPersisted;
	}

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
}
