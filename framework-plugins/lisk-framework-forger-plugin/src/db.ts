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

import * as createDebug from 'debug';
import { Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import * as os from 'os';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { DB_KEY_FORGER_INFO, DB_KEY_FORGER_SYNC_INFO } from './constants';
import { forgerInfoSchema, forgerSyncSchema } from './schema';
import { ForgerInfo, ForgetSyncInfo } from './types';

const debug = createDebug('plugin:forger:db');

export const getDBInstance = async (
	dataPath: string,
	dbName = 'lisk-framework-forger-plugin.db',
): Promise<Database> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	await ensureDir(dirPath);

	return new Database(dirPath);
};

export const getForgerSyncInfo = async (db: Database): Promise<ForgetSyncInfo> => {
	try {
		const encodedSyncInfo = await db.get(Buffer.from(DB_KEY_FORGER_SYNC_INFO));
		return codec.decode<ForgetSyncInfo>(forgerSyncSchema, encodedSyncInfo);
	} catch (error) {
		debug('Forger sync info does not exists');
		return {
			syncUptoHeight: 0,
		};
	}
};

export const setForgerSyncInfo = async (db: Database, blockHeight: number): Promise<void> => {
	const encodedSyncInfo = codec.encode(forgerSyncSchema, { syncUptoHeight: blockHeight });
	await db.set(Buffer.from(DB_KEY_FORGER_SYNC_INFO), encodedSyncInfo);
};

export const setForgerInfo = async (
	db: Database,
	forgerAddress: string,
	forgerInfo: ForgerInfo,
): Promise<void> => {
	const encodedForgerInfo = codec.encode(forgerInfoSchema, forgerInfo);
	await db.set(Buffer.from(`${DB_KEY_FORGER_INFO}:${forgerAddress}`), encodedForgerInfo);
};

export const getForgerInfo = async (db: Database, forgerAddress: string): Promise<ForgerInfo> => {
	let forgerInfo;
	try {
		forgerInfo = await db.get(Buffer.from(`${DB_KEY_FORGER_INFO}:${forgerAddress}`));
	} catch (error) {
		debug(`Forger info does not exists for delegate: ${forgerAddress}`);
		return {
			totalProducedBlocks: 0,
			totalReceivedFees: BigInt(0),
			totalReceivedRewards: BigInt(0),
			votesReceived: [],
		};
	}

	return codec.decode<ForgerInfo>(forgerInfoSchema, forgerInfo);
};
