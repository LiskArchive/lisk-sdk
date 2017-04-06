'use strict';

var extend = require('extend');
var checkIpInList = require('./checkIpInList');

var middleware = {
	/**
	 * Add CORS header to all requests
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 */
	cors: function (req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Objected-With, Content-Type, Accept');
		return next();
	},

	/**
	 * Log all api errors
	 * @param {Logger} logger
	 * @param {Error} err
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 */
	errorLogger: function (logger, err, req, res, next) {
		if (!err) { return next(); }
		logger.error('API error ' + req.url, err.message);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
	},

	/**
	 * Log api client connections
	 * @param {Logger} logger
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 */
	logClientConnections: function (logger, req, res, next) {
		// Log client connections
		logger.log(req.method + ' ' + req.url + ' from ' + req.ip);

		return next();
	},

	/**
	 * Resend error msg when blockchain is not loaded
	 * @param {Function} isLoaded
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 */
	blockchainReady: function (isLoaded, req, res, next) {
		if (isLoaded()) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	},

	/**
	 * Resend error if API endpoint doesn't exists
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 */
	notFound: function (req, res, next) {
		return res.status(500).send({success: false, error: 'API endpoint not found'});
	},

	/**
	 * Use req.sanitize for particular endpoint
	 * @param {String} property
	 * @param {Object} schema
	 * @param {Function} cb
	 * @return {Function} sanitize middleware
	 */
	sanitize: function (property, schema, cb) {
		return function (req, res, next) {
			req.sanitize(req[property], schema, function (err, report, sanitized) {
				if (!report.isValid) {
					return res.json({success: false, error: report.issues});
				}
				return cb(sanitized, respond.bind(null, res));
			});
		};
	},

	/**
	 * Attach header to response
	 * @param {string} headerKey
	 * @param {string} headerValue
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 */
	attachResponseHeader: function (headerKey, headerValue, req, res, next) {
		res.setHeader(headerKey, headerValue);
		return next();
	},

	/**
	 * Apply rules of public / internal API described in config.json
	 * @param {Object} config
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 */
	applyAPIAccessRules: function (config, req, res, next) {
		if (req.url.match(/^\/peer[\/]?.*/)) {
			var internalApiAllowed = config.peers.enabled && !checkIpInList(config.peers.access.blackList, req.ip, false);
			rejectDisallowed(internalApiAllowed, config.peers.enabled);
		} else {
			var publicApiAllowed = config.api.enabled && (config.api.access.public || checkIpInList(config.api.access.whiteList, req.ip, false));
			rejectDisallowed(publicApiAllowed, config.api.enabled);
		}

		function rejectDisallowed (apiAllowed, isEnabled) {
			return apiAllowed ? next() : isEnabled ?
				res.status(403).send({success: false, error: 'API access denied'}) :
				res.status(500).send({success: false, error: 'API access disabled'});
		}
	},

	/**
	 * Pass getter for headers and assign then to response
	 * @param {Function} getHeaders
	 * @param {Object} req
	 * @param {Object} res
	 * @param {Function} next
	 */
	attachResponseHeaders: function (getHeaders, req, res, next) {
		res.set(getHeaders());
		return next();
	}
};

/**
 * Add 'success' field to every response and attach error message if needed
 * @param {Object} res
 * @param {String} err
 * @param {Object} response
 */
function respond (res, err, response) {
	if (err) {
		res.json({'success': false, 'error': err});
	} else {
		return res.json(extend({}, {'success': true}, response));
	}
}

/**
 * Register router in express app using default middleware
 * @param {String} route
 * @param {Object} app
 * @param {Object} router
 * @param {Function} isLoaded
 */
function registerEndpoint (route, app, router, isLoaded) {
	router.use(middleware.notFound);
	router.use(middleware.blockchainReady.bind(null, isLoaded));
	app.use(route, router);
}

module.exports = {
	middleware: middleware,
	registerEndpoint: registerEndpoint,
	respond: respond
};
