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

const { createLogger } = require('./logger');
const { config: defaultConfig } = require('./defaults');
const validator = require('../../controller/validator');

function createLoggerComponent(options = {}) {
	const optionsWithDefaults = validator.parseEnvArgAndValidate(
		defaultConfig,
		options,
	);

	return createLogger(optionsWithDefaults);
}

module.exports = {
	defaults: defaultConfig,
	createLoggerComponent,
};
