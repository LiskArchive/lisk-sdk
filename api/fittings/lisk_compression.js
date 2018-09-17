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

var debug = require('debug')('swagger:lisk:compression');
var _ = require('lodash');
var compression = require('compression');

/**
 * Description of the function.
 *
 * @func create_compression
 * @memberof api.fittings
 * @requires compression
 * @requires debug
 * @requires lodash
 * @param {Object} fittingDef
 * @param {Object} bagpipes
 * @returns {function} {@link api.fittings.lisk_compression}
 * @todo Add description for the function and the params
 */
module.exports = function create(fittingDef) {
	debug('config: %j', fittingDef);

	var validCorsOptions = ['level', 'chunkSize', 'memLevel'];
	var middleware = compression(_.pick(fittingDef, validCorsOptions));

	/**
	 * Description of the function.
	 *
	 * @func lisk_compression
	 * @memberof api.fittings
	 * @param {Object} context
	 * @param {function} cb
	 * @todo Add description for the function and the params
	 */
	return function lisk_compression(context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	};
};
