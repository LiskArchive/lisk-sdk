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

import * as createDebug from 'debug';
import { codec, db as liskDB } from 'lisk-sdk';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { EMPTY_BYTES } from './constants';
import { chainConnectorInfoSchema } from './schemas';
import { ChainConnectorInfo } from './types';

const debug = createDebug('plugin:forger:db');

const { Database } = liskDB;
type KVStore = liskDB.Database;

export const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-chain-connector-plugin.db',
): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	await ensureDir(dirPath);

	return new Database(dirPath);
};

export const getChainConnectorInfo = async (db: KVStore): Promise<ChainConnectorInfo> => {
	try {
		const encodedInfo = await db.get(EMPTY_BYTES);
		return codec.decode<ChainConnectorInfo>(chainConnectorInfoSchema, encodedInfo);
	} catch (error) {
		debug('Chain connector info does not exist.');
		return {
			blockHeaders: [],
			aggregateCommits: [],
			validatorsHashPreimage: [],
		};
	}
};

export const setChainConnectorInfo = async (
	db: KVStore,
	chainConnectorInfo: ChainConnectorInfo,
): Promise<void> => {
	const encodedInfo = codec.encode(chainConnectorInfoSchema, chainConnectorInfo);
	await db.set(EMPTY_BYTES, encodedInfo);
};
