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

import * as fs from 'fs-extra';
import { homedir } from 'os';
import { join } from 'path';
import { getDBInstance } from '../../src/db';

jest.mock('fs-extra');
jest.mock('@liskhq/lisk-db');
const mockedFsExtra = fs as jest.Mocked<typeof fs>;

describe('Plugins DB', () => {
	const unresolvedRootPath = '~/.lisk';
	const pluginDataPath = 'plugins/forger/data';
	const dbName = 'lisk-framework-forger-plugin.db';

	it('should resolve to data directory', async () => {
		await getDBInstance(unresolvedRootPath, pluginDataPath);
		const rootPath = unresolvedRootPath.replace('~', homedir());
		const dirPath = join(rootPath, pluginDataPath, dbName);

		expect(mockedFsExtra.ensureDir).toBeCalledWith(dirPath);
	});

	it('should resolve to default plugin data path', async () => {
		await getDBInstance(unresolvedRootPath);
		const rootPath = unresolvedRootPath.replace('~', homedir());
		const dirPath = join(rootPath, 'plugins/data', dbName);

		expect(mockedFsExtra.ensureDir).toBeCalledWith(dirPath);
	});
});
