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

export class Storage {
	private readonly _storage: DBStorage;

	public constructor(storage: DBStorage) {
		this._storage = storage;
	}

	/*
		Block headers
	*/

	public async getBlockHeadersByIDs(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.entities.Block.get(
			{ id_in: arrayOfBlockIds },
			{},
		);

		return blocks;
	}

	public async getBlockHeadersByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.entities.Block.get(
			{ height_gte: fromHeight, height_lte: toHeight },
			{},
		);

		return blocks;
	}

	public async getBlockHeadersWithHeights(
		heightList: ReadonlyArray<number>,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.entities.Block.get(
			{
				height_in: heightList,
			},
			{
				sort: 'height:asc',
				limit: heightList.length,
			},
		);

		return blocks;
	}

	public async getBlockHeadersWithInterval(
		fromHeight: number,
		toHeight: number,
		numberOfActiveDelegates: number,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.entities.Block.get(
			{ height_gte: fromHeight, height_lte: toHeight },
			{ limit: numberOfActiveDelegates, sort: 'height:asc' },
		);

		return blocks;
	}

	public async getLastBlockHeader(): Promise<BlockJSON> {
		const [lastBlockHeader] = await this._storage.entities.Block.get(
			{},
			{ limit: 1, sort: 'height:desc' },
		);

		return lastBlockHeader;
	}

	public async getLastCommonBlockHeader(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockJSON> {
		const [block] = await this._storage.entities.Block.get(
			{
				id_in: arrayOfBlockIds,
			},
			{ sort: 'height:desc', limit: 1 },
		);

		return block;
	}

	public async getBlockCount(): Promise<number> {
		const count = await this._storage.entities.Block.count({}, {});

		return count;
	}

	/*
		Extended blocks with transaction payload
	*/

	public async getExtendedBlocksById(
		arrayOfBlockIds: ReadonlyArray<string>,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.entities.Block.get(
			{ id_in: arrayOfBlockIds },
			{ extended: true },
		);

		return blocks;
	}

	public async getExtendedBlocksByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.entities.Block.get(
			{ height_gte: fromHeight, height_lte: toHeight },
			{ extended: true },
		);

		return blocks;
	}

	public async getExtendedLastBlock(): Promise<BlockJSON> {
		const [lastBlock] = await this._storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1, extended: true },
		);

		return lastBlock;
	}

	public async getTempBlocks(): Promise<TempBlock[]> {
		const tempBlocks = await this._storage.entities.TempBlock.get(
			{},
			{ sort: 'height:asc' },
		);

		return tempBlocks;
	}

	public async isTempBlockEmpty(): Promise<boolean> {
		const isEmpty = await this._storage.entities.TempBlock.isEmpty();

		return isEmpty;
	}

	public clearTempBlocks(): void {
		this._storage.entities.TempBlock.truncate();
	}

	public async getFirstBlockIdWithInterval(
		height: number,
		interval: number,
	): Promise<Array<Partial<BlockJSON>>> {
		const rows: Array<Partial<
			BlockJSON
		>> = await this._storage.entities.Block.getFirstBlockIdOfLastRounds({
			height,
			numberOfRounds: 5,
			numberOfDelegates: interval,
		});

		return rows;
	}

	public async isBlockPersisted(blockId: string): Promise<boolean> {
		const isPersisted = await this._storage.entities.Block.isPersisted({
			blockId,
		});

		return isPersisted;
	}

	/*
		Accounts
	*/

	public async getAccountsByPublicKey(
		arrayOfPublicKeys: ReadonlyArray<string>,
		tx?: StorageTransaction,
	): Promise<Account[]> {
		const accounts = await this._storage.entities.Account.get(
			{ publicKey_in: arrayOfPublicKeys },
			{},
			tx,
		);

		return accounts;
	}

	public async getAccountsByAddress(
		arrayOfAddresses: ReadonlyArray<string>,
		tx?: StorageTransaction,
	): Promise<Account[]> {
		const accounts = await this._storage.entities.Account.get(
			{ address_in: arrayOfAddresses },
			{},
			tx,
		);

		return accounts;
	}

	public async getDelegateAccounts(
		tx?: StorageTransaction,
	): Promise<Account[]> {
		const accounts = await this._storage.entities.Account.get(
			{ isDelegate: true },
			{ limit: 101, sort: ['voteWeight:desc', 'publicKey:asc'] },
			tx,
		);

		return accounts;
	}

	public async resetAccountMemTables(): Promise<void> {
		await this._storage.entities.Account.resetMemTables();
	}

	/*
		Transactions
	*/

	public async getTransactionsByIDs(
		arrayOfTransactionIds: ReadonlyArray<string>,
	): Promise<TransactionJSON[]> {
		const transactions = await this._storage.entities.Transaction.get({
			id_in: arrayOfTransactionIds,
		});

		return transactions;
	}

	public async isTransactionPersisted(transactionId: string): Promise<boolean> {
		const isPersisted = await this._storage.entities.Transaction.isPersisted({
			id: transactionId,
		});

		return isPersisted;
	}
}
