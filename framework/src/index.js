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

const Application = require('./application/application');
const version = require('./version');
const defaultConfigurator = require('./application/default_configurator');
const systemDirs = require('./application/system_dirs');
const BaseModule = require('./modules/base_module');

module.exports = {
	Application,
	version,
	systemDirs,
	configurator: defaultConfigurator,
	BaseModule,
};
