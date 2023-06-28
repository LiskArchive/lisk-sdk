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
import { Batch, Database, NotFoundError } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { getAddressFromPublicKey, hash } from '@liskhq/lisk-cryptography';
import { RawBlock, StateDiff } from '../types';
import { StateStore } from '../state_store';

import {
	DB_KEY_BLOCKS_ID,
	DB_KEY_BLOCKS_HEIGHT,
	DB_KEY_TRANSACTIONS_BLOCK_ID,
	DB_KEY_TRANSACTIONS_ID,
	DB_KEY_TEMPBLOCKS_HEIGHT,
	DB_KEY_ACCOUNTS_ADDRESS,
	DB_KEY_CHAIN_STATE,
	DB_KEY_CONSENSUS_STATE,
	DB_KEY_DIFF_STATE,
} from './constants';
import { keyString } from '../utils';
import { stateDiffSchema } from '../schema';

export const formatInt = (num: number | bigint): string => {
	let buf: Buffer;
	if (typeof num === 'bigint') {
		if (num < BigInt(0)) {
			throw new Error('Negative number cannot be formatted');
		}
		buf = Buffer.alloc(8);
		buf.writeBigUInt64BE(num);
	} else {
		if (num < 0) {
			throw new Error('Negative number cannot be formatted');
		}
		buf = Buffer.alloc(4);
		buf.writeUInt32BE(num, 0);
	}
	return buf.toString('binary');
};

export const getFirstPrefix = (prefix: string): Buffer => Buffer.from(`${prefix}\x00`);
export const getLastPrefix = (prefix: string): Buffer => Buffer.from(`${prefix}\xFF`);

export class Storage {
	private readonly _db: Database;

	public constructor(db: Database) {
		this._db = db;
	}

	/*
		Block headers
	*/
	public async getBlockHeaderByID(id: Buffer): Promise<Buffer> {
		const block = await this._db.get(Buffer.from(`${DB_KEY_BLOCKS_ID}:${keyString(id)}`));
		return block;
	}

	public async getBlockHeadersByIDs(arrayOfBlockIds: ReadonlyArray<Buffer>): Promise<Buffer[]> {
		const blocks = [];
		for (const id of arrayOfBlockIds) {
			try {
				const block = await this._db.get(Buffer.from(`${DB_KEY_BLOCKS_ID}:${keyString(id)}`));
				blocks.push(block);
			} catch (dbError) {
				if (dbError instanceof NotFoundError) {
					continue;
				}
				throw dbError;
			}
		}
		return blocks;
	}

