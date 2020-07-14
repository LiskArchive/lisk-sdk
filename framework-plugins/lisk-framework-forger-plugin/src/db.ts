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
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { DB_KEY_FORGER_SYNC_INFO } from './constants';
import { forgerInfoSchema, forgerSyncSchema } from './schema';
import { ForgetSyncInfo } from './types';

export const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-forger-plugin.db',
): Promise<KVStore> => {
	const resolvedPath = dataPath.replace('~', os.homedir());
	const dirPath = join(resolvedPath, dbName);
	await ensureDir(dirPath);

	return new KVStore(dirPath);
};

export const getForgerSyncInfo = async (db: KVStore): Promise<ForgetSyncInfo> => {
	const encodedSyncInfo = await db.get(DB_KEY_FORGER_SYNC_INFO);
	return codec.decode<ForgetSyncInfo>(forgerInfoSchema, encodedSyncInfo);
};

export const setForgerSyncInfo = async (db: KVStore, blockHeight: number): Promise<void> => {
	const encodedSyncInfo = codec.encode(forgerSyncSchema, { syncUptoHeight: blockHeight });
	await db.put(DB_KEY_FORGER_SYNC_INFO, encodedSyncInfo);
};
