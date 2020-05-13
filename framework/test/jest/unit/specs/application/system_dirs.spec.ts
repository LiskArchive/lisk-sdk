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

import { systemDirs } from '../../../../../src/application/system_dirs';

describe('systemDirs', () => {
	it('Should return directories configuration with given app label.', () => {
		// Arrange
		const appLabel = 'LABEL';
		const rootPath = '~/.lisk';

		// Act
		const dirsObj = systemDirs(appLabel, rootPath);

		// Assert
		expect(dirsObj).toEqual({
			root: `${rootPath}/${appLabel}/`,
			data: `${rootPath}/${appLabel}/data`,
			tmp: `${rootPath}/${appLabel}/tmp`,
			logs: `${rootPath}/${appLabel}/logs`,
			sockets: `${rootPath}/${appLabel}/tmp/sockets`,
			pids: `${rootPath}/${appLabel}/tmp/pids`,
		});
	});
});
