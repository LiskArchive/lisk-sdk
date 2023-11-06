/*
 * Copyright © 2019 Lisk Foundation
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
import { systemDirs } from '../../src/system_dirs';

beforeEach(() => {
	jest.spyOn(os, 'homedir').mockReturnValue('/user');
});

describe('systemDirs', () => {
	it('Should return directories configuration with dataPath.', () => {
		// Arrange
		const appLabel = 'LABEL';

		// Act
		const dirsObj = systemDirs(`~/.lisk/${appLabel}`);

		// Assert
		expect(dirsObj).toEqual({
			config: `/user/.lisk/${appLabel}/config`,
			dataPath: `/user/.lisk/${appLabel}`,
			data: `/user/.lisk/${appLabel}/data`,
			tmp: `/user/.lisk/${appLabel}/tmp`,
			logs: `/user/.lisk/${appLabel}/logs`,
			sockets: `/user/.lisk/${appLabel}/tmp/sockets`,
			pids: `/user/.lisk/${appLabel}/tmp/pids`,
			plugins: `/user/.lisk/LABEL/plugins`,
		});
	});

	it('Should be able to resolve relative path correctly.', () => {
		// Arrange
		const appLabel = 'LABEL';
		const rootPath = '/user/../.lisk';

		// Act
		const dirsObj = systemDirs(`${rootPath}/${appLabel}`);

		// Assert
		expect(dirsObj).toEqual({
			config: `/.lisk/${appLabel}/config`,
			dataPath: `/.lisk/${appLabel}`,
			data: `/.lisk/${appLabel}/data`,
			tmp: `/.lisk/${appLabel}/tmp`,
			logs: `/.lisk/${appLabel}/logs`,
			sockets: `/.lisk/${appLabel}/tmp/sockets`,
			pids: `/.lisk/${appLabel}/tmp/pids`,
			plugins: `/.lisk/${appLabel}/plugins`,
		});
	});

	it('Should be able to resolve absolute path correctly.', () => {
		// Arrange
		const appLabel = 'LABEL';
		const rootPath = '/customPath/.lisk';

		// Act
		const dirsObj = systemDirs(`${rootPath}/${appLabel}`);

		// Assert
		expect(dirsObj).toEqual({
			config: `/customPath/.lisk/${appLabel}/config`,
			dataPath: `/customPath/.lisk/${appLabel}`,
			data: `/customPath/.lisk/${appLabel}/data`,
			tmp: `/customPath/.lisk/${appLabel}/tmp`,
			logs: `/customPath/.lisk/${appLabel}/logs`,
			sockets: `/customPath/.lisk/${appLabel}/tmp/sockets`,
			pids: `/customPath/.lisk/${appLabel}/tmp/pids`,
			plugins: `/customPath/.lisk/${appLabel}/plugins`,
		});
	});

	it('Should be able to resolve home path correctly.', () => {
		// Arrange
		const appLabel = 'LABEL';
		const rootPath = '~/.lisk';

		// Act
		const dirsObj = systemDirs(`${rootPath}/${appLabel}`);

		// Assert
		expect(dirsObj).toEqual({
			config: `/user/.lisk/${appLabel}/config`,
			dataPath: `/user/.lisk/${appLabel}`,
			data: `/user/.lisk/${appLabel}/data`,
			tmp: `/user/.lisk/${appLabel}/tmp`,
			logs: `/user/.lisk/${appLabel}/logs`,
			sockets: `/user/.lisk/${appLabel}/tmp/sockets`,
			pids: `/user/.lisk/${appLabel}/tmp/pids`,
			plugins: `/user/.lisk/${appLabel}/plugins`,
		});
	});
});
