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

const { config: DefaultConfig } = require('./defaults');
const Logger = require('./logger');
const validator = require('../../controller/helpers/validator');
const configSchema = require('./defaults/config');

function createLoggerComponent(config = {}) {
	validator.loadSchema(configSchema);
	validator.validate(configSchema, config);

	return new Logger(config).bootstrap();
}

module.exports = {
	defaults: DefaultConfig,
	createLoggerComponent,
};
