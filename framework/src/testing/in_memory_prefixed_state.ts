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
 *
 */

import { InMemoryDatabase, IterateOptions } from '@liskhq/lisk-db';

export class InMemoryPrefixedStateDB {
	private readonly _db: InMemoryDatabase;

	// private _backup: InMemoryDatabase | undefined;

	public constructor() {
		this._db = new InMemoryDatabase();
	}

	public async get(key: Buffer): Promise<Buffer> {
		return this._db.get(key);
	}

	public async has(key: Buffer): Promise<boolean> {
		return this._db.has(key);
	}

	public async set(key: Buffer, value: Buffer): Promise<void> {
		return this._db.set(key, value);
	}

	public async del(key: Buffer): Promise<void> {
		return this._db.del(key);
	}

	public async range(options?: IterateOptions): Promise<{ key: Buffer; value: Buffer }[]> {
		const stream = this._db.iterate(options);

		const pairs = await new Promise<{ key: Buffer; value: Buffer }[]>((resolve, reject) => {
			const result: { key: Buffer; value: Buffer }[] = [];
			stream
				.on('data', ({ key, value }: { key: Buffer; value: Buffer }) => {
					result.push({ key, value });
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(result);
				});
		});

		return pairs;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public snapshot(): number {
		return 0;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public restoreSnapshot(): void {}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public close(): void {}
}
