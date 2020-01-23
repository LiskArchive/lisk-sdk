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
	BlockHeader,
	BlockJSON,
	RoundDelegates,
	Storage,
	StorageTransaction,
	TempBlock,
} from '../types';

export class StorageAccess {
	private readonly _storage: Storage;

	public constructor(storage: Storage) {
		this._storage = storage;
	}

	public async getBlockHeadersByIDs(
		arrayOfBlockIds: string[],
		tx?: StorageTransaction,
	): Promise<BlockHeader[]> {
		const blocks = await this._storage.entities.Block.get(
			{ id_in: arrayOfBlockIds },
			{},
			tx,
		);

		return blocks;
	}

	public async getBlockHeadersByHeightBetween(
		fromHeight: number,
		toHeight: number,
		tx?: StorageTransaction,
	): Promise<BlockHeader[]> {
		const blocks = await this._storage.entities.Block.get(
			{ height_gte: fromHeight, height_lte: toHeight },
			{},
			tx,
		);

		return blocks;
	}

	public async getBlockHeadersWithHeights(
		heightList: ReadonlyArray<number>,
	): Promise<BlockHeader[]> {
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

	public async getBlockHeadersWithInterval(query: {
		readonly fromHeight: number;
		readonly toHeight: number;
		readonly numberOfActiveDelegates: number;
		readonly tx?: StorageTransaction;
	}): Promise<BlockHeader[]> {
		const blocks = await this._storage.entities.Block.get(
			{ height_gte: query.fromHeight, height_lte: query.toHeight },
			{ limit: query.numberOfActiveDelegates, sort: 'height:asc' },
			query.tx,
		);

		return blocks;
	}

	public async getLastBlockHeader(): Promise<BlockHeader> {
		const [lastBlockHeader] = await this._storage.entities.Block.get(
			{},
			{ limit: 1, sort: 'height:desc' },
		);

		return lastBlockHeader;
	}

	public async getLastCommonBlockHeader(
		arrayOfBlockIds: string[],
	): Promise<BlockJSON> {
		const [block] = await this._storage.entities.Block.get(
			{
				id_in: arrayOfBlockIds,
			},
			{ sort: 'height:desc', limit: 1 },
		);

		return block;
	}

	public async getBlocksById(
		arrayOfBlockIds: string[],
		tx?: StorageTransaction,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.entities.Block.get(
			{ id_in: arrayOfBlockIds },
			{ extended: true },
			tx,
		);

		return blocks;
	}

	public async getBlocksByHeight(
		fromHeight: number,
		toHeight: number,
		tx?: StorageTransaction,
	): Promise<BlockJSON[]> {
		const blocks = await this._storage.entities.Block.get(
			{ height_gte: fromHeight, height_lte: toHeight },
			{ extended: true },
			tx,
		);

		return blocks;
	}

	public async getTempBlocks(tx: StorageTransaction): Promise<TempBlock[]> {
		const tempBlocks = await this._storage.entities.TempBlock.get(
			{},
			{ sort: 'height:asc' },
			tx,
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

	public async getLatestBlock(): Promise<BlockJSON> {
		const [lastBlock] = await this._storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1, extended: true },
		);

		return lastBlock;
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

	public async getAccountsByPublicKey(
		arrayOfPublicKeys: string[],
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
		arrayOfAddresses: string[],
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

	public async getActiveDelegatesByLimit(
		limit: number,
		tx?: StorageTransaction,
	): Promise<ReadonlyArray<RoundDelegates>> {
		const delegateLists = await this._storage.entities.RoundDelegates.get(
			{},
			{
				sort: 'round:desc',
				limit,
			},
			tx,
		);

		return delegateLists;
	}

	public async getActiveDelegatesForRound(
		round: number,
		tx?: StorageTransaction,
	): Promise<ReadonlyArray<string>> {
		const delegatePublicKeys = await this._storage.entities.RoundDelegates.getActiveDelegatesForRound(
			round,
			tx,
		);

		return delegatePublicKeys;
	}

	public async getTransactionsByIDs(
		arrayOfTransactionIds: string[],
	): Promise<TransactionJSON[]> {
		const transactions = await this._storage.entities.Transaction.get({
			id_in: arrayOfTransactionIds,
		});

		return transactions;
	}

	public async resetAccountMemTables(): Promise<void> {
		await this._storage.entities.Account.resetMemTables();
	}
}
