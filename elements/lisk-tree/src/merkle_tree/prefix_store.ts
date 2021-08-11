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

import { NotFoundError } from '../error';
import { Database } from './types';

export class PrefixStore {
	private readonly _db: Database;
	private readonly _prefix: Buffer;

	public constructor(db: Database, prefix: Buffer) {
		this._db = db;
		this._prefix = prefix;
	}

	public async get(key: Buffer): Promise<Buffer | undefined> {
		try {
			const value = await this._db.get(Buffer.concat([this._prefix, key]));
			return value;
		} catch (error) {
			if (error instanceof NotFoundError) {
				return undefined;
			}
			throw error;
		}
	}

	public async set(key: Buffer, value: Buffer): Promise<void> {
		await this._db.set(Buffer.concat([this._prefix, key]), value);
	}
}
