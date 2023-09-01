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
import * as path from 'path';
import * as fs from 'fs';
import { Database } from '@liskhq/lisk-db';

export const backupDatabase = async (dataPath: string, db: Database) => {
	const backupPath = path.resolve(dataPath, 'backup');
	// if backup already exist, it should remove the directory and create a new checkpoint
	if (fs.existsSync(backupPath)) {
		fs.rmSync(backupPath, { recursive: true, force: true });
	}
	await db.checkpoint(backupPath);
}
