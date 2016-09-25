'use strict';

var _ = require('lodash');
var async = require('async');
var bignum = require('../helpers/bignum.js');
var crypto = require('crypto');
var extend = require('extend');
var ip = require('ip');
var popsicle = require('popsicle');
var Router = require('../helpers/router.js');
var schema = require('../schema/transport.js');
var sandboxHelper = require('../helpers/sandbox.js');
var sql = require('../sql/transport.js');
var zlib = require('zlib');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.headers = {};
__private.loaded = false;
__private.messages = {};

// Constructor
function Transport (cb, scope) {
	library = scope;
	self = this;

	__private.attachApi();

	setImmediate(cb, null, self);
}

// Private methods
__private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules && __private.loaded) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});

	router.use(function (req, res, next) {
		try {
			req.peer = modules.peers.accept(
				{
					ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
					port: req.headers.port
				}
			);
		} catch (e) {
			library.logger.debug(e.toString());
			return res.status(406).send({success: false, error: 'Invalid request headers'});
		}

		res.headers.port = parseInt(res.headers.port);

		req.sanitize(req.headers, schema.headers, function (err, report, headers) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.status(500).send({status: false, error: report.issues}); }

			if (headers.nethash !== library.config.nethash) {
				return res.status(200).send({success: false, message: 'Request is made on the wrong network', expected: library.config.nethash, received: headers.nethash});
			}

			req.peer.state = 2;
			req.peer.os = headers.os;
			req.peer.version = headers.version;

			if (req.body && req.body.dappid) {
				req.peer.dappid = req.body.dappid;
			}

			if ((req.peer.version === library.config.version) && (headers.nethash === library.config.nethash)) {
				if (!modules.blocks.lastReceipt()) {
					modules.delegates.enableForging();
				}

				if (!req.peer.loopback) {
					modules.peers.update(req.peer);
				}
			}

			return next();
		});

	});

	router.get('/list', function (req, res) {
		res.set(__private.headers);
		modules.peers.list({limit: 100}, function (err, peers) {
			return res.status(200).json({peers: !err ? peers : []});
		});
	});

	router.get('/blocks/common', function (req, res, next) {
		res.set(__private.headers);

		req.sanitize(req.query, schema.commonBlock, function (err, report, query) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			var escapedIds = query.ids
				// Remove quotes
				.replace(/['"]+/g, '')
				// Separate by comma into an array
				.split(',')
				// Reject any non-numeric values
				.filter(function (id) {
					return /^[0-9]+$/.test(id);
				});

			if (!escapedIds.length) {
				library.logger.warn('Invalid common block request, ban 60 min', req.peer.string);

				return res.json({success: false, error: 'Invalid block id sequence'});
			}

			library.db.query(sql.getCommonBlock, escapedIds).then(function (rows) {
				var commonBlock = rows.length ? rows[0] : null;
				return res.json({ success: true, common: commonBlock });
			}).catch(function (err) {
				library.logger.error(err.stack);
				return res.json({success: false, error: 'Failed to get common block'});
			});
		});
	});

	router.get('/blocks', function (req, res, next) {
		res.set(__private.headers);

		req.sanitize(req.query, schema.blocks, function (err, report, query) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			// Get 1400+ blocks with all data (joins) from provided block id
			modules.blocks.loadBlocksData({
				limit: 1440,
				lastId: query.lastBlockId
			}, function (err, data) {
				res.status(200);

				if (err) {
					return res.json({blocks: []});
				}

				res.json({blocks: data});
			});
		});
	});

	router.post('/blocks', function (req, res) {
		res.set(__private.headers);

		var block;

		try {
			block = library.logic.block.objectNormalize(req.body.block);
		} catch (e) {
			library.logger.warn('Block ' + (block ? block.id : 'null') + ' is not valid, ban 60 min', req.peer.string);
			library.logger.warn(e.toString());

			if (req.peer) {
				modules.peers.state(req.peer.ip, req.peer.port, 0, 3600);
			}

			return res.sendStatus(200);
		}

		library.bus.message('receiveBlock', block);

		res.sendStatus(200);
	});

	router.post('/signatures', function (req, res) {
		res.set(__private.headers);

		library.scheme.validate(req.body, schema.signatures, function (err) {
			if (err) {
				return res.status(200).json({success: false, error: 'Signature validation failed'});
			}

			modules.multisignatures.processSignature(req.body.signature, function (err) {
				if (err) {
					return res.status(200).json({success: false, error: 'Error processing signature'});
				} else {
					return res.status(200).json({success: true});
				}
			});
		});
	});

	router.get('/signatures', function (req, res) {
		res.set(__private.headers);

		var unconfirmedList = modules.transactions.getUnconfirmedTransactionList();
		var signatures = [];

		async.eachSeries(unconfirmedList, function (trs, cb) {
			if (trs.signatures && trs.signatures.length) {
				signatures.push({
					transaction: trs.id,
					signatures: trs.signatures
				});
			}

			return setImmediate(cb);
		}, function () {
			return res.status(200).json({success: true, signatures: signatures});
		});
	});

	router.get('/transactions', function (req, res) {
		res.set(__private.headers);
		res.status(200).json({transactions: modules.transactions.getUnconfirmedTransactionList()});
	});

	router.post('/transactions', function (req, res) {
		res.set(__private.headers);

		var transaction;

		try {
			transaction = library.logic.transaction.objectNormalize(req.body.transaction);
		} catch (e) {
			library.logger.warn('Received transaction ' + (transaction ? transaction.id : 'null') + ' is not valid, ban 60 min', req.peer.string);
			library.logger.warn(e.toString());

			if (req.peer) {
				modules.peers.state(req.peer.ip, req.peer.port, 0, 3600);
			}

			return res.status(200).json({success: false, message: 'Invalid transaction body'});
		}

		library.balancesSequence.add(function (cb) {
			library.logger.debug('Received transaction ' + transaction.id + ' from peer ' + req.peer.string);
			modules.transactions.receiveTransactions([transaction], cb);
		}, function (err) {
			if (err) {
				library.logger.error(err);
				res.status(200).json({success: false, message: err.toString()});
			} else {
				res.status(200).json({success: true});
			}
		});
	});

	router.get('/height', function (req, res) {
		res.set(__private.headers);
		res.status(200).json({
			height: modules.blocks.getLastBlock().height
		});
	});

	router.post('/dapp/message', function (req, res) {
		res.set(__private.headers);

		try {
			if (!req.body.dappid) {
				return res.status(200).json({success: false, message: 'Missing dappid'});
			}
			if (!req.body.timestamp || !req.body.hash) {
				return res.status(200).json({
					success: false,
					message: 'Missing hash sum'
				});
			}
			var newHash = __private.hashsum(req.body.body, req.body.timestamp);
			if (newHash !== req.body.hash) {
				return res.status(200).json({success: false, message: 'Invalid hash sum'});
			}
		} catch (e) {
			library.logger.error(e.stack);
			return res.status(200).json({success: false, message: e.toString()});
		}

		if (__private.messages[req.body.hash]) {
			return res.status(200);
		}

		__private.messages[req.body.hash] = true;

		modules.dapps.message(req.body.dappid, req.body.body, function (err, body) {
			if (!err && body.error) {
				err = body.error;
			}

			if (err) {
				return res.status(200).json({success: false, message: err.toString()});
			}

			library.bus.message('message', req.body, true);
			res.status(200).json(extend({}, body, {success: true}));
		});
	});

	router.post('/dapp/request', function (req, res) {
		res.set(__private.headers);

		try {
			if (!req.body.dappid) {
				return res.status(200).json({success: false, message: 'Missing dappid'});
			}
			if (!req.body.timestamp || !req.body.hash) {
				return res.status(200).json({
					success: false,
					message: 'Missing hash sum'
				});
			}
			var newHash = __private.hashsum(req.body.body, req.body.timestamp);
			if (newHash !== req.body.hash) {
				return res.status(200).json({success: false, message: 'Invalid hash sum'});
			}
		} catch (e) {
			library.logger.error(e.stack);
			return res.status(200).json({success: false, message: e.toString()});
		}

		modules.dapps.request(req.body.dappid, req.body.body.method, req.body.body.path, req.body.body.query, function (err, body) {
			if (!err && body.error) {
				err = body.error;
			}

			if (err) {
				return res.status(200).json({success: false, message: err});
			}

			res.status(200).json(extend({}, body, {success: true}));
		});
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: 'API endpoint not found'});
	});

	library.network.app.use('/peer', router);

	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
};

