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

const base = require('../../jest.config');

module.exports = {
	...base,
	rootDir: '../../',
	setupFilesAfterEnv: ['<rootDir>/test/functional/setup.js'],
	testMatch: ['<rootDir>/test/functional/**/*.(spec|test).ts'],
};
