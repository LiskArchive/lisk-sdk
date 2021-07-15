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

import { NotFoundError } from './error';

export class InMemoryDB {
	private _data: Record<string, Buffer> = {};

	// eslint-disable-next-line @typescript-eslint/require-await
	public async get(key: Buffer): Promise<Buffer> {
		const keyStr = key.toString('binary');
		const val = this._data[keyStr];
		if (!val) {
			throw new NotFoundError(`Key ${key.toString('hex')} does not exist`);
		}
		return val;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async set(key: Buffer, value: Buffer): Promise<void> {
		const keyStr = key.toString('binary');
		this._data[keyStr] = value;
	}
	// eslint-disable-next-line @typescript-eslint/require-await
	public async del(key: Buffer): Promise<void> {
		const keyStr = key.toString('binary');
		delete this._data[keyStr];
	}
}
