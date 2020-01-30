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

const { storageConfig } = require('./config_storage');
const { cacheConfig } = require('./config_cache');
const { constantsConfig } = require('./config_constants');
const { nodeConfig } = require('./config_node');

module.exports = {
	storageConfig,
	cacheConfig,
	constantsConfig,
	nodeConfig,
};
