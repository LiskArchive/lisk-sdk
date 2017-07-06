'use strict';

var httpApi = require('./httpApi');
var extend = require('extend');

/**
 * Express.js router wrapper.
 * @memberof module:helpers
 * @function
 * @returns {Object} router express
 * @throws {Error} If config is invalid
 */
var Router = function () {
	var router = require('express').Router();

	router.use(httpApi.middleware.cors);

	router.map = function (root, config) {
		var router = this;

		Object.keys(config).forEach(function (params) {
			var route = params.split(' ');
			if (route.length !== 2 || ['post', 'get', 'put'].indexOf(route[0]) === -1) {
				throw Error('Invalid map config');
			}
			router[route[0]](route[1], function (req, res, next) {
				var reqRelevantInfo = {
					ip: req.ip,
					method: req.method,
					path: req.path
				};
				root[config[params]](extend({}, reqRelevantInfo, {'body': route[0] === 'get' ? req.query : req.body}), httpApi.respond.bind(null, res));
			});
		});
	};
	/**
	 * Adds one middleware to an array of routes.
	 * @param {Function} middleware
	 * @param {String} routes
	 */
	router.attachMiddlwareForUrls = function (middleware, routes) {
		routes.forEach(function (entry) {
			var route = entry.split(' ');

			if (route.length !== 2 || ['post', 'get', 'put'].indexOf(route[0]) === -1) {
				throw Error('Invalid map config');
			}
			router[route[0]](route[1], middleware);
		});
	};

	return router;

};

module.exports = Router;
