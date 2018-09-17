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

var _ = require('lodash');
var RateLimit = require('express-rate-limit');
var debug = require('debug')('swagger:lisk:request_limit');
var config = require('../../helpers/swagger_module_registry').getConfig();

var defaults = {
	max: 0, // Disabled
	delayMs: 0, // Disabled
	delayAfter: 0, // Disabled
	windowMs: 60000, // 1 minute window
};

/**
 * Description of the function.
 *
 * @func create_request_limit
 * @memberof api.fittings
 * @requires debug
 * @requires express-rate-limit
 * @requires helpers/swagger_module_registry.getConfig
 * @requires lodash
 * @param {Object} fittingDef
 * @param {Object} bagpipes
 * @returns {function} {@link api.fittings.lisk_request_limit}
 * @todo Add description for the function and the params
 */
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

	/**
	 * Description of the function.
	 *
	 * @func lisk_request_limit
	 * @memberof api.fittings
	 * @param {Object} context
	 * @param {function} cb
	 * @returns {function} {@link api.fittings.lisk_request_limit}
	 * @todo Add description for the function and the params
	 */
	function lisk_request_limit(context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	}

	lisk_request_limit.limits = limits;
	lisk_request_limit.defaults = defaults;

	return lisk_request_limit;
};
