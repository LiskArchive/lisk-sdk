'use strict';

var _ = require('lodash');
var async = require('async');
var Broadcaster = require('../logic/broadcaster.js');
var Peer = require('../logic/peer.js');
var bignum = require('../helpers/bignum.js');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var extend = require('extend');
var ip = require('ip');
var popsicle = require('popsicle');
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

	__private.broadcaster = new Broadcaster(library);

	setImmediate(cb, null, self);
}

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

__private.banPeer = function (options, extraMessage) {
	if (!options.peer || !options.peer.ip || !options.peer.port) {
		library.logger.trace('Peer ban skipped', {options: options});
		return false;
	}
	library.logger.debug([options.code, ['Ban', options.peer.string, (options.clock / 60), 'minutes'].join(' '), extraMessage].join(' '));
	modules.peers.ban(options.peer.ip, options.peer.port, options.clock);
};

__private.removePeer = function (options, extraMessage) {
	library.logger.debug([options.code, 'Removing peer', options.peer.ip + ':' + options.peer.port, extraMessage].join(' '));
	return modules.peers.remove(options.peer.ip, options.peer.port);
};

__private.receiveSignatures = function (query, cb) {
	var signatures;

	async.series({
		validateSchema: function (seriesCb) {
			library.schema.validate(query, schema.signatures, function (err) {
				if (err) {
					return setImmediate(seriesCb, 'Invalid signatures body');
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		receiveSignatures: function (seriesCb) {
			signatures = query.signatures;

			async.eachSeries(signatures, function (signature, eachSeriesCb) {
				__private.receiveSignature(signature, function (err) {
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

__private.receiveSignature = function (signature, cb) {
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

__private.receiveTransactions = function (query, peer, extraLogMessage, cb) {
	var transactions;

	async.series({
		validateSchema: function (seriesCb) {
			library.schema.validate(query, schema.transactions, function (err) {
				if (err) {
					return setImmediate(seriesCb, 'Invalid transactions body');
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		receiveTransactions: function (seriesCb) {
			transactions = query.transactions;

			async.eachSeries(transactions, function (transaction, eachSeriesCb) {
				transaction.bundled = true;

				__private.receiveTransaction(transaction, peer, extraLogMessage, function (err) {
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

__private.receiveTransaction = function (transaction, peer, extraLogMessage, cb) {
	var id = (transaction ? transaction.id : 'null');

	try {
		transaction = library.logic.transaction.objectNormalize(transaction);
	} catch (e) {
		library.logger.debug('Transaction normalization failed', {id: id, err: e.toString(), module: 'transport', tx: transaction});

		// Ban peer for 10 minutes
		__private.banPeer({peer: peer, code: 'ETRANSACTION', clock: 600}, extraLogMessage);

		return setImmediate(cb, 'Invalid transaction body - ' + e.toString());
	}

	library.balancesSequence.add(function (cb) {
		library.logger.debug('Received transaction ' + transaction.id + ' from peer ' + peer.string);
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
//ToDo: To remove
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

//ToDo: To remove
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
				__private.removePeer({peer: peer, code: 'ERESPONSE ' + res.status}, req.method + ' ' + req.url);

				return setImmediate(cb, ['Received bad response code', res.status, req.method, req.url].join(' '));
			} else {
				var headers = peer.applyHeaders(res.headers);

				var report = library.schema.validate(headers, schema.headers);
				if (!report) {
					// Remove peer
					__private.removePeer({peer: peer, code: 'EHEADERS'}, req.method + ' ' + req.url);

					return setImmediate(cb, ['Invalid response headers', JSON.stringify(headers), req.method, req.url].join(' '));
				}

				if (!modules.system.networkCompatible(headers.nethash)) {
					// Remove peer
					__private.removePeer({peer: peer, code: 'ENETHASH'}, req.method + ' ' + req.url);

					return setImmediate(cb, ['Peer is not on the same network', headers.nethash, req.method, req.url].join(' '));
				}

				if (!modules.system.versionCompatible(headers.version)) {
					// Remove peer
					__private.removePeer({peer: peer, code: 'EVERSION:' + headers.version}, req.method + ' ' + req.url);

					return setImmediate(cb, ['Peer is using incompatible version', headers.version, req.method, req.url].join(' '));
				}

				modules.peers.update(peer);

				return setImmediate(cb, null, {body: res.body, peer: peer});
			}
		}).catch(function (err) {
			if (peer) {
				if (err.code === 'EUNAVAILABLE') {
				// Remove peer
					__private.removePeer({peer: peer, code: err.code}, req.method + ' ' + req.url);
				} else {
				// Ban peer for 1 minute
					__private.banPeer({peer: peer, code: err.code, clock: 60}, req.method + ' ' + req.url);
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
		__private.broadcaster.enqueue({}, {api: 'postSignatures', data: {signature: signature}});
		library.network.io.sockets.emit('signature/change', signature);
	}
};

Transport.prototype.onUnconfirmedTransaction = function (transaction, broadcast) {
	if (broadcast && !__private.broadcaster.maxRelays(transaction)) {
		__private.broadcaster.enqueue({}, {api: 'postTransactions', data: {transaction: transaction}});
		library.network.io.sockets.emit('transactions/change', transaction);
	}
};

Transport.prototype.onNewBlock = function (block, broadcast) {
	if (broadcast) {
		var broadhash = modules.system.getBroadhash();

		modules.system.update(function () {
			if (!__private.broadcaster.maxRelays(block)) {
				__private.broadcaster.broadcast({limit: constants.maxPeers, broadhash: broadhash}, {api: 'postBlock', data: {block: block}, immediate: true});
			}
			library.network.io.sockets.emit('blocks/change', block);
			//ToDo: broadcasting block to peers should take place here
		});
	}
};

Transport.prototype.onMessage = function (msg, broadcast) {
	throw new Error('Dapps messsages not supported');
};

Transport.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

Transport.prototype.isLoaded = function () {
	return modules && __private.loaded;
};

// Internal API
Transport.prototype.internal = {
	blocksCommon: function (query, cb) {
		query = query || {};
		return library.schema.validate(query, schema.commonBlock, function (err, valid) {
			if (err) {
				err = err[0].message + ': ' + err[0].path;
				library.logger.debug('Common block request validation failed', {err: err.toString(), req: query});
				return setImmediate(cb, err);
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
				library.logger.debug('Common block request validation failed', {err: 'ESCAPE', req: query.ids});

				// Ban peer for 10 minutes
				__private.banPeer({peer: query.peer, code: 'ECOMMON', clock: 600}, query.extraLogMessage);

				return setImmediate(cb, 'Invalid block id sequence');
			}

			library.db.query(sql.getCommonBlock, escapedIds).then(function (rows) {
				return setImmediate(cb, null, { success: true, common: rows[0] || null });
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Failed to get common block');
			});

		});

	},

	blocks: function (query, cb) {
		// Get 34 blocks with all data (joins) from provided block id
		// According to maxium payload of 58150 bytes per block with every transaction being a vote
		// Discounting maxium compression setting used in middleware
		// Maximum transport payload = 2000000 bytes
		query = query || {};
		modules.blocks.loadBlocksData({
			limit: 34, // 1977100 bytes
			lastId: query.lastBlockId
		}, function (err, data) {
			if (err) {
				return setImmediate(cb, null, {blocks: []});
			}

			return setImmediate(cb, null, {blocks: data});
		});
	},

	postBlock: function (query, cb) {
		query = query || {};
		try {
			var block = library.logic.block.objectNormalize(query.block);
		} catch (e) {
			library.logger.debug('Block normalization failed', {err: e.toString(), module: 'transport', block: query.block });

			// Ban peer for 10 minutes
			__private.banPeer({peer: query.peer, code: 'EBLOCK', clock: 600}, query.extraLogMessage);

			return setImmediate(cb, e.toString());
		}

		library.bus.message('receiveBlock', block);

		return setImmediate(cb, null, {success: true, blockId: block.id});
	},

	list: function (req, cb) {
		req = req || {};
		modules.peers.list(Object.assign({}, {limit: constants.maxPeers}, req.query), function (err, peers) {
			peers = (!err ? peers : []);
			peers = peers.map(function (peer) {
				delete peer.rpc;
				return peer;
			});
			return setImmediate(cb, null, {success: !err, peers: peers});
		});
	},

	height: function (req, cb) {
		return setImmediate(cb, null, {success: true, height: modules.system.getHeight()});
	},

	ping: function (req, cb) {
		return setImmediate(cb, null, {success: true});
	},

	status: function (req, cb) {
		return setImmediate(cb, null, {success: true, height: modules.system.getHeight(), broadhash: modules.system.getBroadhash()});
	},

	postSignatures: function (query, cb) {
		if (query.signatures) {
			__private.receiveSignatures(query, function (err) {
				if (err) {
					return setImmediate(cb, null, {success: false, message: err});
				} else {
					return setImmediate(cb, null, {success: true});
				}
			});
		} else {
			__private.receiveSignature(query.signature, function (err, id) {
				if (err) {
					return setImmediate(cb, null, {success: false, message: err});
				} else {
					return setImmediate(cb, null, {success: true});
				}
			});
		}
	},

	getSignatures: function (req, cb) {
		var transactions = modules.transactions.getMultisignatureTransactionList(true, constants.maxSharedTxs);
		var signatures = [];

		async.eachSeries(transactions, function (trs, __cb) {
			if (trs.signatures && trs.signatures.length) {
				signatures.push({
					transaction: trs.id,
					signatures: trs.signatures
				});
			}

			return setImmediate(__cb);
		}, function () {
			return setImmediate(cb, null, {success: true, signatures: signatures});
		});
	},

	getTransactions: function (req, cb) {
		var transactions = modules.transactions.getMergedTransactionList(true, constants.maxSharedTxs);

		return setImmediate(cb, null, {success: true, transactions: transactions});
	},

	postTransactions: function (query, cb) {
		if (query.transactions) {
			__private.receiveTransactions(query, query.peer, query.extraLogMessage, function (err) {
				if (err) {
					return setImmediate(cb, null, {success: false, message: err});
				} else {
					return setImmediate(cb, null, {success: true});
				}
			});
		} else {
			__private.receiveTransaction(query.transaction, query.peer, query.extraLogMessage, function (err, id) {
				if (err) {
					return setImmediate(cb, null, {success: false,  message: err});
				} else {
					return setImmediate(cb, null, {success: true, transactionId: id});
				}
			});
		}
	},

	onPeerUpdate: function (query) {
		library.logic.peers.update(query.peer);
	},

	/**
	 * @param {string} ip
	 * @param {number} port
	 * @param {object} headers
	 * @param {function} validateHeaders
	 * @param {function} cb
	 */
	handshake: function (ip, port, headers, validateHeaders, cb) {
		var peer = library.logic.peers.create(
			{
				ip: ip,
				port: port
			}
		);

		headers = peer.applyHeaders(headers);

		validateHeaders(headers, function (error, extraMessage) {
			if (error) {
				// Remove peer
				__private.removePeer({peer: peer, code: 'EHEADERS'}, extraMessage);

				return setImmediate(cb, {success: false, error: error});
			}

			if (!modules.system.networkCompatible(headers.nethash)) {
				// Remove peer
				__private.removePeer({peer: peer, code: 'ENETHASH'}, extraMessage);

				return setImmediate(cb, {
					success: false,
					message: 'Request is made on the wrong network',
					expected: modules.system.getNethash(),
					received: headers.nethash
				});
			}

			if (!modules.system.versionCompatible(headers.version)) {
				// Remove peer
				__private.removePeer({
					peer: peer,
					code: 'EVERSION:' + headers.version
				}, extraMessage);

				return setImmediate(cb, {
					success: false,
					message: 'Request is made from incompatible version',
					expected: modules.system.getMinVersion(),
					received: headers.version
				});
			}

			modules.peers.update(peer);

			return setImmediate(cb, null, peer);
		});
	},

	/**
	 * @param {object} query
	 * @param {Peer} query.peer
	 * @param {string} query.code
	 * @param {string} query.extraMessage
	 * @param {function} cb
	 */
	removePeer: function (query, cb) {
		return setImmediate(cb, __private.removePeer({peer: query.peer, code: query.code}, query.extraMessage) ? null : 'Failed to remove peer');
	},

	/**
	 * @param {object} query
	 * @param {Peer} query.peer
	 * @param {function} cb
	 */
	acceptPeer: function (query, cb) {
		return setImmediate(cb, modules.peers.update(query.peer) ? null : 'Failed to accept peer');
	}
};

// Export
module.exports = Transport;
