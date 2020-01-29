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

'use strict';

const systemDirs = require('../../../../../src/application/system_dirs');

describe('systemDirs', () => {
	it('Should return directories configuration with given app label.', () => {
		// Arrange
		const appLabel = 'LABEL';
		const tempPath = '/tmp/lisk';

		// Act
		const dirsObj = systemDirs(appLabel, tempPath);

		// Assert
		expect(dirsObj).toEqual({
			temp: `${tempPath}/${appLabel}/`,
			sockets: `${tempPath}/${appLabel}/sockets`,
			pids: `${tempPath}/${appLabel}/pids`,
		});
	});
});
