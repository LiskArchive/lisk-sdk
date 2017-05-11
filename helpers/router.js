'use strict';

var httpApi = require('./httpApi');
var extend = require('extend');

/**
 * Express.js router wrapper
 * @return {Router}
 * @constructor
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
			if ( 'string' == typeof config[params] || config[params] instanceof String ) {
				router[route[0]](route[1], function (req, res, next) {
					var reqRelevantInfo = {
						ip: req.ip,
						method: req.method,
						path: req.path
					};
					root[config[params]](extend({}, reqRelevantInfo, {'body': route[0] === 'get' ? req.query : req.body}), httpApi.respond.bind(null, res));
				});
			} else if (Array.isArray(config[params])) {
				// For handling the cases where we have a bunch of middleware (as functions) which we want to call 
				// alongwith the handler specified with root.
				var middlewaresAndHandler = config[params].map(function (entity) {
					if ( 'string' == typeof entity || entity instanceof String ) {
						return  function (req, res, next) {
							var reqRelevantInfo = {
								ip: req.ip,
								method: req.method,
								path: req.path
							};
							root[entity](extend({}, reqRelevantInfo, {'body': route[0] === 'get' ? req.query : req.body}), httpApi.respond.bind(null, res));
						};
					} else if ('function' === typeof entity) {
						return entity;
					} else {
						throw Error('Invalid map config');
					};
				});
				// Attach middlewares and handler (middlewareAndHandelr) to req method (route[0]) and url (route[1])
				router[route[0]].apply(router, [route[1]].concat(middlewaresAndHandler));
			} else {
				throw Error('Invalid map config');
			}
		});
	};

	return router;
};

module.exports = Router;