__private.hashsum = function (obj) {
	var buf = new Buffer(JSON.stringify(obj), 'utf8');
	var hashdig = crypto.createHash('sha256').update(buf).digest();
	var temp = new Buffer(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = hashdig[7 - i];
	}

	return bignum.fromBuffer(temp).toString();
};

// Public methods
Transport.prototype.broadcast = function (config, options, cb) {
	config.limit = config.limit || 1;
	modules.peers.list(config, function (err, peers) {
		if (!err) {
			async.eachLimit(peers, 3, function (peer, cb) {
				return self.getFromPeer(peer, options, cb);
			}, function (err) {
				if (cb) {
					return setImmediate(cb, null, {body: null, peer: peers});
				}
			});
		} else if (cb) {
			return setImmediate(cb, err);
		}
	});
};

Transport.prototype.getFromRandomPeer = function (config, options, cb) {
	if (typeof options === 'function') {
		cb = options;
		options = config;
		config = {};
	}
	config.limit = 1;
	async.retry(20, function (cb) {
		modules.peers.list(config, function (err, peers) {
			if (!err && peers.length) {
				self.getFromPeer(peers[0], options, cb);
			} else {
				return setImmediate(cb, err || 'No peers in db');
			}
		});
	}, function (err, results) {
		return setImmediate(cb, err, results);
	});
};

