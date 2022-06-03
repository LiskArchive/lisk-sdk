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

import { Batch } from '@liskhq/lisk-db';
import { dataStructures } from '@liskhq/lisk-utils';
import { StateStore } from './state_store';
import { DB_KEY_STATE_SMT } from '../db_keys';
import { StateDiff } from '../types';
import { DatabaseReader, DatabaseWriter } from './types';

export interface CurrentState {
	batch: Batch;
	diff: StateDiff;
	stateStore: StateStore;
}

export class SMTStore {
	private readonly _db: DatabaseReader;
	private readonly _data: dataStructures.BufferMap<Buffer>;

	public constructor(db: DatabaseReader, data?: dataStructures.BufferMap<Buffer>) {
		this._db = db;
		this._data = data ?? new dataStructures.BufferMap();
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

	// eslint-disable-next-line @typescript-eslint/require-await
	public async del(key: Buffer): Promise<void> {
		const prefixedKey = this._getKey(key);
		this._data.delete(prefixedKey);
	}

	public finalize(batch: DatabaseWriter): void {
		for (const [key, value] of this._data.entries()) {
			batch.set(key, value);
		}
	}

	private _getKey(key: Buffer): Buffer {
		return Buffer.concat([DB_KEY_STATE_SMT, key]);
	}
}
