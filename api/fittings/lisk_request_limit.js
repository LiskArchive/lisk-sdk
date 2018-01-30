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

var debug = require('debug')('swagger:lisk:request_limit');
var config = require('../../helpers/swagger_module_registry').getConfig();
var RateLimit = require('express-rate-limit');
var _ = require('lodash');

var defaults = {
	max: 0, // Disabled
	delayMs: 0, // Disabled
	delayAfter: 0, // Disabled
	windowMs: 60000 // 1 minute window
};

module.exports = function create(fittingDef) {
	debug('config: %j', fittingDef);
	var limits = {};
	var appConfigLimits = {};
	var overrideLimits = {};

	if (config) {
		appConfigLimits = config.api.options.limits;
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

	var middleware = new RateLimit(_.clone(limits));

	function lisk_request_limit(context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	}

	lisk_request_limit.limits = limits;
	lisk_request_limit.defaults = defaults;

	return lisk_request_limit;
};
