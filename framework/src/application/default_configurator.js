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

const yargs = require('yargs');
const { config: loggerConfig } = require('../components/logger/defaults');
const Configurator = require('./configurator');

const configurator = new Configurator();

configurator.registerSchema(loggerConfig, 'components.logger');

yargs.command(
	'usage',
	'Show list of supported command line arguments and environment variables.',
	() => {
		console.info(configurator.helpBanner());
		process.exit();
	},
);
yargs.help('help', 'Run the "usage" command to see full list of options');

module.exports = configurator;
