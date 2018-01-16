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

var debug = require('debug')('swagger:lisk:cors');
var _ = require('lodash');
var CORS = require('cors');

module.exports = function create (fittingDef, bagpipes) {

	debug('config: %j', fittingDef);

	var validCorsOptions = ['origin', 'methods', 'allowedHeaders'];
	var middleware = CORS(_.pick(fittingDef, validCorsOptions));

	return function lisk_cors (context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	};
};
