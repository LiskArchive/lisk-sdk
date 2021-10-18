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

import { formatInt, KVStore, getFirstPrefix, getLastPrefix } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { BlockHeader } from '@liskhq/lisk-chain';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { hash } from '@liskhq/lisk-cryptography';
import { BasePlugin } from 'lisk-framework';

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

export const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-report-misbehavior-plugin.db',
): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	await ensureDir(dirPath);

	return new KVStore(dirPath);
};

export const getBlockHeaders = async (
	db: KVStore,
	dbKeyBlockHeader: Buffer,
): Promise<BlockHeaders> => {
	try {
		const encodedBlockHeaders = await db.get(dbKeyBlockHeader);
		return codec.decode<BlockHeaders>(blockHeadersSchema, encodedBlockHeaders);
	} catch (error) {
		return { blockHeaders: [] as Buffer[] };
	}
};

export const saveBlockHeaders = async (db: KVStore, headerBytes: Buffer): Promise<boolean> => {
	const header = BlockHeader.fromBytes(headerBytes);
	const dbKey = Buffer.concat([
		header.generatorAddress,
		Buffer.from(':', 'utf8'),
		formatInt(header.height),
	]);
	const { blockHeaders } = await getBlockHeaders(db, dbKey);

	if (!blockHeaders.find(blockHeader => hash(blockHeader).equals(header.id))) {
		await db.put(
			dbKey,
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
	db: KVStore,
	blockHeader: BlockHeader,
	apiClient: BasePlugin['apiClient'],
): Promise<BlockHeader | undefined> => {
	const header1 = blockHeader.getBytes().toString('hex');
	const existingHeaders = await new Promise<string[]>((resolve, reject) => {
		const stream = db.createReadStream({
			gte: getFirstPrefix(blockHeader.generatorAddress),
			lte: getLastPrefix(blockHeader.generatorAddress),
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
		const contradicting = await apiClient.invoke('bft_areHeadersContradicting', {
			header1,
			header2,
		});
		if (contradicting) {
			return BlockHeader.fromBytes(Buffer.from(header2, 'hex'));
		}
	}
	return undefined;
};

export const clearBlockHeaders = async (db: KVStore, currentHeight: number): Promise<void> => {
	const keys = await new Promise<Buffer[]>((resolve, reject) => {
		const stream = db.createReadStream() as IteratableStream;
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
	const batch = db.batch();
	for (const k of keys) {
		batch.del(k);
	}
	await batch.write();
};
