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

if (process.env.NEW_RELIC_LICENSE_KEY) {
	const newrelic = require('newrelic');
	const path = require('path');
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

function createCacheComponent(options, logger) {
	// delete password key if it's value is null
	const cacheConfigParam = { ...options };
	if (cacheConfigParam.password === null) {
		delete cacheConfigParam.password;
	}
	return new Cache(cacheConfigParam, logger);
}

module.exports = {
	...constants,
	createCacheComponent,
};
