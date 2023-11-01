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

import { Batch, IterateOptions, NotFoundError as DBNotFoundError } from '@liskhq/lisk-db';
import { dataStructures } from '@liskhq/lisk-utils';
import { NotFoundError } from './errors';
import { GeneratorDB } from './types';

interface KeyValue {
	key: Buffer;
	value: Buffer;
}
export class GeneratorStore {
	private readonly _db: GeneratorDB;
	private readonly _data: dataStructures.BufferMap<Buffer>;
	private readonly _prefix: Buffer;

	public constructor(db: GeneratorDB, prefix?: Buffer, data?: dataStructures.BufferMap<Buffer>) {
		this._db = db;
		this._prefix = prefix ?? Buffer.alloc(0);
		this._data = data ?? new dataStructures.BufferMap();
	}

	public getGeneratorStore(moduleID: Buffer): GeneratorStore {
		return new GeneratorStore(this._db, moduleID, this._data);
	}

	public async get(key: Buffer): Promise<Buffer> {
		const prefixedKey = this._getKey(key);
		const cachedValue = this._data.get(prefixedKey);
		if (cachedValue) {
			return cachedValue;
		}
		try {
			const storedValue = await this._db.get(prefixedKey);
			this._data.set(prefixedKey, storedValue);
			return storedValue;
		} catch (error) {
			if (error instanceof DBNotFoundError) {
				throw new NotFoundError();
			}
			throw error;
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async set(key: Buffer, value: Buffer): Promise<void> {
		const prefixedKey = this._getKey(key);
		this._data.set(prefixedKey, value);
	}

	public async iterate(options: IterateOptions): Promise<KeyValue[]> {
		const optionsWithKey = {
			...options,
			gte: options.gte ? this._getKey(options.gte) : undefined,
			lte: options.lte ? this._getKey(options.lte) : undefined,
		};
		const stream = this._db.iterate(optionsWithKey);
		const result = await new Promise<KeyValue[]>((resolve, reject) => {
			const pairs: KeyValue[] = [];
			stream
				.on('data', ({ key, value }: { key: Buffer; value: Buffer }) => {
					pairs.push({ key: key.subarray(this._prefix.length), value });
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(pairs);
				});
		});
		return result;
	}

	public finalize(batch: Batch): void {
		for (const [key, value] of this._data.entries()) {
			batch.set(key, value);
		}
	}

	private _getKey(key: Buffer): Buffer {
		return Buffer.concat([this._prefix, key]);
	}
}
