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

/**
 * Middleware functions to add cors, log errors and conections, send status
 * and setup router.
 * @memberof module:helpers
 * @module helpers/httpApi
 */

var _ = require('lodash');
var extend = require('extend');
var apiCodes = require('./api_codes');
var checkIpInList = require('./check_ip_in_list');

/**
 * @namespace middleware
 */
var middleware = {
	/**
	 * Adds CORS header to all requests.
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	cors: function(req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header(
			'Access-Control-Allow-Headers',
			'Origin, X-Objected-With, Content-Type, Accept'
		);
		return next();
	},

	/**
	 * Logs all api errors.
	 * @param {Logger} logger
	 * @param {Error} err
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	errorLogger: function(logger, err, req, res, next) {
		if (!err) {
			return next();
		}
		logger.error(`API error ${req.url}`, err.message);
		console.trace(err);
		res
			.status(500)
			.send({ success: false, error: `API error: ${err.message}` });
	},

	/**
	 * Logs api client connections.
	 * @param {Logger} logger
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	logClientConnections: function(logger, req, res, next) {
		// Log client connections
		logger.log(`${req.method} ${req.url} from ${req.ip}`);

		return next();
	},

	/**
	 * Resends error msg when blockchain is not loaded.
	 * @param {function} isLoaded
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	blockchainReady: function(isLoaded, req, res, next) {
		if (isLoaded()) {
			return next();
		}
		res.status(500).send({ success: false, error: 'Blockchain is loading' });
	},

	/**
	 * Resends error if API endpoint doesn't exists.
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	notFound: function(req, res) {
		return res
			.status(500)
			.send({ success: false, error: 'API endpoint not found' });
	},

	/**
	 * Uses req.sanitize for particular endpoint.
	 * @param {string} property
	 * @param {Object} schema
	 * @param {function} cb
	 * @return {function} Sanitize middleware.
	 */
	sanitize: function(property, schema, cb) {
		// TODO: Remove optional error codes response handler choice as soon as all modules will be conformed to new REST API standards
		return function(req, res) {
			req.sanitize(req[property], schema, (err, report, sanitized) => {
				if (!report.isValid) {
					return res.json({ success: false, error: report.issues });
				}
				return cb(sanitized, respond.bind(null, res));
			});
		};
	},

	/**
	 * Attachs header to response.
	 * @param {string} headerKey
	 * @param {string} headerValue
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	attachResponseHeader: function(headerKey, headerValue, req, res, next) {
		res.setHeader(headerKey, headerValue);
		return next();
	},

	/**
	 * Applies rules of public / internal API described in config.json.
	 * @param {Object} config
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	applyAPIAccessRules: function(config, req, res, next) {
		if (req.url.match(/^\/peer[\/]?.*/)) {
			var internalApiAllowed =
				config.peers.enabled &&
				!checkIpInList(config.peers.access.blackList, req.ip, false);
			rejectDisallowed(internalApiAllowed, config.peers.enabled);
		} else {
			var publicApiAllowed =
				config.api.enabled &&
				(config.api.access.public ||
					checkIpInList(config.api.access.whiteList, req.ip, false));
			rejectDisallowed(publicApiAllowed, config.api.enabled);
		}

		function rejectDisallowed(apiAllowed, isEnabled) {
			return apiAllowed
				? next()
				: isEnabled
					? res.status(403).send({ success: false, error: 'API access denied' })
					: res
							.status(500)
							.send({ success: false, error: 'API access disabled' });
		}
	},

	/**
	 * Passes getter for headers and assign then to response.
	 * @param {function} getHeaders
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	attachResponseHeaders: function(getHeaders, req, res, next) {
		res.set(getHeaders());
		return next();
	},

	/**
	 * Lookup cache, and reply with cached response if it's a hit.
	 * If it's a miss, forward the request but cache the response if it's a success.
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 */
	useCache: function(logger, cache, req, res, next) {
		if (!cache.isReady()) {
			return next();
		}

		var key = req.originalUrl;
		cache.getJsonForKey(key, (err, cachedValue) => {
			// There was an error or value doesn't exist for key
			if (err || !cachedValue) {
				// Monkey patching res.json function only if we expect to cache response
				var expressSendJson = res.json;
				res.json = function(response) {
					// ToDo: Remove response.success check when API refactor is done (#225)
					if (
						response.success ||
						(response.success === undefined && res.statusCode === apiCodes.OK)
					) {
						logger.debug('Cache - Response for key:', req.url);
						cache.setJsonForKey(key, response);
					}
					expressSendJson.call(res, response);
				};
				next();
			} else {
				logger.debug('Cache - Response for url:', req.url);
				res.json(cachedValue);
			}
		});
	},
};

/**
 * Adds 'success' field to every response and attach error message if needed.
 * @param {Object} res
 * @param {string} err
 * @param {Object} response
 */
function respond(res, err, response) {
	if (err) {
		res.json({ success: false, error: err });
	} else {
		return res.json(extend({}, { success: true }, response));
	}
}

/**
 * Adds code status to responses for every failed request.
 * Default error code is 500.
 * Success code is 200.
 * Success code for empty data is 204.
 * @param {Object} res
 * @param {ApiError} err
 * @param {Object} response
 */
function respondWithCode(res, err, response) {
	if (err) {
		return res
			.status(err.code || apiCodes.INTERNAL_SERVER_ERROR)
			.json(err.toJson());
	} else {
		var isResponseEmpty = function(response) {
			var firstValue = _(response)
				.values()
				.first();
			return _.isArray(firstValue) && _.isEmpty(firstValue);
		};
		return res
			.status(
				isResponseEmpty(response) ? apiCodes.EMPTY_RESOURCES_OK : apiCodes.OK
			)
			.json(response);
	}
}

/**
 * Register router in express app using default middleware.
 * @param {string} route
 * @param {Object} app
 * @param {Object} router
 * @param {function} isLoaded
 */
function registerEndpoint(route, app, router, isLoaded) {
	router.use(middleware.notFound);
	router.use(middleware.blockchainReady.bind(null, isLoaded));
	app.use(route, router);
}

module.exports = {
	middleware: middleware,
	registerEndpoint: registerEndpoint,
	respond: respond,
	respondWithCode: respondWithCode,
};
