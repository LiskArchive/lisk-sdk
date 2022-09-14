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

import { Database } from '@liskhq/lisk-db';

export const DB_KEY_BLOCK_ID = Buffer.from([0]);

export class Storage {
	private readonly _db: Database;

	public constructor(db: Database) {
		this._db = db;
		// eslint-disable-next-line no-console
		console.log(this._db);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getBlockByID(_id: Buffer): Promise<Buffer> {
		return Buffer.alloc(0);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getBlockByHeight(_height: number): Promise<Buffer> {
		return Buffer.alloc(0);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getBlocksByHeightBetween(_fromHeight: number, _toHeight: number): Promise<Buffer[]> {
		return [];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async isBlockPersisted(_blockID: Buffer): Promise<boolean> {
		return true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async isBlockHeightPersisted(_height: number): Promise<boolean> {
		return true;
	}

	/*
		Save Block
	*/
	public async saveBlock(
		_id: Buffer,
		_height: number,
		_block: Buffer,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): Promise<void> {}
}
