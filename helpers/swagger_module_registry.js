'use strict';

// Private Fields
var __private = {};

/**
 * A module to reference the scope of the application between swagger pipeline
 *
 * @param {Object} scope - Application Scope
 */
function bind (scope) {
	__private = {
		cache: scope.modules.cache,
		logger: scope.logger
	};
}

/**
 * Get cache module
 * @return {Object}
 */
function getCache () {
	return __private.cache;
}

/**
 * Get system logger
 * @return {Object}
 */
function getLogger () {
	return __private.logger;
}

module.exports = {
	bind: bind,
	getCache: getCache,
	getLogger: getLogger
};
