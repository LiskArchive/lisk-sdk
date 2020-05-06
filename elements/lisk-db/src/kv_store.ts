/*
 * Copyright © 2020 Lisk Foundation
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
import * as path from 'path';
import * as fs from 'fs';
import { debug } from 'debug';
import encodingDown from 'encoding-down';
import levelup, { LevelUp } from 'levelup';
import rocksDB from 'rocksdb';
import { NotFoundError } from './error';

const logger = debug('db');

export interface Options {
	readonly gt?: string;
	readonly gte?: string;
	readonly lt?: string;
	readonly lte?: string;
	readonly reverse?: boolean;
	readonly limit?: number;
}

// TODO: Update V to be Buffer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BatchChain<V = any> {
	put: (key: string, value: V) => this;
	del: (key: string) => this;
	clear: () => this;
	write: () => Promise<this>;
	readonly length: number;
}

export interface ReadStreamOptions extends Options {
	readonly keys?: boolean;
	readonly values?: boolean;
}

export class KVStore {
	// TODO: Update to LevelUp<rocksDB> when changing interface to Buffer
	private readonly _db: LevelUp<string, Promise<unknown>>;

	public constructor(file: string) {
		logger('opening file', { file });
		const parentDir = path.resolve(path.join(file, '../'));
		if (!fs.existsSync(parentDir)) {
			throw new Error(`${parentDir} does not exist`);
		}
		this._db = (levelup(
			encodingDown(rocksDB(file), { valueEncoding: 'json' }),
		) as unknown) as LevelUp<string, Promise<unknown>>;
	}

	public async close(): Promise<void> {
		await this._db.close();
	}

	// TODO: Update to return Buffer
	public async get<T>(key: string): Promise<T> {
		logger('get', { key });
		try {
			const result = ((await this._db.get(key)) as unknown) as T;
			return result;
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (error.notFound) {
				throw new NotFoundError(key);
			}
			throw error;
		}
	}

	public async exists(key: string): Promise<boolean> {
		try {
			logger('exists', { key });
			await this._db.get(key);

			return true;
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (error.notFound) {
				return false;
			}
			throw error;
		}
	}

	public async clear(options?: Options): Promise<void> {
		await this._db.clear(options);
	}

	// TODO: Update val to be Buffer
	// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
	public async put(key: string, val: any): Promise<void> {
		logger('put', { key });

		await this._db.put(key, val);
	}

	public async del(key: string): Promise<void> {
		logger('del', { key });

		await this._db.del(key);
	}

	public createReadStream(options?: ReadStreamOptions): NodeJS.ReadableStream {
		logger('readStream', { options });

		return this._db.createReadStream(options);
	}

	public batch(): BatchChain {
		return this._db.batch();
	}
}
