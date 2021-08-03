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

import { BatchChain, KVStore } from '@liskhq/lisk-db';
import { dataStructures } from '@liskhq/lisk-utils';

export class GeneratorStore {
	private readonly _db: KVStore;
	private readonly _data: dataStructures.BufferMap<Buffer>;
	private readonly _prefix: Buffer;

	public constructor(db: KVStore, prefix?: Buffer, data?: dataStructures.BufferMap<Buffer>) {
		this._db = db;
		this._prefix = prefix ?? Buffer.alloc(0);
		this._data = data ?? new dataStructures.BufferMap();
	}

	public getGeneratorStore(moduleID: number): GeneratorStore {
		const moduleIDBuffer = Buffer.alloc(4);
		moduleIDBuffer.writeInt32BE(moduleID, 0);
		return new GeneratorStore(this._db, moduleIDBuffer, this._data);
	}

	public async get(key: Buffer): Promise<Buffer> {
		const prefixedKey = this._getKey(key);
		const cachedValue = this._data.get(prefixedKey);
		if (cachedValue) {
			return cachedValue;
		}
		const storedValue = await this._db.get(prefixedKey);
		this._data.set(prefixedKey, storedValue);
		return storedValue;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async set(key: Buffer, value: Buffer): Promise<void> {
		const prefixedKey = this._getKey(key);
		this._data.set(prefixedKey, value);
	}

	public finalize(batch: BatchChain): void {
		for (const [key, value] of this._data.entries()) {
			batch.put(key, value);
		}
	}

	private _getKey(key: Buffer): Buffer {
		return Buffer.concat([this._prefix, key]);
	}
}