	public async getBlockHeaderByHeight(height: number): Promise<Buffer> {
		const stringHeight = formatInt(height);
		const id = await this._db.get(Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${stringHeight}`));
		return this.getBlockHeaderByID(id);
	}

	public async getBlockHeadersByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<Buffer[]> {
		const stream = this._db.createReadStream({
			gte: Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(fromHeight)}`),
			lte: Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${formatInt(toHeight)}`),
			reverse: true,
		});
		const blockIDs = await new Promise<Buffer[]>((resolve, reject) => {
			const ids: Buffer[] = [];
			stream
				.on('data', ({ value }: { value: Buffer }) => {
					ids.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(ids);
				});
		});

		return this.getBlockHeadersByIDs(blockIDs);
	}

	public async getBlockHeadersWithHeights(heightList: ReadonlyArray<number>): Promise<Buffer[]> {
		const blocks = [];
		for (const height of heightList) {
			try {
				const block = await this.getBlockHeaderByHeight(height);
				blocks.push(block);
			} catch (dbError) {
				if (dbError instanceof NotFoundError) {
					continue;
				}
				throw dbError;
			}
		}
		return blocks;
	}

	public async getLastBlockHeader(): Promise<Buffer> {
		const stream = this._db.createReadStream({
			gte: Buffer.from(getFirstPrefix(DB_KEY_BLOCKS_HEIGHT)),
			lte: Buffer.from(getLastPrefix(DB_KEY_BLOCKS_HEIGHT)),
			reverse: true,
			limit: 1,
		});
		const [blockID] = await new Promise<Buffer[]>((resolve, reject) => {
			const ids: Buffer[] = [];
			stream
				.on('data', ({ value }: { value: Buffer }) => {
					ids.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(ids);
				});
		});
		if (!blockID) {
			throw new NotFoundError('Last block header not found');
		}

		return this.getBlockHeaderByID(blockID);
	}

	/*
		Extended blocks with transaction payload
	*/

	public async getBlockByID(id: Buffer): Promise<RawBlock> {
		const blockHeader = await this.getBlockHeaderByID(id);
		const transactions = await this._getTransactions(id);

		return {
			header: blockHeader,
			payload: transactions,
		};
	}

	public async getBlocksByIDs(arrayOfBlockIds: ReadonlyArray<Buffer>): Promise<RawBlock[]> {
		const blocks = [];

		for (const id of arrayOfBlockIds) {
			try {
				const block = await this.getBlockByID(id);
				blocks.push(block);
			} catch (dbError) {
				if (dbError instanceof NotFoundError) {
					continue;
				}
				throw dbError;
			}
		}

		return blocks;
	}

	public async getBlockByHeight(height: number): Promise<RawBlock> {
		const header = await this.getBlockHeaderByHeight(height);
		const blockID = hash(header);
		const transactions = await this._getTransactions(blockID);

		return {
			header,
			payload: transactions,
		};
	}

	public async getBlocksByHeightBetween(fromHeight: number, toHeight: number): Promise<RawBlock[]> {
		const headers = await this.getBlockHeadersByHeightBetween(fromHeight, toHeight);
		const blocks = [];
		for (const header of headers) {
			const blockID = hash(header);
			const transactions = await this._getTransactions(blockID);
			blocks.push({ header, payload: transactions });
		}

		return blocks;
	}

	public async getLastBlock(): Promise<RawBlock> {
		const header = await this.getLastBlockHeader();
		const blockID = hash(header);
		const transactions = await this._getTransactions(blockID);

		return {
			header,
			payload: transactions,
		};
	}

	public async getTempBlocks(): Promise<Buffer[]> {
		const stream = this._db.createReadStream({
			gte: getFirstPrefix(DB_KEY_TEMPBLOCKS_HEIGHT),
			lte: getLastPrefix(DB_KEY_TEMPBLOCKS_HEIGHT),
			reverse: true,
		});
		const tempBlocks = await new Promise<Buffer[]>((resolve, reject) => {
			const blocks: Buffer[] = [];
			stream
				.on('data', ({ value }: { value: Buffer }) => {
					blocks.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(blocks);
				});
		});

		return tempBlocks;
	}

	public async isTempBlockEmpty(): Promise<boolean> {
		const stream = this._db.createReadStream({
			gte: getFirstPrefix(DB_KEY_TEMPBLOCKS_HEIGHT),
			lte: getLastPrefix(DB_KEY_TEMPBLOCKS_HEIGHT),
			limit: 1,
		});
		const tempBlocks = await new Promise<Buffer[]>((resolve, reject) => {
			const blocks: Buffer[] = [];
			stream
				.on('data', ({ value }: { value: Buffer }) => {
					blocks.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(blocks);
				});
		});

		return tempBlocks.length === 0;
	}

	public async clearTempBlocks(): Promise<void> {
		await this._db.clear({
			gte: getFirstPrefix(DB_KEY_TEMPBLOCKS_HEIGHT),
			lte: getLastPrefix(DB_KEY_TEMPBLOCKS_HEIGHT),
		});
	}

	public async isBlockPersisted(blockID: Buffer): Promise<boolean> {
		return this._db.has(Buffer.from(`${DB_KEY_BLOCKS_ID}:${keyString(blockID)}`));
	}

	/*
		ChainState
	*/
	public async getChainState(key: string): Promise<Buffer | undefined> {
		try {
			const value = await this._db.get(Buffer.from(`${DB_KEY_CHAIN_STATE}:${key}`));

			return value;
		} catch (error) {
			if (error instanceof NotFoundError) {
				return undefined;
			}
			throw error;
		}
	}

	/*
		ConsensusState
	*/
	public async getConsensusState(key: string): Promise<Buffer | undefined> {
		try {
			const value = await this._db.get(Buffer.from(`${DB_KEY_CONSENSUS_STATE}:${key}`));

			return value;
		} catch (error) {
			if (error instanceof NotFoundError) {
				return undefined;
			}
			throw error;
		}
	}

	// TODO: Remove in next version
	// Warning: This function should never be used. This exist only for migration purpose.
	// Specifically, only to set genesis state between 5.1.2 => 5.1.3
	public async setConsensusState(key: string, val: Buffer): Promise<void> {
		await this._db.set(Buffer.from(`${DB_KEY_CONSENSUS_STATE}:${key}`), val);
	}

	/*
		Accounts
	*/
	public async getAccountByAddress(address: Buffer): Promise<Buffer> {
		const account = await this._db.get(Buffer.from(`${DB_KEY_ACCOUNTS_ADDRESS}:${keyString(address)}`));
		return account;
	}

	public async getAccountsByPublicKey(arrayOfPublicKeys: ReadonlyArray<Buffer>): Promise<Buffer[]> {
		const addresses = arrayOfPublicKeys.map(getAddressFromPublicKey);

		return this.getAccountsByAddress(addresses);
	}

	public async getAccountsByAddress(arrayOfAddresses: ReadonlyArray<Buffer>): Promise<Buffer[]> {
		const accounts = [];
		for (const address of arrayOfAddresses) {
			try {
				const account = await this.getAccountByAddress(address);
				accounts.push(account);
			} catch (dbError) {
				if (dbError instanceof NotFoundError) {
					continue;
				}
				throw dbError;
			}
		}

		return accounts;
	}

	/*
		Transactions
	*/
	public async getTransactionByID(id: Buffer): Promise<Buffer> {
		const transaction = await this._db.get(Buffer.from(`${DB_KEY_TRANSACTIONS_ID}:${keyString(id)}`));

		return transaction;
	}

	public async getTransactionsByIDs(
		arrayOfTransactionIds: ReadonlyArray<Buffer>,
	): Promise<Buffer[]> {
		const transactions = [];
		for (const id of arrayOfTransactionIds) {
			try {
				const transaction = await this.getTransactionByID(id);
				transactions.push(transaction);
			} catch (dbError) {
				if (dbError instanceof NotFoundError) {
					continue;
				}
				throw dbError;
			}
		}

		return transactions;
	}

	public async isTransactionPersisted(transactionId: Buffer): Promise<boolean> {
		return this._db.has(Buffer.from(`${DB_KEY_TRANSACTIONS_ID}:${keyString(transactionId)}`));
	}

	/*
		Save Block
	*/
	public async saveBlock(
		id: Buffer,
		height: number,
		finalizedHeight: number,
		header: Buffer,
		payload: { id: Buffer; value: Buffer }[],
		stateStore: StateStore,
		removeFromTemp = false,
	): Promise<void> {
		const heightStr = formatInt(height);
		const batch = new Batch();
		batch.set(Buffer.from(`${DB_KEY_BLOCKS_ID}:${keyString(id)}`), header);
		batch.set(Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${heightStr}`), id);
		if (payload.length > 0) {
			const ids = [];
			for (const { id: txID, value } of payload) {
				ids.push(txID);
				batch.set(Buffer.from(`${DB_KEY_TRANSACTIONS_ID}:${keyString(txID)}`), value);
			}
			batch.set(Buffer.from(`${DB_KEY_TRANSACTIONS_BLOCK_ID}:${keyString(id)}`), Buffer.concat(ids));
		}
		if (removeFromTemp) {
			batch.del(Buffer.from(`${DB_KEY_TEMPBLOCKS_HEIGHT}:${heightStr}`));
		}
		stateStore.finalize(heightStr, batch);
		await this._db.write(batch);
		await this._cleanUntil(finalizedHeight);
	}

	public async deleteBlock(
		id: Buffer,
		height: number,
		txIDs: Buffer[],
		fullBlock: Buffer,
		stateStore: StateStore,
		saveToTemp = false,
	): Promise<StateDiff> {
		const batch = new Batch();
		const heightStr = formatInt(height);
		batch.del(Buffer.from(`${DB_KEY_BLOCKS_ID}:${keyString(id)}`));
		batch.del(Buffer.from(`${DB_KEY_BLOCKS_HEIGHT}:${heightStr}`));
		if (txIDs.length > 0) {
			for (const txID of txIDs) {
				batch.del(Buffer.from(`${DB_KEY_TRANSACTIONS_ID}:${keyString(txID)}`));
			}
			batch.del(Buffer.from(`${DB_KEY_TRANSACTIONS_BLOCK_ID}:${keyString(id)}`));
		}
		if (saveToTemp) {
			batch.set(Buffer.from(`${DB_KEY_TEMPBLOCKS_HEIGHT}:${heightStr}`), fullBlock);
		}
		// Take the diff to revert back states
		const diffKey = `${DB_KEY_DIFF_STATE}:${heightStr}`;

		// If there is no diff, the key might not exist
		const stateDiff = await this._db.get(Buffer.from(diffKey));

		const {
			created: createdStates,
			updated: updatedStates,
			deleted: deletedStates,
		} = codec.decode<StateDiff>(stateDiffSchema, stateDiff);
		// Delete all the newly created states
		for (const key of createdStates) {
			batch.del(Buffer.from(key));
		}
		// Revert all deleted values
		for (const { key, value: previousValue } of deletedStates) {
			batch.set(Buffer.from(key), previousValue);
		}
		for (const { key, value: previousValue } of updatedStates) {
			batch.set(Buffer.from(key), previousValue);
		}
		stateStore.finalize(heightStr, batch);

		// Delete stored diff at particular height
		batch.del(Buffer.from(diffKey));

		// Persist the whole batch
		await this._db.write(batch);
		return {
			deleted: deletedStates,
			created: createdStates,
			updated: updatedStates,
		};
	}

	// This function is out of batch, but even if it fails, it will run again next time
	private async _cleanUntil(height: number): Promise<void> {
		const max = Math.max(0, height - 1);
		await this._db.clear({
			gte: Buffer.from(`${DB_KEY_DIFF_STATE}:${formatInt(0)}`),
			lte: Buffer.from(`${DB_KEY_DIFF_STATE}:${formatInt(max)}`),
		});
	}

	private async _getTransactions(blockID: Buffer): Promise<Buffer[]> {
		const txIDs: Buffer[] = [];
		try {
			const ids = await this._db.get(Buffer.from(`${DB_KEY_TRANSACTIONS_BLOCK_ID}:${keyString(blockID)}`));
			const idLength = 32;
			for (let i = 0; i < ids.length; i += idLength) {
				txIDs.push(ids.slice(i, i + idLength));
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		if (txIDs.length === 0) {
			return [];
		}
		const transactions = [];
		for (const txID of txIDs) {
			const tx = await this._db.get(Buffer.from(`${DB_KEY_TRANSACTIONS_ID}:${keyString(txID)}`));
			transactions.push(tx);
		}

		return transactions;
	}
}
