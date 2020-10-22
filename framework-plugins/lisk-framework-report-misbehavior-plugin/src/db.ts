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

export const saveBlockHeaders = async (
	db: KVStore,
	schemas: RegisteredSchema,
	header: Buffer,
): Promise<boolean> => {
	const blockId = hash(header);
	const { generatorPublicKey, height } = codec.decode<RawBlockHeader>(schemas.blockHeader, header);
	const dbKey = `${generatorPublicKey.toString('binary')}:${formatInt(height)}`;
	const { blockHeaders } = await getBlockHeaders(db, dbKey);

	if (!blockHeaders.find(blockHeader => hash(blockHeader).equals(blockId))) {
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
