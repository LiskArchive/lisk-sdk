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

const path = require('path');

if (process.env.NEW_RELIC_LICENSE_KEY) {
	// eslint-disable-next-line global-require
	const newrelic = require('newrelic');
	// eslint-disable-next-line global-require
	const newrelicLisk = require('lisk-newrelic')(newrelic, {
		exitOnFailure: true,
		rootPath: path.dirname(__filename),
	});

	newrelicLisk.instrumentCallbackMethods('./cache', 'components.cache', [
		'getJsonForKey',
		'setJsonForKey',
		'deleteJsonForKey',
		'removeByPattern',
	]);
}

const constants = require('./constants');
const Cache = require('./cache');
const { config: defaultConfig } = require('./defaults');
const validator = require('../../controller/validator');

function createCacheComponent(options, logger) {
	const optionsWithDefaults = validator.parseEnvArgAndValidate(
		defaultConfig,
		options,
	);

	// delete password key if it's value is null
	if (optionsWithDefaults.password === null) {
		delete optionsWithDefaults.password;
	}
	return new Cache(optionsWithDefaults, logger);
}

module.exports = {
	defaults: defaultConfig,
	...constants,
	createCacheComponent,
};
