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

const debug = require('debug')('swagger:lisk:cors');
const CORS = require('cors');
const modules = require('../helpers/swagger_module_registry');

/**
 * Description of the function.
 *
 * @func create_cors
 * @memberof api.fittings
 * @requires cors
 * @requires debug
 * @requires lodash
 * @param {Object} fittingDef
 * @param {Object} bagpipes
 * @returns {function} {@link api.fittings.lisk_cors}
 * @todo Add description for the function and the params
 */
module.exports = function create(fittingDef) {
	debug('config: %j', fittingDef);
	const config = modules.getConfig();

	const middleware = new CORS({
		origin: config.options.cors.origin,
		methods: config.options.cors.methods,
	});

	/**
	 * Description of the function.
	 *
	 * @func lisk_cors
	 * @memberof api.fittings
	 * @param {Object} context
	 * @param {function} cb
	 * @todo Add description for the function and the params
	 */
	return function lisk_cors(context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	};
};
