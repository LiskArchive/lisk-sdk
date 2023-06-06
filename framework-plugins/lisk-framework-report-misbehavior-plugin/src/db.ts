/*
 * Copyright © 2020 Lisk Foundation
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

import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { cryptography, codec, chain, db as liskDB, BasePlugin } from 'lisk-sdk';

const { BlockHeader } = chain;
const { utils } = cryptography;

export const blockHeadersSchema = {
	$id: '/lisk/reportMisbehavior/blockHeaders',
	type: 'object',
	required: ['blockHeaders'],
	properties: {
		blockHeaders: {
			type: 'array',
			fieldNumber: 1,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export interface BlockHeaderAsset {
	readonly seedReveal: Buffer;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
}

interface BlockHeaders {
	readonly blockHeaders: Buffer[];
}

export const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-report-misbehavior-plugin.db',
): Promise<liskDB.Database> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	await ensureDir(dirPath);

	return new liskDB.Database(dirPath);
};

export const getBlockHeaders = async (
	db: liskDB.Database,
	dbKeyBlockHeader: Buffer,
): Promise<BlockHeaders> => {
	try {
		const encodedBlockHeaders = await db.get(dbKeyBlockHeader);
		return codec.decode<BlockHeaders>(blockHeadersSchema, encodedBlockHeaders);
	} catch (error) {
		return { blockHeaders: [] as Buffer[] };
	}
};

export const saveBlockHeaders = async (
	db: liskDB.Database,
	headerBytes: Buffer,
): Promise<boolean> => {
	const header = BlockHeader.fromBytes(headerBytes);
	const heightBytes = Buffer.alloc(4);
	heightBytes.writeUInt32BE(header.height, 0);
	const dbKey = Buffer.concat([header.generatorAddress, Buffer.from(':', 'utf8'), heightBytes]);
	const { blockHeaders } = await getBlockHeaders(db, dbKey);

	if (!blockHeaders.find(blockHeader => utils.hash(blockHeader).equals(header.id))) {
		await db.set(
			dbKey,
			codec.encode(blockHeadersSchema, {
				blockHeaders: [...blockHeaders, header.getBytes()],
			}),
		);
		return true;
	}
	return false;
};

type IteratableStream = NodeJS.ReadableStream & { destroy: (err?: Error) => void };

export const getContradictingBlockHeader = async (
	db: liskDB.Database,
	blockHeader: chain.BlockHeader,
	apiClient: BasePlugin['apiClient'],
): Promise<chain.BlockHeader | undefined> => {
	const header1 = blockHeader.getBytes().toString('hex');
	const existingHeaders = await new Promise<string[]>((resolve, reject) => {
		const stream = db.createReadStream({
			gte: Buffer.concat([blockHeader.generatorAddress, Buffer.alloc(4, 0)]),
			lte: Buffer.concat([blockHeader.generatorAddress, Buffer.alloc(4, 255)]),
		}) as IteratableStream;
		const results: string[] = [];
		stream
			.on('data', ({ value }: { value: Buffer }) => {
				const { blockHeaders } = codec.decode<BlockHeaders>(blockHeadersSchema, value);
				for (const encodedHeader of blockHeaders) {
					results.push(encodedHeader.toString('hex'));
				}
			})
			.on('error', error => {
				reject(error);
			})
			.on('end', () => {
				resolve(results);
			});
	});
	for (const header2 of existingHeaders) {
		const { valid } = await apiClient.invoke<{ valid: boolean }>('chain_areHeadersContradicting', {
			header1,
			header2,
		});
		if (valid) {
			return BlockHeader.fromBytes(Buffer.from(header2, 'hex'));
		}
	}
	return undefined;
};

export const clearBlockHeaders = async (
	db: liskDB.Database,
	currentHeight: number,
): Promise<void> => {
	const keys = await new Promise<Buffer[]>((resolve, reject) => {
		const stream = db.createReadStream();
		const res: Buffer[] = [];
		stream
			.on('data', ({ key, value }: { key: Buffer; value: Buffer }) => {
				const { blockHeaders } = codec.decode<BlockHeaders>(blockHeadersSchema, value);
				for (const encodedHeader of blockHeaders) {
					const decodedBlockHeader = BlockHeader.fromBytes(encodedHeader);
					if (decodedBlockHeader.height < currentHeight - 260000) {
						res.push(key);
					}
				}
			})
			.on('error', error => {
				reject(error);
			})
			.on('end', () => {
				resolve(res);
			});
	});
	const batch = new liskDB.Batch();
	for (const k of keys) {
		batch.del(k);
	}
	await db.write(batch);
};
