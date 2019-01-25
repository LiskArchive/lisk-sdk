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

const createCache = require('../../components');
const Logger = require('../../logger');

const componentsLoader = new function() {
	this.logger = new Logger({
		echo: null,
		errorLevel: __testContext.config.fileLogLevel,
		filename: __testContext.config.logFileName,
	});

	/**
	 * Initializes Cache module
	 * @param {function} cb
	 */
	this.initCache = function(cb) {
		const cache = createCache(__testContext.config.redis, this.logger);
		return cache.boostrap().then(err => {
			if (err) {
				return cb(err);
			}
			return cb(null, {
				cache,
			});
		});
	};
}();

module.exports = componentsLoader;
