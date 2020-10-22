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

import { KVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { RawBlockHeader } from '@liskhq/lisk-chain';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { BlockHeaderJSON, blockHeaderSchema, RegisteredSchema } from 'lisk-framework';

const blockHeadersSchema = {
	$id: 'lisk/reportMisbehavior/blockHeaders',
	type: 'object',
	required: ['blockHeaders'],
	properties: {
		blockHeaders: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...blockHeaderSchema,
			},
		},
	},
};

interface BlockHeaders {
	readonly blockHeaders: RawBlockHeader[];
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
		return codec.decode(blockHeadersSchema, encodedBlockHeaders);
	} catch (error) {
		return { blockHeaders: [] };
	}
};

export const getBlockHeaderObject = (
	schemas: RegisteredSchema,
	blockHeaderJSON: BlockHeaderJSON,
): Record<string, unknown> => {
	const { id, ...blockHeaderJSONWithoutID } = blockHeaderJSON;
	const assetSchema = schemas.blockHeadersAssets[blockHeaderJSON.version];
	const assetObject = codec.fromJSON(assetSchema, blockHeaderJSONWithoutID.asset);
	const encodedAsset = codec.encode(assetSchema, assetObject);
	const blockHeaderObject = codec.fromJSON<Record<string, unknown>>(schemas.blockHeader, {
		...blockHeaderJSONWithoutID,
		asset: encodedAsset,
	});

	return blockHeaderObject;
};

export const encodeBlockHeaders = (
	blockHeaders: RawBlockHeader[],
	blockHeaderObject: Record<string, unknown>,
): Buffer =>
	codec.encode(blockHeadersSchema, {
		blockHeaders: [...blockHeaders, blockHeaderObject],
	});

export const saveBlockHeaders = async (
	db: KVStore,
	schemas: RegisteredSchema,
	blockHeaderJSON: BlockHeaderJSON,
): Promise<void> => {
	const { generatorPublicKey, height, signature } = blockHeaderJSON;
	const dbKeyBlockHeader = `${generatorPublicKey}:${height}`;
	const { blockHeaders } = await getBlockHeaders(db, dbKeyBlockHeader);
	if (!blockHeaders.find(b => b.signature.equals(Buffer.from(signature, 'hex')))) {
		const encodedBlockHeaders = getBlockHeaderObject(schemas, blockHeaderJSON);
		await db.put(dbKeyBlockHeader, encodeBlockHeaders(blockHeaders, encodedBlockHeaders));
	}
};
