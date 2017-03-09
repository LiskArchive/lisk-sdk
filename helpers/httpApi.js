'use strict';

var extend = require('extend');

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
		return res.status(500).send({success: false, error: 'API endpoint was not found'});
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
				if (err) {
					return next(err);
				}
				if (!report.isValid) {
					return res.json({success: false, error: report.issues});
				}
				return cb(sanitized, respond.bind(null, res));
			});
		};
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
