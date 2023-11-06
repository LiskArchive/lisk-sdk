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

import { db } from 'lisk-sdk';
import * as fs from 'fs-extra';
import { homedir } from 'os';
import { join } from 'path';
import { getDBInstance } from '../../src/db';

jest.mock('fs-extra');
jest.mock('@liskhq/lisk-db');
const mockedFsExtra = fs as jest.Mocked<typeof fs>;

describe('Plugins DB', () => {
	const unresolvedRootPath = '~/.lisk/devnet';
	const dbName = 'lisk-framework-forger-plugin.db';

	beforeEach(() => {
		jest.spyOn(db, 'Database');
	});

	it('should resolve to data directory', async () => {
		await getDBInstance(unresolvedRootPath);
		const rootPath = unresolvedRootPath.replace('~', homedir());
		const dirPath = join(rootPath, 'plugins/data', dbName);

		expect(mockedFsExtra.ensureDir).toHaveBeenCalledWith(dirPath);
	});

	it('should resolve to default plugin data path', async () => {
		const customUnresolvedRootPath = '~/.lisk/devnet/custom/path';

		await getDBInstance(customUnresolvedRootPath);
		const rootPath = customUnresolvedRootPath.replace('~', homedir());
		const dirPath = join(rootPath, 'plugins/data', dbName);

		expect(mockedFsExtra.ensureDir).toHaveBeenCalledWith(dirPath);
	});
});
