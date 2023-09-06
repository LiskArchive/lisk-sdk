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

import { Batch, Database } from '@liskhq/lisk-db';
import { utils } from '@liskhq/lisk-cryptography';
import { encodeLegacyChainBracketInfo } from './codec';
import { LegacyChainBracketInfo } from './types';
import {
	buildBlockIDDbKey,
	buildBlockHeightDbKey,
	buildTxIDDbKey,
	buildLegacyBracketDBKey,
	buildTxsBlockIDDbKey,
} from './utils';

export class Storage {
	private readonly _db: Database;

	public constructor(db: Database) {
		this._db = db;
	}

	// `ID` is the hashed value (utils.hash)
	public async getTransactionByID(ID: Buffer): Promise<Buffer> {
		return this._db.get(buildTxIDDbKey(ID));
	}

	public async getBlockByID(ID: Buffer): Promise<Buffer> {
		return this._db.get(buildBlockIDDbKey(ID));
	}

	public async getBlockByHeight(height: number): Promise<Buffer> {
		const ID = await this._db.get(buildBlockHeightDbKey(height));
		return this.getBlockByID(ID);
	}

	public async getBlocksByHeightBetween(fromHeight: number, toHeight: number): Promise<Buffer[]> {
		const IDs = await this._getBlockIDsBetweenHeights(fromHeight, toHeight);
		return Promise.all(IDs.map(async ID => this.getBlockByID(ID)));
	}

	public async isBlockPersisted(blockID: Buffer): Promise<boolean> {
		return this._db.has(buildBlockIDDbKey(blockID));
	}

	public async isBlockHeightPersisted(height: number): Promise<boolean> {
		return this._db.has(buildBlockHeightDbKey(height));
	}

	public async getTransactionsByBlockID(blockID: Buffer): Promise<Buffer[]> {
		const txIDsBuffer = await this._db.get(buildTxsBlockIDDbKey(blockID));
		if (!txIDsBuffer.length) {
			return [];
		}

		const txIDs: Buffer[] = [];

		// each txID is hashed value of 32 length
		const idLength = 32;
		for (let i = 0; i < txIDsBuffer.length; i += idLength) {
			const txID = txIDsBuffer.subarray(i, (i += idLength));
			txIDs.push(txID);
		}

		return Promise.all(txIDs.map(async ID => this.getTransactionByID(ID)));
	}

	public async saveBlock(
		blockID: Buffer,
		height: number,
		block: Buffer,
		payload: Buffer[],
	): Promise<void> {
		const batch = new Batch();
		const blockIDDbKey = buildBlockIDDbKey(blockID);
		batch.set(blockIDDbKey, block);
		batch.set(buildBlockHeightDbKey(height), blockID);

		const txIDs = payload.map(tx => utils.hash(tx));

		let index = 0;
		while (index < payload.length) {
			// `key` is the hashed value
			// while `value` is bytes
			batch.set(buildTxIDDbKey(txIDs[index]), payload[index]);
			index += 1;
		}

		// each transaction's key is saved without concatenating the DB_KEY_TX_ID
		// since DB_KEY_TX_ID is used inside getTransactionByID(ID: Buffer)
		batch.set(buildTxsBlockIDDbKey(blockID), Buffer.concat(txIDs));
		await this._db.write(batch);
	}

	public async getLegacyChainBracketInfo(snapshotBlockID: Buffer): Promise<Buffer> {
		return this._db.get(buildLegacyBracketDBKey(snapshotBlockID));
	}

	public async setLegacyChainBracketInfo(
		snapshotBlockID: Buffer,
		bracketInfo: LegacyChainBracketInfo,
	): Promise<void> {
		await this._db.set(
			buildLegacyBracketDBKey(snapshotBlockID),
			encodeLegacyChainBracketInfo(bracketInfo),
		);
	}

	private async _getBlockIDsBetweenHeights(
		fromHeight: number,
		toHeight: number,
	): Promise<Buffer[]> {
		const stream = this._db.createReadStream({
			gte: buildBlockHeightDbKey(fromHeight),
			lte: buildBlockHeightDbKey(toHeight),
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
