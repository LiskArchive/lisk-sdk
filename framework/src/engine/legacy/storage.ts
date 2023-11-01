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

import { Batch, Database, NotFoundError } from '@liskhq/lisk-db';
import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { decodeLegacyChainBracketInfo, encodeLegacyChainBracketInfo } from './codec';
import { LegacyChainBracketInfo } from './types';
import {
	buildBlockIDDbKey,
	buildBlockHeightDbKey,
	buildTxIDDbKey,
	buildLegacyBracketDBKey,
	buildTxsBlockIDDbKey,
} from './utils';
import { blockSchemaV2 } from './schemas';

export class Storage {
	private readonly _db: Database;

	public constructor(db: Database) {
		this._db = db;
	}

	// `id` is the hashed value (utils.hash)
	public async getTransactionByID(id: Buffer): Promise<Buffer> {
		return this._db.get(buildTxIDDbKey(id));
	}

	public async getBlockByID(id: Buffer): Promise<Buffer> {
		const blockHeader = await this._db.get(buildBlockIDDbKey(id));
		let payload: Buffer[] = [];
		try {
			payload = await this.getTransactionsByBlockID(id);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		return codec.encode(blockSchemaV2, {
			header: blockHeader,
			payload,
		});
	}

	public async getBlockByHeight(height: number): Promise<Buffer> {
		const id = await this._db.get(buildBlockHeightDbKey(height));
		return this.getBlockByID(id);
	}

	public async getBlocksByHeightBetween(fromHeight: number, toHeight: number): Promise<Buffer[]> {
		const ids = await this._getBlockIDsBetweenHeights(fromHeight, toHeight);
		return Promise.all(ids.map(async id => this.getBlockByID(id)));
	}

	public async isBlockPersisted(blockID: Buffer): Promise<boolean> {
		return this._db.has(buildBlockIDDbKey(blockID));
	}

	public async isBlockHeightPersisted(height: number): Promise<boolean> {
		return this._db.has(buildBlockHeightDbKey(height));
	}

	public async getTransactionsByBlockID(blockID: Buffer): Promise<Buffer[]> {
		const txIdsBuffer = await this._db.get(buildTxsBlockIDDbKey(blockID));
		// key for the txIDs always exists
		if (!txIdsBuffer.length) {
			return [];
		}

		const txIds: Buffer[] = [];

		// each txID is hashed value of 32 length
		const idLength = 32;
		for (let i = 0; i < txIdsBuffer.length; i += idLength) {
			const txId = txIdsBuffer.subarray(i, i + idLength);
			txIds.push(txId);
		}

		return Promise.all(txIds.map(async id => this.getTransactionByID(id)));
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

		const txIds = payload.map(tx => utils.hash(tx));

		for (let index = 0; index < payload.length; index += 1) {
			// `key` is the hashed value
			// while `value` is bytes
			batch.set(buildTxIDDbKey(txIds[index]), payload[index]);
		}

		// each transaction's key is saved without concatenating the DB_KEY_TRANSACTIONS_ID
		// since DB_KEY_TRANSACTIONS_ID is used inside getTransactionByID(ID: Buffer)
		batch.set(buildTxsBlockIDDbKey(blockID), Buffer.concat(txIds));
		await this._db.write(batch);
	}

	public async getBracketInfo(snapshotBlockID: Buffer): Promise<LegacyChainBracketInfo> {
		const encodedBracketInfo = await this._db.get(buildLegacyBracketDBKey(snapshotBlockID));

		return decodeLegacyChainBracketInfo(encodedBracketInfo);
	}

	public async setBracketInfo(
		snapshotBlockID: Buffer,
		bracketInfo: LegacyChainBracketInfo,
	): Promise<void> {
		await this._db.set(
			buildLegacyBracketDBKey(snapshotBlockID),
			encodeLegacyChainBracketInfo(bracketInfo),
		);
	}

	public async hasBracketInfo(snapshotBlockID: Buffer): Promise<boolean> {
		try {
			const bracketInfo = await this.getBracketInfo(snapshotBlockID);

			return !!bracketInfo;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			return false;
		}
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
