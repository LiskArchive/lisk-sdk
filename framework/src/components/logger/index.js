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

const Logger = require('./logger');
const { config: defaultConfig } = require('./defaults');
const validator = require('../../controller/helpers/validator');

function createLoggerComponent(options = {}) {
	const optionsWithDefaults = validator.validateWithDefaults(
		defaultConfig,
		options
	);

	return new Logger(optionsWithDefaults).bootstrap();
}

module.exports = {
	defaults: defaultConfig,
	createLoggerComponent,
};
