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
import * as fs from 'fs';
import * as path from 'path';
import { debug } from 'debug';
import levelup, { LevelUp } from 'levelup';
import rocksDB from 'rocksdb';
import { NotFoundError } from './errors';

const logger = debug('db');

export interface Options {
	readonly gt?: string;
	readonly gte?: string;
	readonly lt?: string;
	readonly lte?: string;
	readonly reverse?: boolean;
	readonly limit?: number;
}

export interface BatchChain {
	put: (key: string, value: Buffer) => this;
	del: (key: string) => this;
	clear: () => this;
	write: () => Promise<this>;
	readonly length: number;
}

export interface ReadStreamOptions extends Options {
	readonly keys?: boolean;
	readonly values?: boolean;
	keyAsBuffer?: boolean;
}

export class KVStore {
	private readonly _db: LevelUp<rocksDB>;

	public constructor(filePath: string) {
		logger('opening file', { filePath });
		const parentDir = path.resolve(path.join(filePath, '../'));
		if (!fs.existsSync(parentDir)) {
			throw new Error(`${parentDir} does not exist`);
		}
		this._db = levelup(rocksDB(filePath));
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

	public async put(key: string, val: Buffer): Promise<void> {
		logger('put', { key });

		await this._db.put(key, val);
	}

	public async del(key: string): Promise<void> {
		logger('del', { key });

		await this._db.del(key);
	}

	public createReadStream(options?: ReadStreamOptions): NodeJS.ReadableStream {
		logger('readStream', { options });

		// Treat key as string
		const updatedOption = options
			? { ...options, keyAsBuffer: false }
			: { keyAsBuffer: false };

		return this._db.createReadStream(updatedOption);
	}

	public batch(): BatchChain {
		return this._db.batch();
	}
}
