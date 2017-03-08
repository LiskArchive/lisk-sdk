'use strict';

var extend = require('extend');

var middleware = {

	errorLogger: function (logger, err, req, res, next) {
		if (!err) { return next(); }
		logger.error('API error ' + req.url, err.message);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
	},

	blockchainReady: function (isLoaded, req, res, next) {
		if (isLoaded()) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	},

	notFound: function (req, res, next) {
		return res.status(500).send({success: false, error: 'API endpoint was not found'});
	},

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

function respond (res, err, response) {
	if (err) {
		res.json({'success': false, 'error': err});
	} else {
		return res.json(extend({}, {'success': true}, response));
	}
}

function respondPositive (res, err, result) {
	return res.status(200).json(result || err);
}

function registerEndpoint (route, app, router, isLoaded) {
	router.use(middleware.notFound);
	router.use(middleware.blockchainReady.bind(null, isLoaded));
	app.use(route, router);
}

module.exports = {
	middleware: middleware,
	registerEndpoint: registerEndpoint,
	respond: respond,
	respondPositive: respondPositive,
};
