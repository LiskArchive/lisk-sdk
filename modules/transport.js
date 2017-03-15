'use strict';

var _ = require('lodash');
var async = require('async');
var Broadcaster = require('../logic/broadcaster.js');
var bignum = require('../helpers/bignum.js');
var constants = require('../helpers/constants.js');
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
	__private.broadcaster = new Broadcaster(library);

	setImmediate(cb, null, self);
}

// Private methods
__private.attachApi = function () {
	var router = new Router(library.config.peers);

	router.use(function (req, res, next) {
		res.set(__private.headers);

		if (modules && __private.loaded) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});

	router.use(function (req, res, next) {
		req.peer = library.logic.peers.create(
			{
				ip: req.ip,
				port: req.headers.port
			}
		);

		var headers = req.peer.applyHeaders(req.headers);

		req.sanitize(headers, schema.headers, function (err, report) {
			if (!report.isValid) {
				// Remove peer
				__private.removePeer({peer: req.peer, code: 'EHEADERS', req: req});

				return res.status(500).send({success: false, error: report.issues});
			}

			if (!modules.system.networkCompatible(headers.nethash)) {
				// Remove peer
				__private.removePeer({peer: req.peer, code: 'ENETHASH', req: req});

				return res.status(500).send({success: false, message: 'Request is made on the wrong network', expected: modules.system.getNethash(), received: headers.nethash});
			}

			if (!modules.system.versionCompatible(headers.version)) {
				// Remove peer
				__private.removePeer({peer: req.peer, code: 'EVERSION:' + headers.version, req: req});

				return res.status(500).send({success: false, message: 'Request is made from incompatible version', expected: modules.system.getMinVersion(), received: headers.version});
			}

			if (req.body && req.body.dappid) {
				req.peer.dappid = req.body.dappid;
			}

			modules.peers.update(req.peer);

			return next();
		});
	});

	router.get('/list', function (req, res) {
		modules.peers.list({limit: constants.maxPeers}, function (err, peers) {
			peers = (!err ? peers : []);
			return res.status(200).json({success: !err, peers: peers});
		});
	});

	router.get('/blocks/common', function (req, res, next) {
		req.sanitize(req.query, schema.commonBlock, function (err, report, query) {
			if (err) { 
				library.logger.debug('Common block request validation failed', {err: err.toString(), req: req.query});
				return next(err);
			}
			if (!report.isValid) {
				library.logger.debug('Common block request validation failed', {err: report, req: req.query});
				return res.json({success: false, error: report.issues});
			}

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
				library.logger.debug('Common block request validation failed', {err: 'ESCAPE', req: req.query});

				// Ban peer for 10 minutes
				__private.banPeer({peer: req.peer, code: 'ECOMMON', req: req, clock: 600});

				return res.json({success: false, error: 'Invalid block id sequence'});
			}

			library.db.query(sql.getCommonBlock, escapedIds).then(function (rows) {
				return res.json({ success: true, common: rows[0] || null });
			}).catch(function (err) {
				library.logger.error(err.stack);
				return res.json({success: false, error: 'Failed to get common block'});
			});
		});
	});

	router.get('/blocks', function (req, res, next) {
		req.sanitize(req.query, schema.blocks, function (err, report, query) {
			if (err) { return next(err); }
			if (!report.isValid) { return res.json({success: false, error: report.issues}); }

			// Get 34 blocks with all data (joins) from provided block id
			// According to maxium payload of 58150 bytes per block with every transaction being a vote
			// Discounting maxium compression setting used in middleware
			// Maximum transport payload = 2000000 bytes
			modules.blocks.loadBlocksData({
				limit: 34, // 1977100 bytes
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
		var block = req.body.block;
		var id = (block ? block.id : 'null');

		try {
			block = library.logic.block.objectNormalize(block);
		} catch (e) {
			library.logger.debug('Block normalization failed', {err: e.toString(), module: 'transport', block: block });

			// Ban peer for 10 minutes
			__private.banPeer({peer: req.peer, code: 'EBLOCK', req: req, clock: 600});

			return res.status(200).json({success: false, error: e.toString()});
		}

		library.bus.message('receiveBlock', block);

		return res.status(200).json({success: true, blockId: block.id});
	});

	router.post('/signatures', function (req, res) {
		if (req.body.signatures) {
			__private.receiveSignatures(req, function (err) {
				if (err) {
					return res.status(200).json({success: false, message: err});
				} else {
					return res.status(200).json({success: true});
				}
			});
		} else {
			__private.receiveSignature(req.body.signature, req, function (err, id) {
				if (err) {
					return res.status(200).json({success: false, message: err});
				} else {
					return res.status(200).json({success: true});
				}
			});
		}
	});

	router.get('/signatures', function (req, res) {
		var transactions = modules.transactions.getMultisignatureTransactionList(true, constants.maxSharedTxs);
		var signatures = [];

		async.eachSeries(transactions, function (trs, cb) {
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
		var transactions = modules.transactions.getMergedTransactionList(true, constants.maxSharedTxs);

		res.status(200).json({success: true, transactions: transactions});
	});

	router.post('/transactions', function (req, res) {
		if (req.body.transactions) {
			__private.receiveTransactions(req, function (err) {
				if (err) {
					return res.status(200).json({success: false, message: err});
				} else {
					return res.status(200).json({success: true});
				}
			});
		} else {
			__private.receiveTransaction(req.body.transaction, req, function (err, id) {
				if (err) {
					return res.status(200).json({success: false, message: err});
				} else {
					return res.status(200).json({success: true, transactionId: id});
				}
			});
		}
	});

	router.get('/height', function (req, res) {
		res.status(200).json({
			success: true,
			height: modules.blocks.getLastBlock().height
		});
	});

	router.get('/ping', function (req, res) {
		res.status(200).json({
			success: true
		});
	});

	router.post('/dapp/message', function (req, res) {
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
		library.logger.error('API error ' + req.url, err.message);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
	});
};

// Private methods
__private.hashsum = function (obj) {
	var buf = new Buffer(JSON.stringify(obj), 'utf8');
	var hashdig = crypto.createHash('sha256').update(buf).digest();
	var temp = new Buffer(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = hashdig[7 - i];
	}

	return bignum.fromBuffer(temp).toString();
};

__private.banPeer = function (options) {
	if (!options.peer || !options.peer.ip || !options.peer.port) {
		library.logger.trace('Peer ban skipped', {options: options});
		return false;
	}
	library.logger.debug([options.code, ['Ban', options.peer.string, (options.clock / 60), 'minutes'].join(' '), options.req.method, options.req.url].join(' '));
	modules.peers.ban(options.peer.ip, options.peer.port, options.clock);
};

__private.removePeer = function (options) {
	library.logger.debug([options.code, 'Removing peer', options.peer.string, options.req.method, options.req.url].join(' '));
	modules.peers.remove(options.peer.ip, options.peer.port);
};

__private.receiveSignatures = function (req, cb) {
	var signatures;

	async.series({
		validateSchema: function (seriesCb) {
			library.schema.validate(req.body, schema.signatures, function (err) {
				if (err) {
					return setImmediate(seriesCb, 'Invalid signatures body');
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		receiveSignatures: function (seriesCb) {
			signatures = req.body.signatures;

			async.eachSeries(signatures, function (signature, eachSeriesCb) {
				__private.receiveSignature(signature, req, function (err) {
					if (err) {
						library.logger.debug(err, signature);
					}

					return setImmediate(eachSeriesCb);
				});
			}, seriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err);
	});
};

__private.receiveSignature = function (signature, req, cb) {
	library.schema.validate({signature: signature}, schema.signature, function (err) {
		if (err) {
			return setImmediate(cb, 'Invalid signature body');
		}

		modules.multisignatures.processSignature(signature, function (err) {
			if (err) {
				return setImmediate(cb, 'Error processing signature: ' + err);
			} else {
				return setImmediate(cb);
			}
		});
	});
};

__private.receiveTransactions = function (req, cb) {
	var transactions;

	async.series({
		validateSchema: function (seriesCb) {
			library.schema.validate(req.body, schema.transactions, function (err) {
				if (err) {
					return setImmediate(seriesCb, 'Invalid transactions body');
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		receiveTransactions: function (seriesCb) {
			transactions = req.body.transactions;

			async.eachSeries(transactions, function (transaction, eachSeriesCb) {
				transaction.bundled = true;

				__private.receiveTransaction(transaction, req, function (err) {
					if (err) {
						library.logger.debug(err, transaction);
					}

					return setImmediate(eachSeriesCb);
				});
			}, seriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err);
	});
};

__private.receiveTransaction = function (transaction, req, cb) {
	var id = (transaction ? transaction.id : 'null');

	try {
		transaction = library.logic.transaction.objectNormalize(transaction);
	} catch (e) {
		library.logger.debug('Transaction normalization failed', {id: id, err: e.toString(), module: 'transport', tx: transaction});

		// Ban peer for 10 minutes
		__private.banPeer({peer: req.peer, code: 'ETRANSACTION', req: req, clock: 600});

		return setImmediate(cb, 'Invalid transaction body');
	}

	library.balancesSequence.add(function (cb) {
		library.logger.debug('Received transaction ' + transaction.id + ' from peer ' + req.peer.string);
		modules.transactions.processUnconfirmedTransaction(transaction, true, function (err) {
			if (err) {
				library.logger.debug(['Transaction', id].join(' '), err.toString());
				if (transaction) { library.logger.debug('Transaction', transaction); }

				return setImmediate(cb, err.toString());
			} else {
				return setImmediate(cb, null, transaction.id);
			}
		});
	}, cb);
};

// Public methods
Transport.prototype.headers = function (headers) {
	if (headers) {
		__private.headers = headers;
	}

	return __private.headers;
};

Transport.prototype.consensus = function () {
	return __private.broadcaster.consensus;
};

Transport.prototype.poorConsensus = function () {
	if (__private.broadcaster.consensus === undefined) {
		return false;
	} else {
		return (__private.broadcaster.consensus < constants.minBroadhashConsensus);
	}
};

Transport.prototype.getPeers = function (params, cb) {
	return __private.broadcaster.getPeers(params, cb);
};

Transport.prototype.getFromRandomPeer = function (config, options, cb) {
	if (typeof options === 'function') {
		cb = options;
		options = config;
		config = {};
	}
	config.limit = 1;
	modules.peers.list(config, function (err, peers) {
		if (!err && peers.length) {
			return self.getFromPeer(peers[0], options, cb);
		} else {
			return setImmediate(cb, err || 'No acceptable peers found');
		}
	});
};

Transport.prototype.getFromPeer = function (peer, options, cb) {
	var url;

	if (options.api) {
		url = '/peer' + options.api;
	} else {
		url = options.url;
	}

	peer = library.logic.peers.create(peer);

	var req = {
		url: 'http://' + peer.ip + ':' + peer.port + url,
		method: options.method,
		headers: __private.headers,
		timeout: library.config.peers.options.timeout
	};

	if (options.data) {
		req.body = options.data;
	}

	popsicle.request(req)
		.use(popsicle.plugins.parse(['json'], false))
		.then(function (res) {
			if (res.status !== 200) {
				// Remove peer
				__private.removePeer({peer: peer, code: 'ERESPONSE ' + res.status, req: req});

				return setImmediate(cb, ['Received bad response code', res.status, req.method, req.url].join(' '));
			} else {
				var headers = peer.applyHeaders(res.headers);

				var report = library.schema.validate(headers, schema.headers);
				if (!report) {
					// Remove peer
					__private.removePeer({peer: peer, code: 'EHEADERS', req: req});

					return setImmediate(cb, ['Invalid response headers', JSON.stringify(headers), req.method, req.url].join(' '));
				}

				if (!modules.system.networkCompatible(headers.nethash)) {
					// Remove peer
					__private.removePeer({peer: peer, code: 'ENETHASH', req: req});

					return setImmediate(cb, ['Peer is not on the same network', headers.nethash, req.method, req.url].join(' '));
				}

				if (!modules.system.versionCompatible(headers.version)) {
					// Remove peer
					__private.removePeer({peer: peer, code: 'EVERSION:' + headers.version, req: req});

					return setImmediate(cb, ['Peer is using incompatible version', headers.version, req.method, req.url].join(' '));
				}

				modules.peers.update(peer);

				return setImmediate(cb, null, {body: res.body, peer: peer});
			}
		}).catch(function (err) {
			if (peer) {
				if (err.code === 'EUNAVAILABLE') {
				// Remove peer
					__private.removePeer({peer: peer, code: err.code, req: req});
				} else {
				// Ban peer for 1 minute
					__private.banPeer({peer: peer, code: err.code, req: req, clock: 60});
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

	__private.headers = modules.system.headers();
	__private.broadcaster.bind(modules);
};

Transport.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

Transport.prototype.onSignature = function (signature, broadcast) {
	if (broadcast && !__private.broadcaster.maxRelays(signature)) {
		__private.broadcaster.enqueue({}, {api: '/signatures', data: {signature: signature}, method: 'POST'});
		library.network.io.sockets.emit('signature/change', signature);
	}
};

Transport.prototype.onUnconfirmedTransaction = function (transaction, broadcast) {
	if (broadcast && !__private.broadcaster.maxRelays(transaction)) {
		__private.broadcaster.enqueue({}, {api: '/transactions', data: {transaction: transaction}, method: 'POST'});
		library.network.io.sockets.emit('transactions/change', transaction);
	}
};

Transport.prototype.onNewBlock = function (block, broadcast) {
	if (broadcast) {
		var broadhash = modules.system.getBroadhash();

		modules.system.update(function () {
			if (!__private.broadcaster.maxRelays(block)) {
				__private.broadcaster.broadcast({limit: constants.maxPeers, broadhash: broadhash}, {api: '/blocks', data: {block: block}, method: 'POST', immediate: true});
			}
			library.network.io.sockets.emit('blocks/change', block);
		});
	}
};

Transport.prototype.onMessage = function (msg, broadcast) {
	if (broadcast && !__private.broadcaster.maxRelays(msg)) {
		__private.broadcaster.broadcast({limit: constants.maxPeers, dappid: msg.dappid}, {api: '/dapp/message', data: msg, method: 'POST', immediate: true});
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

	__private.broadcaster.enqueue({dappid: msg.dappid}, {api: '/dapp/message', data: msg, method: 'POST'});

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
		self.getFromRandomPeer({dappid: msg.dappid}, {api: '/dapp/request', data: msg, method: 'POST'}, cb);
	}
};

// Export
module.exports = Transport;
