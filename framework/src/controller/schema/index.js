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

/**
 * @namespace framework.controller.schema
 * @see Parent: {@link controller}
 */

const applicationConfigSchema = require('./application_config_schema');
const constantsSchema = require('./constants_schema');
const genesisBlockSchema = require('./genesis_block_schema');

module.exports = {
	applicationConfigSchema,
	constantsSchema,
	genesisBlockSchema,
};
