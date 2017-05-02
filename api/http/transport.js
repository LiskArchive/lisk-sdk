'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
var schema = require('../../schema/transport');

// Constructor
function TransportHttpApi (transportModule, app, logger) {

	var router = new Router();

	router.use(httpApi.middleware.attachResponseHeaders.bind(null, transportModule.headers));
	router.use(httpApi.middleware.blockchainReady.bind(null, transportModule.isLoaded));

	router.use(handshakeMiddleware);

	router.get('/blocks/common', getCommonBlocksMiddleware);
	router.get('/blocks', httpApi.middleware.sanitize('query', schema.blocks, transportModule.internal.blocks));

	router.map(transportModule.internal, {
		'get /list': 'list',
		'get /height': 'height',
		'get /ping': 'ping',
		'get /signatures': 'getSignatures',
		'get /transactions': 'getTransactions',
		'post /dapp/message': 'postDappMessage',
		'post /dapp/request': 'postDappRequest'

	});

	// Custom parameters internal functions
	router.post('/blocks', function (req, res) {
		transportModule.internal.postBlock(req.body.block, req.peer, req.method + ' ' + req.url, httpApi.respond.bind(null, res));
	});

	router.post('/signatures', function (req, res) {
		transportModule.internal.postSignatures({signatures: req.body.signatures, signature: req.body.signature}, httpApi.respond.bind(null, res));
	});

	router.post('/transactions', function (req, res) {
		transportModule.internal.postTransactions({
			transactions: req.body.transactions,
			transaction: req.body.transaction
		}, req.peer, req.method + ' ' + req.url, httpApi.respond.bind(null, res));
	});

	router.use(httpApi.middleware.notFound);

	app.use('/peer', router);

	function handshakeMiddleware (req, res, next) {
		transportModule.internal.handshake(req.ip, req.headers.port, req.headers, validateHeaders, function (err, peer) {
			if (err) {
				return res.status(500).send(err);
			}

			req.peer = peer;

			if (req.body && req.body.dappid) {
				req.peer.dappid = req.body.dappid;
			}
			return next();
		});

		function validateHeaders (headers, cb) {
			return req.sanitize(headers, schema.headers, function (err, report, sanitized) {
				if (err) {
					return cb(err.toString());
				} else if (!report.isValid) {
					return cb(report.issues);
				}

				return cb();
			});
		}
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

			return transportModule.internal.blocksCommon(query.ids, req.peer, req.method + ' ' + req.url, httpApi.respond.bind(null, res));
		});
	}
}

module.exports = TransportHttpApi;