Transport.prototype.getFromPeer = function (peer, options, cb) {
	var url;

	if (options.api) {
		url = '/peer' + options.api;
	} else {
		url = options.url;
	}

	peer = modules.peers.accept(peer);

	var req = {
		url: 'http://' + peer.ip + ':' + peer.port + url,
		method: options.method,
		headers: _.extend({}, __private.headers, options.headers),
		timeout: library.config.peers.options.timeout
	};

	if (options.data) {
		req.body = options.data;
	}

	var request = popsicle.request(req);

	request.use(popsicle.plugins.parse(['json']));

	request.then(function (res) {
		if (res.status !== 200) {
			return setImmediate(cb, ['Received bad response code', res.status, req.method, req.url].join(' '));
		} else {
			var headers = res.headers;
			headers.port = parseInt(headers.port);

			var report = library.scheme.validate(headers, schema.headers);
			if (!report) {
				return setImmediate(cb, ['Invalid response headers', JSON.stringify(headers), req.method, req.url].join(' '));
			}

			if (headers.nethash !== library.config.nethash) {
				return setImmediate(cb, ['Peer is not on the same network', headers.nethash, req.method, req.url].join(' '));
			}

			if (!peer.loopback && (headers.version === library.config.version)) {
				modules.peers.update({
					ip: peer.ip,
					port: headers.port,
					state: 2,
					os: headers.os,
					version: headers.version
				});
			}

			return setImmediate(cb, null, {body: res.body, peer: peer});
		}
	});

	request.catch(function (err) {
		if (peer) {
			if (err.code === 'EUNAVAILABLE') {
				modules.peers.remove(peer.ip, peer.port, function (err2) {
					if (!err2) {
						library.logger.warn([err.code, 'Removing peer', req.method, req.url].join(' '));
					}
				});
			} else {
				if (options.ban) {
					modules.peers.state(peer.ip, peer.port, 0, 600, function (err2) {
						if (!err2) {
							library.logger.warn([err.code, 'Ban 10 min', req.method, req.url].join(' '));
						}
					});
				}
			}
		}

		return setImmediate(cb, [err.code, 'Request failed', req.method, req.url].join(' '));
	});
};

Transport.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Transport.prototype.onBind = function (scope) {
	modules = scope;

	__private.headers = {
		os: modules.system.getOS(),
		version: modules.system.getVersion(),
		port: modules.system.getPort(),
		nethash: modules.system.getNethash()
	};
};

Transport.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

Transport.prototype.onSignature = function (signature, broadcast) {
	if (broadcast) {
		self.broadcast({limit: 100}, {api: '/signatures', data: {signature: signature}, method: 'POST'});
		library.network.io.sockets.emit('signature/change', {});
	}
};

Transport.prototype.onUnconfirmedTransaction = function (transaction, broadcast) {
	if (broadcast) {
		self.broadcast({limit: 100}, {api: '/transactions', data: {transaction: transaction}, method: 'POST'});
		library.network.io.sockets.emit('transactions/change', {});
	}
};

Transport.prototype.onNewBlock = function (block, broadcast) {
	if (broadcast) {
		self.broadcast({limit: 100}, {api: '/blocks', data: {block: block}, method: 'POST'});
		library.network.io.sockets.emit('blocks/change', {});
	}
};

Transport.prototype.onMessage = function (msg, broadcast) {
	if (broadcast) {
		self.broadcast({limit: 100, dappid: msg.dappid}, {api: '/dapp/message', data: msg, method: 'POST'});
	}
};

Transport.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Shared
shared.message = function (msg, cb) {
	msg.timestamp = (new Date()).getTime();
	msg.hash = __private.hashsum(msg.body, msg.timestamp);

	self.broadcast({limit: 100, dappid: msg.dappid}, {api: '/dapp/message', data: msg, method: 'POST'});

	return setImmediate(cb, null, {});
};

shared.request = function (msg, cb) {
	msg.timestamp = (new Date()).getTime();
	msg.hash = __private.hashsum(msg.body, msg.timestamp);

	if (msg.body.peer) {
		self.getFromPeer({ip: msg.body.peer.ip, port: msg.body.peer.port}, {
			api: '/dapp/request',
			data: msg,
			method: 'POST'
		}, cb);
	} else {
		self.getFromRandomPeer({dappid: msg.dappid}, {api: '/dapp/request', data: msg, method: 'POST', ban: true}, cb);
	}
};

// Export
module.exports = Transport;
