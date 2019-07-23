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
 * Adds a possibility to validate the app parameters for Lisk Framework provided through:
 * 1. Environment variables (env) like "npm start LISK_NETWORK=test"
 * 2. Command line arguments (arg) like "npm start --network test"
 * These keywords extend Ajv Validator and follow the format:
 * @type {{compile, errors, modifying, valid, metaSchema}}
 */

const env = require('./env');
const arg = require('./arg');

module.exports = { env, arg };
