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

import { codec, db as liskDB, Engine, chain, cryptography } from 'lisk-sdk';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import {
	DB_KEY_AGGREGATE_COMMITS,
	DB_KEY_BLOCK_HEADERS,
	DB_KEY_CROSS_CHAIN_MESSAGES,
	DB_KEY_LAST_SENT_CCM,
	DB_KEY_LIST_OF_CCU,
	DB_KEY_VALIDATORS_HASH_PREIMAGE,
} from './constants';
import {
	aggregateCommitsInfoSchema,
	blockHeadersInfoSchema,
	ccmsFromEventsSchema,
	lastSentCCMWithHeight,
	listOfCCUsSchema,
	validatorsHashPreimageInfoSchema,
} from './schemas';
import { BlockHeader, CCMsFromEvents, LastSentCCMWithHeight, ValidatorsData } from './types';

const { Database } = liskDB;
type KVStore = liskDB.Database;

interface BlockHeadersInfo {
	blockHeaders: BlockHeader[];
}

interface AggregateCommitsInfo {
	aggregateCommits: Engine.AggregateCommit[];
}

interface ValidatorsHashPreimage {
	validatorsHashPreimage: ValidatorsData[];
}

interface CrossChainMessagesInfo {
	ccmsFromEvents: CCMsFromEvents[];
}

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

export class ChainConnectorStore {
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

	public async getBlockHeaders(): Promise<BlockHeader[]> {
		let blockHeaders: BlockHeader[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_BLOCK_HEADERS);
			blockHeaders = codec.decode<BlockHeadersInfo>(
				blockHeadersInfoSchema,
				encodedInfo,
			).blockHeaders;
		} catch (error) {
			checkDBError(error);
		}
		return blockHeaders;
	}

	public async setBlockHeaders(blockHeaders: BlockHeader[]) {
		const encodedInfo = codec.encode(blockHeadersInfoSchema, { blockHeaders });

		await this._db.set(DB_KEY_BLOCK_HEADERS, encodedInfo);
	}

	public async getAggregateCommits(): Promise<Engine.AggregateCommit[]> {
		let aggregateCommits: Engine.AggregateCommit[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_AGGREGATE_COMMITS);
			aggregateCommits = codec.decode<AggregateCommitsInfo>(
				aggregateCommitsInfoSchema,
				encodedInfo,
			).aggregateCommits;
		} catch (error) {
			checkDBError(error);
		}
		return aggregateCommits;
	}

	public async setAggregateCommits(aggregateCommits: Engine.AggregateCommit[]) {
		const encodedInfo = codec.encode(aggregateCommitsInfoSchema, { aggregateCommits });
		await this._db.set(DB_KEY_AGGREGATE_COMMITS, encodedInfo);
	}

	public async getValidatorsHashPreimage(): Promise<ValidatorsData[]> {
		let validatorsHashPreimage: ValidatorsData[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_VALIDATORS_HASH_PREIMAGE);
			validatorsHashPreimage = codec.decode<ValidatorsHashPreimage>(
				validatorsHashPreimageInfoSchema,
				encodedInfo,
			).validatorsHashPreimage;
		} catch (error) {
			checkDBError(error);
		}
		return validatorsHashPreimage;
	}

	public async setValidatorsHashPreimage(validatorsHashInput: ValidatorsData[]) {
		const encodedInfo = codec.encode(validatorsHashPreimageInfoSchema, {
			validatorsHashPreimage: validatorsHashInput,
		});
		await this._db.set(DB_KEY_VALIDATORS_HASH_PREIMAGE, encodedInfo);
	}

	public async getCrossChainMessages(): Promise<CCMsFromEvents[]> {
		let crossChainMessages: CCMsFromEvents[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_CROSS_CHAIN_MESSAGES);
			crossChainMessages = codec.decode<CrossChainMessagesInfo>(
				ccmsFromEventsSchema,
				encodedInfo,
			).ccmsFromEvents;
		} catch (error) {
			checkDBError(error);
		}
		return crossChainMessages;
	}

	public async setCrossChainMessages(ccms: CCMsFromEvents[]) {
		const encodedInfo = codec.encode(ccmsFromEventsSchema, { ccmsFromEvents: ccms });
		await this._db.set(DB_KEY_CROSS_CHAIN_MESSAGES, encodedInfo);
	}

	public async getLastSentCCM(): Promise<LastSentCCMWithHeight | undefined> {
		let lastSentCCM: LastSentCCMWithHeight | undefined;
		try {
			const encodedInfo = await this._db.get(DB_KEY_LAST_SENT_CCM);
			lastSentCCM = codec.decode<LastSentCCMWithHeight>(lastSentCCMWithHeight, encodedInfo);
		} catch (error) {
			checkDBError(error);
		}
		return lastSentCCM;
	}

	public async setLastSentCCM(lastSentCCM: LastSentCCMWithHeight) {
		await this._db.set(DB_KEY_LAST_SENT_CCM, codec.encode(lastSentCCMWithHeight, lastSentCCM));
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
