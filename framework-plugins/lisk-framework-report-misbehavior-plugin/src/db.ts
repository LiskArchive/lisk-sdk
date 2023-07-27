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

import { Batch, Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { RawBlockHeader, BlockHeader } from '@liskhq/lisk-chain';
import { areHeadersContradicting } from '@liskhq/lisk-bft';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { RegisteredSchema } from 'lisk-framework';
import { hash } from '@liskhq/lisk-cryptography';

export const blockHeadersSchema = {
	$id: 'lisk/reportMisbehavior/blockHeaders',
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

const formatInt = (num: number | bigint): string => {
	let buf: Buffer;
	if (typeof num === 'bigint') {
		if (num < BigInt(0)) {
			throw new Error('Negative number cannot be formatted');
		}
		buf = Buffer.alloc(8);
		buf.writeBigUInt64BE(num);
	} else {
		if (num < 0) {
			throw new Error('Negative number cannot be formatted');
		}
		buf = Buffer.alloc(4);
		buf.writeUInt32BE(num, 0);
	}
	return buf.toString('binary');
};

const getFirstPrefix = (prefix: string): Buffer => Buffer.from(`${prefix}\x00`);
const getLastPrefix = (prefix: string): Buffer => Buffer.from(`${prefix}\xFF`);

export const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-report-misbehavior-plugin.db',
): Promise<Database> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	await ensureDir(dirPath);

	return new Database(dirPath);
};

export const getBlockHeaders = async (
	db: Database,
	dbKeyBlockHeader: string,
): Promise<BlockHeaders> => {
	try {
		const encodedBlockHeaders = await db.get(Buffer.from(dbKeyBlockHeader));
		return codec.decode<BlockHeaders>(blockHeadersSchema, encodedBlockHeaders);
	} catch (error) {
		return { blockHeaders: [] as Buffer[] };
	}
};

export const decodeBlockHeader = (encodedHeader: Buffer, schema: RegisteredSchema): BlockHeader => {
	const id = hash(encodedHeader);
	const blockHeader = codec.decode<RawBlockHeader>(schema.blockHeader, encodedHeader);
	const assetSchema = schema.blockHeadersAssets[blockHeader.version];
	const asset = codec.decode<BlockHeaderAsset>(assetSchema, blockHeader.asset);
	return {
		...blockHeader,
		asset,
		id,
	};
};

export const saveBlockHeaders = async (
	db: Database,
	schemas: RegisteredSchema,
	header: Buffer,
): Promise<boolean> => {
	const blockId = hash(header);
	const { generatorPublicKey, height } = codec.decode<RawBlockHeader>(schemas.blockHeader, header);
	const dbKey = `${generatorPublicKey.toString('binary')}:${formatInt(height)}`;
	const { blockHeaders } = await getBlockHeaders(db, dbKey);

	if (!blockHeaders.find(blockHeader => hash(blockHeader).equals(blockId))) {
		await db.set(
			Buffer.from(dbKey),
			codec.encode(blockHeadersSchema, {
				blockHeaders: [...blockHeaders, header],
			}),
		);
		return true;
	}
	return false;
};

type IteratableStream = NodeJS.ReadableStream & { destroy: (err?: Error) => void };

export const getContradictingBlockHeader = async (
	db: Database,
	blockHeader: BlockHeader,
	schemas: RegisteredSchema,
): Promise<BlockHeader | undefined> =>
	new Promise((resolve, reject) => {
		const stream = db.createReadStream({
			gte: getFirstPrefix(blockHeader.generatorPublicKey.toString('binary')),
			lte: getLastPrefix(blockHeader.generatorPublicKey.toString('binary')),
		}) as IteratableStream;
		stream
			.on('data', ({ value }: { value: Buffer }) => {
				const { blockHeaders } = codec.decode<BlockHeaders>(blockHeadersSchema, value);
				for (const encodedHeader of blockHeaders) {
					const decodedBlockHeader = decodeBlockHeader(encodedHeader, schemas);
					if (areHeadersContradicting(blockHeader, decodedBlockHeader)) {
						stream.destroy();
						resolve(decodedBlockHeader);
					}
				}
			})
			.on('error', error => {
				reject(error);
			})
			.on('end', () => {
				resolve(undefined);
			});
	});

export const clearBlockHeaders = async (
	db: Database,
	schemas: RegisteredSchema,
	currentHeight: number,
): Promise<void> => {
	const keys = await new Promise<string[]>((resolve, reject) => {
		const stream = db.createReadStream() as IteratableStream;
		const res: string[] = [];
		stream
			.on('data', ({ key, value }: { key: string; value: Buffer }) => {
				const { blockHeaders } = codec.decode<BlockHeaders>(blockHeadersSchema, value);
				for (const encodedHeader of blockHeaders) {
					const decodedBlockHeader = decodeBlockHeader(encodedHeader, schemas);
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
	const batch = new Batch();
	for (const k of keys) {
		batch.del(Buffer.from(k));
	}
	await db.write(batch);
};
