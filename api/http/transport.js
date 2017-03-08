'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
var schema = require('../../schema/transport');

// Constructor
function TransportHttpApi (transportModule, app, logger) {

	var router = new Router();

	router.use(handshakeMiddleware);

	router.get('/blocks/common', getCommonBlocksMiddleware);
	router.get('/blocks', httpApi.middleware.sanitize('query', schema.top, transportModule.internal.blocks));

	router.get('/list', function (req, res) {
		transportModule.internal.list(httpApi.respondPositive.bind(null, res));
	});
	router.post('/blocks', function (req, res) {
		transportModule.internal.postBlock(req.body.block, req.peer, req.method + ' ' + options.req.url, httpApi.respondPositive.bind(null, res));
	});

	router.get('/height', function (req, res) {
		transportModule.internal.height(httpApi.respondPositive.bind(null, res));
	});

	router.get('/ping', function (req, res) {
		transportModule.internal.ping(httpApi.respondPositive.bind(null, res));
	});

	router.post('/signatures', function (req, res) {
		transportModule.internal.postSignatures({signatures: req.body.signatures, signature: req.body.signature}, httpApi.respondPositive.bind(null, res));
	});

	router.get('/signatures', function (req, res) {
		transportModule.internal.getSignatures(httpApi.respondPositive.bind(null, res));
	});

	router.post('/transactions', function (req, res) {
		transportModule.internal.postTransactions({
			transactions: req.body.transactions,
			transaction: req.body.transaction
		}, req.peer, req.method + ' ' + req.url, httpApi.respondPositive.bind(null, res));
	});

	router.get('/transactions', function (req, res) {
		transportModule.internal.getTransactions(httpApi.respondPositive.bind(null, res));
	});

	router.post('/dapp/message', function (req, res) {
		transportModule.internal.postDappMessage(req.body, httpApi.respondPositive.bind(null, res));
	});

	router.post('/dapp/request', function (req, res) {
		transportModule.internal.postDappRequest(req.body, httpApi.respondPositive.bind(null, res));
	});

	router.use(httpApi.middleware.notFound);

	router.use(function (req, res, next) {
		res.set(transportModule.headers());
		if (transportModule.isLoaded()) {
			return next();
		}
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});

	app.use('/peer', router);

	function handshakeMiddleware (req, res, next) {
		var validateHeaders = function (headers, cb) {
			return req.sanitize(headers, schema.headers, function (err, report, sanitized) {
				if (err) {
					return cb(err.toString());
				} else if (!report.isValid) {
					return cb(report.issues);
				}

				return cb();
			})
		};

		transportModule.internal.handshake(req.ip, req.port, req.headers, validateHeaders, function (err, result) {
			if (err) {
				return res.status(500).send(err)
			}

			if (req.body && req.body.dappid) {
				req.peer.dappid = req.body.dappid;
			}
			return next();
		});
	}

	function getCommonBlocksMiddleware (req, res, next) {
		req.sanitize(req.query, schema.commonBlock, function (err, report, query) {
			if (err) {
				logger.debug('Common block request validation failed', {err: err.toString(), req: req.query});
				return next(err);
			}
			if (!report.isValid) {
				logger.debug('Common block request validation failed', {err: report, req: req.query});
				return res.json({success: false, error: report.issues});
			}

			return transportModule.internal.blocksCommon(query.ids, req.peer, req.method + ' ' + req.url, httpApi.respondPositive.bind(null, res));
		});
	}
}

module.exports = TransportHttpApi;
