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

var httpApi = require('./http_api');
var extend = require('extend');

/**
 * Express.js router wrapper.
 * @memberof module:helpers
 * @function
 * @returns {Object} router express
 * @throws {Error} If config is invalid
 */
var Router = function() {
	var router = require('express').Router();

	router.use(httpApi.middleware.cors);

	router.map = function(root, config, options) {
		var router = this;
		options = options || {};

		Object.keys(config).forEach(params => {
			var route = params.split(' ');
			if (
				route.length !== 2 ||
				['post', 'get', 'put'].indexOf(route[0]) === -1
			) {
				throw Error('Invalid map config');
			}
			router[route[0]](route[1], (req, res) => {
				var reqRelevantInfo = {
					ip: req.ip,
					method: req.method,
					path: req.path,
				};
				// ToDo: Remove optional error codes response handler choice as soon as all modules will be conformed to new REST API standards
				var responseHandler = options.responseWithCode
					? httpApi.respondWithCode.bind(null, res)
					: httpApi.respond.bind(null, res);
				root[config[params]](
					extend({}, reqRelevantInfo, {
						body: route[0] === 'get' ? req.query : req.body,
					}),
					responseHandler
				);
			});
		});
	};
	/**
	 * Adds one middleware to an array of routes.
	 * @param {function} middleware
	 * @param {string} routes
	 */
	router.attachMiddlwareForUrls = function(middleware, routes) {
		routes.forEach(entry => {
			var route = entry.split(' ');

			if (
				route.length !== 2 ||
				['post', 'get', 'put'].indexOf(route[0]) === -1
			) {
				throw Error('Invalid map config');
			}
			router[route[0]](route[1], middleware);
		});
	};

	return router;
};

module.exports = Router;
