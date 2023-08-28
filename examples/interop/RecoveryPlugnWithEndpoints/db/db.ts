import { db } from 'lisk-sdk';

import { join } from 'path';
import * as os from 'os';
import { ensureDir } from 'fs-extra';
import { KVStore } from '../types';

export const getDBInstance = async (
	dbName = 'recoveryDb',
	dataPath = '~/.lisk',
): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);

	await ensureDir(dirPath);
	return new db.Database(dirPath);
};
