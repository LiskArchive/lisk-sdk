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

// import { utils } from '@liskhq/lisk-cryptography';
import { intToBuffer } from '@liskhq/lisk-cryptography/dist-node/utils';
import { Batch, Database, NotFoundError } from '@liskhq/lisk-db';
import { Logger } from '../../logger';
import { decodeBlockJSON, LegacyBlockSchema } from './codec';
import { LegacyBlockJSON } from './types';

export const DB_KEY_BLOCK_ID = Buffer.from([0]);
export const DB_KEY_BLOCK_HEIGHT = Buffer.from([1]);
export const DB_KEY_TRANSACTIONS_BLOCK_ID = Buffer.from([2]);
export const DB_KEY_TRANSACTIONS_ID = Buffer.from([3]);

interface BlockJson {
	block: LegacyBlockJSON;
	schema: LegacyBlockSchema;
}

export class Storage {
	private readonly _db: Database;
	private readonly _logger!: Logger;

	public constructor(db: Database) {
		this._db = db;
	}

	public async getBlockByID(_id: Buffer): Promise<BlockJson> {
		try {
			const block = await this._db.get(Buffer.concat([DB_KEY_BLOCK_ID, _id]));
			return decodeBlockJSON(block);
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw new NotFoundError(`Specified key ${_id.toString('hex')} does not exist.`);
			}

			this._logger.error({ err: error as Error }, 'Failed to get block by ID.');
			throw error;
		}
	}

	public async getBlockByHeight(_height: number): Promise<BlockJson> {
		try {
			const id = await this._db.get(Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(_height, 4)]));
			return this.getBlockByID(id);
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw new NotFoundError(`Specified height ${_height} does not exist.`);
			}

			this._logger.error({ err: error as Error }, 'Failed to get block by height.');
			throw error;
		}
	}

	public async getBlocksByHeightBetween(
		_fromHeight: number,
		_toHeight: number,
	): Promise<BlockJson[]> {
		try {
			const blockIDs = await this._getBlockHeadersByHeightBetween(_fromHeight, _toHeight);
			const blocks: BlockJson[] = [];

			for (const blockID of blockIDs) {
				const id = blockID;
				const block = await this.getBlockByID(id);
				blocks.push(block);
			}

			return blocks;
		} catch (error) {
			this._logger.error({ err: error as Error }, 'Failed to get blocks by height between.');
			throw error;
		}
	}

	public async isBlockPersisted(_blockID: Buffer): Promise<boolean> {
		try {
			return await this._db.has(Buffer.concat([DB_KEY_BLOCK_ID, _blockID]));
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw new NotFoundError(`Specified key ${_blockID.toString('hex')} does not exist.`);
			}

			this._logger.error({ err: error as Error }, 'Failed to check block persistence.');
			throw error;
		}
	}

	public async isBlockHeightPersisted(_height: number): Promise<boolean> {
		try {
			return await this._db.has(Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(_height, 4)]));
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw new NotFoundError(`Specified height ${_height} does not exist.`);
			}

			this._logger.error({ err: error as Error }, 'Failed to check block height persistence.');
			throw error;
		}
	}

	public async saveBlock(_id: Buffer, _height: number, _block: Buffer): Promise<void> {
		try {
			const batch = new Batch();
			batch.set(Buffer.concat([DB_KEY_BLOCK_ID, _id]), _block);
			batch.set(Buffer.concat([DB_KEY_BLOCK_HEIGHT, intToBuffer(_height, 4)]), _id);

			await this._db.write(batch);
		} catch (error) {
			this._logger.error({ err: error as Error }, 'Failed to save block.');
			throw error;
		}
	}

	private async _getBlockHeadersByHeightBetween(
		fromHeight: number,
		toHeight: number,
	): Promise<Buffer[]> {
		try {
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
		} catch (error) {
			this._logger.error({ err: error as Error }, 'Failed to get block headers by height between.');
			throw error;
		}
	}
}
