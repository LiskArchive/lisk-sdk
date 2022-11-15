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

import { intToBuffer } from '@liskhq/lisk-cryptography/dist-node/utils';
import { Batch, Database } from '@liskhq/lisk-db';
import { encodeLegacyChainBracketInfo } from './codec';
import { DB_KEY_BLOCK_HEIGHT, DB_KEY_BLOCK_ID, DB_KEY_LEGACY_BRACKET } from './constants';
import { LegacyChainBracketInfo } from './types';

export class Storage {
	private readonly _db: Database;

	public constructor(db: Database) {
		this._db = db;
	}

	public async getBlockByID(id: Buffer): Promise<Buffer> {
		return this._db.get(Buffer.concat([DB_KEY_BLOCK_ID, id]));
	}

	public async getBlockByHeight(height: number): Promise<Buffer> {
		return this.getBlockByID(
			await this._db.get(Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(height, 4)])),
		);
	}

	public async getBlocksByHeightBetween(fromHeight: number, toHeight: number): Promise<Buffer[]> {
		const blockIDs = await this._getBlockIDsBetweenHeights(fromHeight, toHeight);
		return Promise.all(blockIDs.map(async id => this.getBlockByID(id)));
	}

	public async isBlockPersisted(blockID: Buffer): Promise<boolean> {
		return this._db.has(Buffer.concat([DB_KEY_BLOCK_ID, blockID]));
	}

	public async isBlockHeightPersisted(height: number): Promise<boolean> {
		return this._db.has(Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(height, 4)]));
	}

	public async saveBlock(id: Buffer, height: number, block: Buffer): Promise<void> {
		const batch = new Batch();
		batch.set(Buffer.concat([DB_KEY_BLOCK_ID, id]), block);
		batch.set(Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(height, 4)]), id);

		await this._db.write(batch);
	}

	public async getLegacyChainBracketInfo(snapshotBlockID: Buffer): Promise<Buffer> {
		return this._db.get(Buffer.concat([DB_KEY_LEGACY_BRACKET, snapshotBlockID]));
	}

	public async setLegacyChainBracketInfo(
		snapshotBlockID: Buffer,
		bracketInfo: LegacyChainBracketInfo,
	): Promise<void> {
		await this._db.set(
			Buffer.concat([DB_KEY_LEGACY_BRACKET, snapshotBlockID]),
			encodeLegacyChainBracketInfo(bracketInfo),
		);
	}

	private async _getBlockIDsBetweenHeights(
		fromHeight: number,
		toHeight: number,
	): Promise<Buffer[]> {
		const stream = this._db.createReadStream({
			gte: Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(fromHeight, 4)]),
			lte: Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(toHeight, 4)]),
			reverse: true,
		});

		return new Promise<Buffer[]>((resolve, reject) => {
			const ids: Buffer[] = [];

			stream
				.on('data', ({ value }: { value: Buffer }) => {
					ids.push(value);
				})
				.on('error', error => {
					reject(error);
				})
				.on('end', () => {
					resolve(ids);
				});
		});
	}
}
