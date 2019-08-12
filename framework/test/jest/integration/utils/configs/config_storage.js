/*
 * Copyright © 2018 Lisk Foundation
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

const { defaults } = require('../../../../../src/components/storage');

const storageConfig = (overriddenConfigProperties = {}) => ({
	...defaults,
	min: 10,
	max: process.env.LISK_TEST_DB_MAX_CONNECTIONS || 2,
	...overriddenConfigProperties,
});

module.exports = {
	storageConfig,
};
