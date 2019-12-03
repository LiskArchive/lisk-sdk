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

const debug = require('debug')('swagger:lisk:compression');
const _ = require('lodash');
const compression = require('compression');

module.exports = function create(fittingDef) {
	debug('config: %j', fittingDef);

	const validCorsOptions = ['level', 'chunkSize', 'memLevel'];
	const middleware = compression(_.pick(fittingDef, validCorsOptions));

	return function liskCompression(context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	};
};
