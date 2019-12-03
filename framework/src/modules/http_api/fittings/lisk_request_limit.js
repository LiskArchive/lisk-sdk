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

const _ = require('lodash');
const RateLimit = require('express-rate-limit');
const debug = require('debug')('swagger:lisk:request_limit');
const config = require('../helpers/swagger_module_registry').getConfig();

const defaults = {
	max: 0, // Disabled
	delayMs: 0, // Disabled
	delayAfter: 0, // Disabled
	windowMs: 60000, // 1 minute window
};

module.exports = function create(fittingDef) {
	debug('config: %j', fittingDef);
	const limits = {};
	let appConfigLimits = {};
	let overrideLimits = {};

	if (config) {
		appConfigLimits = config.options.limits;
	} else {
		appConfigLimits = {};
	}

	if (fittingDef && fittingDef.limits) {
		overrideLimits = fittingDef.limits;
	} else {
		overrideLimits = {};
	}

	_.assign(limits, defaults, appConfigLimits, overrideLimits);

	debug('limits: %j', limits);

	const middleware = new RateLimit(_.clone(limits));

	function liskRequestLimit(context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	}

	liskRequestLimit.limits = limits;
	liskRequestLimit.defaults = defaults;

	return liskRequestLimit;
};
