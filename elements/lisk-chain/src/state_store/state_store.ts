/*
 * Copyright © 2021 Lisk Foundation
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

import { codec, Schema } from '@liskhq/lisk-codec';
import { IterateOptions, NotFoundError as DBNotFoundError } from '@liskhq/lisk-db';
import { DB_KEY_STATE_STORE } from '../db_keys';
import { StateDiff } from '../types';
import { CacheDB } from './cache_db';
import { NotFoundError } from './errors';
import { DatabaseReader, DatabaseWriter } from './types';
import { copyBuffer } from './utils';

export { IterateOptions };

export interface KeyValue {
	key: Buffer;
	value: Buffer;
}

export interface DecodedKeyValue<T> {
	key: Buffer;
	value: T;
}

export class StateStore {
	private readonly _db: DatabaseReader;
	private readonly _prefix: Buffer;
	private _cache: CacheDB;
	private _snapshot: CacheDB | undefined;
	private _latestSnapshotId: number;

	public constructor(db: DatabaseReader, prefix?: Buffer, cache?: CacheDB) {
		this._db = db;
		this._prefix = prefix ?? DB_KEY_STATE_STORE;
		this._cache = cache ?? new CacheDB();
		this._latestSnapshotId = -1;
	}

	// TODO: Remove accepting number for subStorePrefix
	public getStore(storePrefix: Buffer, subStorePrefix: Buffer | number): StateStore {
		let storePrefixBuffer: Buffer;
		if (typeof subStorePrefix === 'number') {
			storePrefixBuffer = Buffer.alloc(2);
			storePrefixBuffer.writeUInt16BE(subStorePrefix, 0);
		} else {
			storePrefixBuffer = subStorePrefix;
		}

		const subStore = new StateStore(
			this._db,
			Buffer.concat([DB_KEY_STATE_STORE, storePrefix, storePrefixBuffer]),
			this._cache,
		);

		return subStore;
	}

	public async get(key: Buffer): Promise<Buffer> {
		const prefixedKey = this._getKey(key);
		const { value, deleted } = this._cache.get(prefixedKey);
		if (value) {
			return copyBuffer(value);
		}
		if (deleted) {
			throw new NotFoundError(`Specified key ${prefixedKey.toString('hex')} does not exist`);
		}
		let persistedValue;
		try {
			persistedValue = await this._db.get(prefixedKey);
		} catch (error) {
			if (error instanceof DBNotFoundError) {
				throw new NotFoundError(`Specified key ${prefixedKey.toString('hex')} does not exist`);
			}
			throw error;
		}
		this._cache.cache(prefixedKey, persistedValue);
		return copyBuffer(persistedValue);
	}

	public async getWithSchema<T>(key: Buffer, schema: Schema): Promise<T> {
		const value = await this.get(key);
		return codec.decode<T>(schema, value);
	}

	public async has(key: Buffer): Promise<boolean> {
		try {
			await this.get(key);
			return true;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return false;
		}
	}

	public async set(key: Buffer, value: Buffer): Promise<void> {
		const prefixedKey = this._getKey(key);
		// 1. it does exist in cache just needs update => update
		// 2. it did exist in cache, but it was deleted => update
		if (this._cache.existAny(prefixedKey)) {
			this._cache.set(prefixedKey, value);
			return;
		}
		// 3. it does not exist in cache, but it does exist in DB => cache first and update
		const dataExist = await this._ensureCache(prefixedKey);
		if (dataExist) {
			this._cache.set(prefixedKey, value);
			return;
		}
		// 4. it does not exist in cache, and it does not exist in DB => add as new
		this._cache.add(prefixedKey, value);
	}

	public async setWithSchema(
		key: Buffer,
		// eslint-disable-next-line @typescript-eslint/ban-types
		value: object,
		schema: Schema,
	): Promise<void> {
		const encodedValue = codec.encode(schema, value);
		await this.set(key, encodedValue);
	}

	public async del(key: Buffer): Promise<void> {
		const prefixedKey = this._getKey(key);
		if (!this._cache.existAny(prefixedKey)) {
			await this._ensureCache(prefixedKey);
		}
		this._cache.del(prefixedKey);
	}

	public async iterate(options: IterateOptions): Promise<KeyValue[]> {
		const start = this._getKey(options.gte as Buffer);
		const end = this._getKey(options.lte as Buffer);
		const stream = this._db.createReadStream({
			gte: start,
			lte: end,
			reverse: options.reverse,
			limit: options.limit,
		});
		const storedData = await new Promise<KeyValue[]>((resolve, reject) => {
			const values: KeyValue[] = [];
			stream
				.on('data', ({ key: prefixedKey, value }: KeyValue) => {
					const { value: cachedValue, deleted } = this._cache.get(prefixedKey);
					// if key is already stored in cache, return cached value
					if (cachedValue) {
						values.push({
							key: prefixedKey,
							value: copyBuffer(cachedValue),
						});
						return;
					}
					// if deleted in cache, do not include
					if (deleted) {
						return;
					}
					this._cache.cache(prefixedKey, value);
					values.push({
						key: prefixedKey,
						value,
					});
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(values);
				});
		});
		const cachedValues = this._cache.getRange(start, end);
		const existingKey: Record<string, boolean> = {};
		const result = [];
		for (const data of cachedValues) {
			existingKey[data.key.toString('binary')] = true;
			result.push({
				key: data.key.subarray(this._prefix.length),
				value: data.value,
			});
		}
		for (const data of storedData) {
			if (existingKey[data.key.toString('binary')] === undefined) {
				result.push({
					key: data.key.subarray(this._prefix.length),
					value: data.value,
				});
			}
		}
		result.sort((a, b) => {
			if (options.reverse) {
				return b.key.compare(a.key);
			}
			return a.key.compare(b.key);
		});
		if (options.limit) {
			result.splice(options.limit);
		}
		return result;
	}

	public async iterateWithSchema<T>(
		options: IterateOptions,
		schema: Schema,
	): Promise<DecodedKeyValue<T>[]> {
		const result = await this.iterate(options);
		return result.map(kv => ({
			key: kv.key,
			value: codec.decode<T>(schema, kv.value),
		}));
	}

	// createSnapshot follows the same interface as stateDB. However, it does not support multi snapshot.
	public createSnapshot(): number {
		this._snapshot = this._cache.copy();
		this._latestSnapshotId += 1;

		if (this._latestSnapshotId === Number.MAX_SAFE_INTEGER) {
			this._latestSnapshotId = 0;
		}

		return this._latestSnapshotId;
	}

	// restoreSnapshot does not support multi-snapshot. Therefore, id is not used.
	public restoreSnapshot(id: number): void {
		if (id !== this._latestSnapshotId) {
			throw new Error('Invalid snapshot ID. Cannot revert to an older snapshot.');
		}

		if (!this._snapshot) {
			throw new Error('Snapshot must be taken first before reverting');
		}

		this._cache = this._snapshot;
		this._snapshot = undefined;
	}

	public finalize(batch: DatabaseWriter): StateDiff {
		return this._cache.finalize(batch);
	}

	private async _ensureCache(prefixedKey: Buffer): Promise<boolean> {
		try {
			const value = await this._db.get(prefixedKey);
			this._cache.cache(prefixedKey, value);
			return true;
		} catch (error) {
			if (error instanceof DBNotFoundError) {
				return false;
			}
			throw error;
		}
	}

	private _getKey(key: Buffer): Buffer {
		return Buffer.concat([this._prefix, key]);
	}
}
