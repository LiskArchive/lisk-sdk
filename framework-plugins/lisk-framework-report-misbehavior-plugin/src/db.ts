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

import { formatInt, KVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { RawBlockHeader } from '@liskhq/lisk-chain';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { RegisteredSchema } from 'lisk-framework';
import { hash } from '@liskhq/lisk-cryptography';

const blockHeadersSchema = {
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
	dbKeyBlockHeader: string,
): Promise<BlockHeaders> => {
	try {
		const encodedBlockHeaders = await db.get(dbKeyBlockHeader);
		return codec.decode<BlockHeaders>(blockHeadersSchema, encodedBlockHeaders);
	} catch (error) {
		return { blockHeaders: [] as Buffer[] };
	}
};

export const encodeBlockHeaders = (
	schemas: RegisteredSchema,
	blockHeaders: Buffer[],
	blockHeaderObject: Record<string, unknown>,
): Buffer => {
	const encodedBlockHeader = codec.encode(schemas.blockHeader, blockHeaderObject);
	return codec.encode(blockHeadersSchema, {
		blockHeaders: [...blockHeaders, encodedBlockHeader],
	});
};

export const saveBlockHeaders = async (
	db: KVStore,
	schemas: RegisteredSchema,
	blockHeader: Buffer,
): Promise<void> => {
	const blockHeaderObject = codec.decode<RawBlockHeader>(schemas.blockHeader, blockHeader);
	const { generatorPublicKey, height, id } = blockHeaderObject;
	const dbKey = `${generatorPublicKey.toString('hex')}:${formatInt(height)}`;
	const { blockHeaders } = await getBlockHeaders(db, dbKey);

	if (!blockHeaders.find(aBlockHeader => hash(aBlockHeader).equals(id))) {
		const { id: blockId, ...blockHeaderWithoutId } = blockHeaderObject;
		const updatedBlockHeaders = encodeBlockHeaders(schemas, blockHeaders, blockHeaderWithoutId as unknown as Record<string, unknown>);
		await db.put(dbKey, updatedBlockHeaders);
	}
};
