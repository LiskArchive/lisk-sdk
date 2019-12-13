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

const base = require('../config/jest.config.base');

module.exports = {
	...base,
	testMatch: ['<rootDir>/framework/test/jest/unit/specs/**/*.(spec|test).js'],

	coverageDirectory: '.coverage/unit',
	collectCoverageFrom: [
		'framework/src/controller/**',
		'framework/src/modules/chain/**',
	],
};
