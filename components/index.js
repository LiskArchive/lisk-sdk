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

const Cache = require('./cache');

module.exports = function createCacheComponent(options, logger) {
	// delete password key if it's value is null
	const cacheConfigParam = Object.assign({}, options);
	if (cacheConfigParam.password === null) {
		delete cacheConfigParam.password;
	}
	return new Cache(cacheConfigParam, logger);
};
