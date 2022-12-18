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

import { codec, db as liskDB, AggregateCommit } from 'lisk-sdk';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import {
	DB_KEY_AGGREGATE_COMMITS,
	DB_KEY_BLOCK_HEADERS,
	DB_KEY_CROSS_CHAIN_MESSAGES,
	DB_KEY_VALIDATORS_PREIMAGE,
} from './constants';
import {
	aggregateCommitsInfoSchema,
	blockHeadersInfoSchema,
	ccmsFromEventsSchema,
	validatorsHashPreimageInfoSchema,
} from './schemas';
import { BlockHeader, CrossChainMessagesFromEvents, ValidatorsData } from './types';

const { Database } = liskDB;
type KVStore = liskDB.Database;

export const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-chain-connector-plugin.db',
): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	await ensureDir(dirPath);

	return new Database(dirPath);
};

export class ChainConnectorStore {
	private readonly _db: KVStore;
	public constructor(db: KVStore, private readonly _chainType: Buffer) {
		this._db = db;
	}

	public close() {
		this._db.close();
	}

	public async getBlockHeaders(): Promise<BlockHeader[]> {
		const dbKey = Buffer.concat([this._chainType, DB_KEY_BLOCK_HEADERS]);
		try {
			const encodedInfo = await this._db.get(dbKey);

			return codec.decode<{ blockHeaders: BlockHeader[] }>(blockHeadersInfoSchema, encodedInfo)
				.blockHeaders;
		} catch (error) {
			if (!(error instanceof liskDB.NotFoundError)) {
				throw error;
			}

			// Set initial value
			const encodedInitialData = codec.encode(blockHeadersInfoSchema, { blockHeaders: [] });
			await this._db.set(dbKey, encodedInitialData);

			return [];
		}
	}

	public async setBlockHeaders(blockHeaders: BlockHeader[]) {
		const concatedDBKey = Buffer.concat([this._chainType, DB_KEY_BLOCK_HEADERS]);
		const encodedInfo = codec.encode(blockHeadersInfoSchema, { blockHeaders });

		await this._db.set(concatedDBKey, encodedInfo);
	}

	public async getAggregateCommits(): Promise<AggregateCommit[]> {
		const dbKey = Buffer.concat([this._chainType, DB_KEY_AGGREGATE_COMMITS]);
		try {
			const encodedInfo = await this._db.get(dbKey);

			return codec.decode<{ aggregateCommits: AggregateCommit[] }>(
				aggregateCommitsInfoSchema,
				encodedInfo,
			).aggregateCommits;
		} catch (error) {
			if (!(error instanceof liskDB.NotFoundError)) {
				throw error;
			}
			// Set initial value
			const encodedInitialData = codec.encode(aggregateCommitsInfoSchema, { aggregateCommits: [] });
			await this._db.set(dbKey, encodedInitialData);

			return [];
		}
	}

	public async setAggregateCommits(aggregateCommits: AggregateCommit[]) {
		const concatedDBKey = Buffer.concat([this._chainType, DB_KEY_AGGREGATE_COMMITS]);
		const encodedInfo = codec.encode(aggregateCommitsInfoSchema, { aggregateCommits });
		await this._db.set(concatedDBKey, encodedInfo);
	}

	public async getValidatorsHashPreImage(): Promise<ValidatorsData[]> {
		const dbKey = Buffer.concat([this._chainType, DB_KEY_VALIDATORS_PREIMAGE]);
		try {
			const encodedInfo = await this._db.get(dbKey);

			return codec.decode<{ validatorsHashPreimage: ValidatorsData[] }>(
				validatorsHashPreimageInfoSchema,
				encodedInfo,
			).validatorsHashPreimage;
		} catch (error) {
			if (!(error instanceof liskDB.NotFoundError)) {
				throw error;
			}
			// Set initial value
			const encodedInitialData = codec.encode(validatorsHashPreimageInfoSchema, {
				validatorsHashPreimage: [],
			});
			await this._db.set(dbKey, encodedInitialData);

			return [];
		}
	}

	public async setValidatorsHashPreImage(validatorsHashInput: ValidatorsData[]) {
		const concatedDBKey = Buffer.concat([this._chainType, DB_KEY_VALIDATORS_PREIMAGE]);
		const encodedInfo = codec.encode(validatorsHashPreimageInfoSchema, {
			validatorsHashPreimage: validatorsHashInput,
		});
		await this._db.set(concatedDBKey, encodedInfo);
	}

	public async getCrossChainMessages(): Promise<CrossChainMessagesFromEvents[]> {
		const dbKey = Buffer.concat([this._chainType, DB_KEY_CROSS_CHAIN_MESSAGES]);
		try {
			const encodedInfo = await this._db.get(dbKey);
			return codec.decode<{ ccmsFromEvents: CrossChainMessagesFromEvents[] }>(
				ccmsFromEventsSchema,
				encodedInfo,
			).ccmsFromEvents;
		} catch (error) {
			if (!(error instanceof liskDB.NotFoundError)) {
				throw error;
			}
			// Set initial value
			const encodedInitialData = codec.encode(ccmsFromEventsSchema, { ccmsFromEvents: [] });
			await this._db.set(dbKey, encodedInitialData);

			return [];
		}
	}

	public async setCrossChainMessages(ccms: CrossChainMessagesFromEvents[]) {
		const concatedDBKey = Buffer.concat([this._chainType, DB_KEY_CROSS_CHAIN_MESSAGES]);
		const encodedInfo = codec.encode(ccmsFromEventsSchema, { ccmsFromEvents: ccms });
		await this._db.set(concatedDBKey, encodedInfo);
	}
}
