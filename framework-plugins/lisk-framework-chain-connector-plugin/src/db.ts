/*
 * Copyright © 2022 Lisk Foundation
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

import {
	codec,
	db as liskDB,
	AggregateCommit,
	chain,
	cryptography,
	EMPTY_BYTES,
	aggregateCommitSchema,
	CCMsg,
} from 'lisk-sdk';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { DB_KEY_CROSS_CHAIN_MESSAGES, DB_KEY_LAST_SENT_CCM, DB_KEY_LIST_OF_CCU } from './constants';
import {
	blockHeaderSchemaWithID,
	ccmsAtHeightSchema,
	lastSentCCMSchema,
	listOfCCUsSchema,
	validatorsDataSchema,
} from './schemas';
import { BlockHeader, CCMWithHeight, LastSentCCM, ValidatorsData } from './types';

const { Database } = liskDB;
type KVStore = liskDB.Database;

const DB_KEY_BLOCK_HEADER_BY_HEIGHT = Buffer.from([10]);
const DB_KEY_AGGREGATE_COMMIT_BY_HEIGHT = Buffer.from([20]);
const DB_KEY_VALIDATORS_DATA = Buffer.from([30]);

export const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-chain-connector-plugin.db',
): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	await ensureDir(dirPath);

	return new Database(dirPath);
};

export const checkDBError = (error: Error | unknown) => {
	if (!(error instanceof liskDB.NotFoundError)) {
		throw error;
	}
};

export const concatDBKeys = (...keys: Buffer[]) => Buffer.concat(keys);
export const uint32BE = (val: number): Buffer => {
	const result = Buffer.alloc(4);
	result.writeUInt32BE(val, 0);
	return result;
};

export class ChainConnectorDB {
	private readonly _db: KVStore;
	private _privateKey?: Buffer;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public close() {
		this._db.close();
	}

	public get privateKey(): Buffer | undefined {
		return this._privateKey;
	}

	public async saveOnNewBlock(blockHeader: BlockHeader) {
		const heightBuf = uint32BE(blockHeader.height);
		const batch = new liskDB.Batch();
		const newBlockHeaderBytes = codec.encode(blockHeaderSchemaWithID, blockHeader);

		batch.set(concatDBKeys(DB_KEY_BLOCK_HEADER_BY_HEIGHT, heightBuf), newBlockHeaderBytes);

		if (
			!blockHeader.aggregateCommit.aggregationBits.equals(EMPTY_BYTES) ||
			!blockHeader.aggregateCommit.certificateSignature.equals(EMPTY_BYTES)
		) {
			const aggregateCommitHeight = uint32BE(blockHeader.aggregateCommit.height);
			const aggregateCommitBytes = codec.encode(aggregateCommitSchema, blockHeader.aggregateCommit);
			batch.set(
				concatDBKeys(DB_KEY_AGGREGATE_COMMIT_BY_HEIGHT, aggregateCommitHeight),
				aggregateCommitBytes,
			);
		}

		await this._db.write(batch);
	}

	public async getBlockHeaderByHeight(height: number): Promise<BlockHeader | undefined> {
		try {
			const blockBytes = await this._db.get(
				concatDBKeys(DB_KEY_BLOCK_HEADER_BY_HEIGHT, uint32BE(height)),
			);

			return codec.decode<BlockHeader>(blockHeaderSchemaWithID, blockBytes);
		} catch (error) {
			if (!(error instanceof liskDB.NotFoundError)) {
				throw error;
			}

			return undefined;
		}
	}

	public async getBlockHeadersBetweenHeights(fromHeight: number, toHeight: number) {
		const stream = this._db.createReadStream({
			gte: concatDBKeys(DB_KEY_BLOCK_HEADER_BY_HEIGHT, uint32BE(fromHeight)),
			lte: concatDBKeys(DB_KEY_BLOCK_HEADER_BY_HEIGHT, uint32BE(toHeight)),
			reverse: true,
		});
		const blockHeaders = await new Promise<Buffer[]>((resolve, reject) => {
			const list: Buffer[] = [];
			stream
				.on('data', ({ value }: { value: Buffer }) => {
					list.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(list);
				});
		});

		return blockHeaders.map(b => codec.decode<BlockHeader>(blockHeaderSchemaWithID, b));
	}

	public async deleteBlockHeadersBetweenHeight(
		fromHeight: number,
		toHeight: number,
	): Promise<void> {
		const stream = this._db.createReadStream({
			gte: concatDBKeys(DB_KEY_BLOCK_HEADER_BY_HEIGHT, uint32BE(fromHeight)),
			lte: concatDBKeys(DB_KEY_BLOCK_HEADER_BY_HEIGHT, uint32BE(toHeight)),
			reverse: true,
		});
		const blockHeaderIndexes = await new Promise<Buffer[]>((resolve, reject) => {
			const list: Buffer[] = [];
			stream
				.on('data', ({ key }: { key: Buffer }) => {
					list.push(key);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(list);
				});
		});
		const batch = new liskDB.Batch();
		for (const key of blockHeaderIndexes) {
			batch.del(key);
		}

		await this._db.write(batch);
	}

	public async deleteBlockHeaderByHeight(height: number): Promise<void> {
		const heightBuf = uint32BE(height);
		await this._db.del(concatDBKeys(DB_KEY_BLOCK_HEADER_BY_HEIGHT, heightBuf));
	}

	public async getAggregateCommitByHeight(height: number) {
		try {
			const bytes = await this._db.get(
				concatDBKeys(DB_KEY_AGGREGATE_COMMIT_BY_HEIGHT, uint32BE(height)),
			);

			return codec.decode<AggregateCommit>(aggregateCommitSchema, bytes);
		} catch (error) {
			if (!(error instanceof liskDB.NotFoundError)) {
				throw error;
			}

			return undefined;
		}
	}

	public async getAggregateCommitBetweenHeights(fromHeight: number, toHeight: number) {
		const stream = this._db.createReadStream({
			gte: concatDBKeys(DB_KEY_AGGREGATE_COMMIT_BY_HEIGHT, uint32BE(fromHeight)),
			lte: concatDBKeys(DB_KEY_AGGREGATE_COMMIT_BY_HEIGHT, uint32BE(toHeight)),
			reverse: true,
		});
		const aggregateCommits = await new Promise<Buffer[]>((resolve, reject) => {
			const list: Buffer[] = [];
			stream
				.on('data', ({ value }: { value: Buffer }) => {
					list.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(list);
				});
		});

		return aggregateCommits.map(a => codec.decode<AggregateCommit>(aggregateCommitSchema, a));
	}

	public async deleteAggregateCommitsBetweenHeight(
		fromHeight: number,
		toHeight: number,
	): Promise<void> {
		const stream = this._db.createReadStream({
			gte: concatDBKeys(DB_KEY_AGGREGATE_COMMIT_BY_HEIGHT, uint32BE(fromHeight)),
			lte: concatDBKeys(DB_KEY_AGGREGATE_COMMIT_BY_HEIGHT, uint32BE(toHeight)),
			reverse: true,
		});
		const aggregateCommitIndexes = await new Promise<Buffer[]>((resolve, reject) => {
			const list: Buffer[] = [];
			stream
				.on('data', ({ key }: { key: Buffer }) => {
					list.push(key);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(list);
				});
		});
		const batch = new liskDB.Batch();
		for (const key of aggregateCommitIndexes) {
			batch.del(key);
		}

		await this._db.write(batch);
	}

	public async deleteAggregateCommitByHeight(height: number): Promise<void> {
		const heightBuf = uint32BE(height);
		await this._db.del(concatDBKeys(DB_KEY_AGGREGATE_COMMIT_BY_HEIGHT, heightBuf));
	}

	public async getValidatorsDataByHash(validatorsHash: Buffer) {
		try {
			const bytes = await this._db.get(concatDBKeys(DB_KEY_VALIDATORS_DATA, validatorsHash));

			return codec.decode<ValidatorsData>(validatorsDataSchema, bytes);
		} catch (error) {
			if (!(error instanceof liskDB.NotFoundError)) {
				throw error;
			}

			return undefined;
		}
	}

	public async setValidatorsDataByHash(validatorsHash: Buffer, validatorsData: ValidatorsData) {
		const bytes = codec.encode(validatorsDataSchema, validatorsData);
		await this._db.set(concatDBKeys(DB_KEY_VALIDATORS_DATA, validatorsHash), bytes);
	}

	public async getAllValidatorsData() {
		const stream = this._db.createReadStream({
			gte: concatDBKeys(DB_KEY_VALIDATORS_DATA, Buffer.alloc(4, 0)),
			lte: concatDBKeys(DB_KEY_VALIDATORS_DATA, Buffer.alloc(4, 255)),
			reverse: true,
		});
		const validatorsData = await new Promise<Buffer[]>((resolve, reject) => {
			const list: Buffer[] = [];
			stream
				.on('data', ({ value }: { value: Buffer }) => {
					list.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(list);
				});
		});

		return validatorsData.map(v => codec.decode<ValidatorsData>(validatorsDataSchema, v));
	}

	public async getCCMsByHeight(height: number): Promise<CCMsg[]> {
		const heightBuf = uint32BE(height);
		let crossChainMessages: CCMsg[] = [];
		try {
			const encodedInfo = await this._db.get(concatDBKeys(DB_KEY_CROSS_CHAIN_MESSAGES, heightBuf));
			crossChainMessages = codec.decode<{ ccms: CCMsg[] }>(ccmsAtHeightSchema, encodedInfo).ccms;
		} catch (error) {
			checkDBError(error);
		}
		return crossChainMessages;
	}

	public async deleteCCMsByHeight(height: number): Promise<void> {
		const heightBuf = uint32BE(height);
		await this._db.del(concatDBKeys(DB_KEY_CROSS_CHAIN_MESSAGES, heightBuf));
	}

	public async getCCMsBetweenHeight(
		fromHeight: number,
		toHeight: number,
	): Promise<CCMWithHeight[]> {
		const stream = this._db.createReadStream({
			gte: concatDBKeys(DB_KEY_CROSS_CHAIN_MESSAGES, uint32BE(fromHeight)),
			lte: concatDBKeys(DB_KEY_CROSS_CHAIN_MESSAGES, uint32BE(toHeight)),
			reverse: true,
		});
		const ccmArrayAtEachHeight = await new Promise<Buffer[]>((resolve, reject) => {
			const list: Buffer[] = [];
			stream
				.on('data', ({ value }: { value: Buffer }) => {
					list.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(list);
				});
		});

		const flatCCMList = [];

		for (const ccms of ccmArrayAtEachHeight) {
			flatCCMList.push(...codec.decode<{ ccms: CCMWithHeight[] }>(ccmsAtHeightSchema, ccms).ccms);
		}

		return flatCCMList;
	}

	public async deleteCCMsBetweenHeight(fromHeight: number, toHeight: number): Promise<void> {
		const stream = this._db.createReadStream({
			gte: concatDBKeys(DB_KEY_CROSS_CHAIN_MESSAGES, uint32BE(fromHeight)),
			lte: concatDBKeys(DB_KEY_CROSS_CHAIN_MESSAGES, uint32BE(toHeight)),
			reverse: true,
		});
		const ccmsListIndexes = await new Promise<Buffer[]>((resolve, reject) => {
			const list: Buffer[] = [];
			stream
				.on('data', ({ key }: { key: Buffer }) => {
					list.push(key);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(list);
				});
		});
		const batch = new liskDB.Batch();
		for (const key of ccmsListIndexes) {
			batch.del(key);
		}

		await this._db.write(batch);
	}

	public async setCCMsByHeight(ccms: CCMWithHeight[], height: number) {
		const heightBuf = uint32BE(height);

		const encodedInfo = codec.encode(ccmsAtHeightSchema, { ccms });

		await this._db.set(concatDBKeys(DB_KEY_CROSS_CHAIN_MESSAGES, heightBuf), encodedInfo);
	}

	public async getLastSentCCM(): Promise<LastSentCCM | undefined> {
		let lastSentCCM: LastSentCCM | undefined;
		try {
			const encodedInfo = await this._db.get(DB_KEY_LAST_SENT_CCM);
			lastSentCCM = codec.decode<LastSentCCM>(lastSentCCMSchema, encodedInfo);
		} catch (error) {
			checkDBError(error);
		}
		return lastSentCCM;
	}

	public async setLastSentCCM(ccm: LastSentCCM) {
		await this._db.set(DB_KEY_LAST_SENT_CCM, codec.encode(lastSentCCMSchema, ccm));
	}

	public async getListOfCCUs(): Promise<chain.TransactionAttrs[]> {
		let listOfCCUs: chain.TransactionAttrs[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_LIST_OF_CCU);
			listOfCCUs = codec.decode<{ listOfCCUs: chain.TransactionAttrs[] }>(
				listOfCCUsSchema,
				encodedInfo,
			).listOfCCUs;
		} catch (error) {
			checkDBError(error);
		}
		return listOfCCUs;
	}

	public async setListOfCCUs(listOfCCUs: chain.TransactionAttrs[]) {
		listOfCCUs.sort((a, b) => Number(b.nonce) - Number(a.nonce));

		await this._db.set(DB_KEY_LIST_OF_CCU, codec.encode(listOfCCUsSchema, { listOfCCUs }));
	}

	public async setPrivateKey(encryptedPrivateKey: string, password: string) {
		const parsedEncryptedKey = cryptography.encrypt.parseEncryptedMessage(encryptedPrivateKey);
		this._privateKey = Buffer.from(
			await cryptography.encrypt.decryptMessageWithPassword(parsedEncryptedKey, password, 'utf-8'),
			'hex',
		);
	}

	public async deletePrivateKey(encryptedPrivateKey: string, password: string) {
		const parsedEncryptedKey = cryptography.encrypt.parseEncryptedMessage(encryptedPrivateKey);
		await cryptography.encrypt.decryptMessageWithPassword(parsedEncryptedKey, password, 'utf-8');
		this._privateKey = undefined;
	}
}
