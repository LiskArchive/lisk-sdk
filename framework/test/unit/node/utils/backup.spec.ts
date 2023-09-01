/*
 * Copyright © 2023 Lisk Foundation
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
import * as path from 'path';
import * as fs from 'fs';
import { Database } from '@liskhq/lisk-db';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { backupDatabase } from '../../../../src/node/utils/backup';

describe('backup', () => {
	const getDataPath = (name: string) => path.join(os.tmpdir(), Date.now().toString(), name);

	it('should create backup', async () => {
		const dbName = 'db-1';
		const dataPath = getDataPath(dbName);
		const db = new Database(path.join(dataPath, dbName));
		const key = getRandomBytes(10);
		await db.set(key, getRandomBytes(20));

		await backupDatabase(dataPath, db);

		expect(fs.existsSync(path.join(dataPath, 'backup'))).toBeTrue();
		db.close();
	});

	it('should remove old backup and create new one if exist', async () => {
		const dbName = 'db-2';
		const dataPath = getDataPath(dbName);
		const db = new Database(path.join(dataPath, dbName));
		const key = getRandomBytes(10);
		await db.set(key, getRandomBytes(20));

		await backupDatabase(dataPath, db);
		const key2 = getRandomBytes(10);
		await db.set(key2, getRandomBytes(20));

		expect(fs.existsSync(path.join(dataPath, 'backup'))).toBeTrue();

		await backupDatabase(dataPath, db);

		expect(fs.existsSync(path.join(dataPath, 'backup'))).toBeTrue();
		db.close();
		const backupDB = new Database(path.join(dataPath, 'backup'));

		await expect(backupDB.has(key2)).resolves.toBeTrue();
		backupDB.close();
	});

});
