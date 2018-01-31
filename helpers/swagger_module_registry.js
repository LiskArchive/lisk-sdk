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

// Private fields
var __private = {};

/**
 * A module to reference the scope of the application between swagger pipeline.
 * @param {Object} scope - Application scope.
 */
function bind(scope) {
	__private = {
		config: scope.config,
		cache: scope.modules.cache,
		logger: scope.logger,
	};
}

/**
 * Get cache module.
 * @return {Object}
 */
function getCache() {
	return __private.cache;
}

/**
 * Get system logger.
 * @return {Object}
 */
function getLogger() {
	return __private.logger;
}

/**
 * Get system config.
 * @return {Object}
 */
function getConfig() {
	return __private.config;
}

module.exports = {
	bind: bind,
	getCache: getCache,
	getLogger: getLogger,
	getConfig: getConfig,
};
