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
var schema = require('../schema/transport.js');
var sql = require('../sql/transport.js');
var zlib = require('zlib');
var Peer = require('../logic/peer');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.headers = {};
__private.loaded = false;
__private.messages = {};

/**
 * Initializes library with scope content and generates a Broadcaster instance.
 * @memberof module:transport
 * @class
 * @classdesc Main Transport methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Transport (cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		bus: scope.bus,
		schema: scope.schema,
		network: scope.network,
		balancesSequence: scope.balancesSequence,
		logic: {
			block: scope.logic.block,
			transaction: scope.logic.transaction,
			peers: scope.logic.peers,
		},
		config: {
			peers: {
				options: {
					timeout: scope.config.peers.options.timeout,
				},
			},
		},
	};
	self = this;

	__private.broadcaster = new Broadcaster(
		scope.config.broadcasts,
		scope.config.forging.force,
		scope.logic.peers,
		scope.logic.transaction,
		scope.logger
	);

	setImmediate(cb, null, self);
}

// Private methods
/**
 * Creates a sha256 hash based on input object.
 * @private
 * @implements {crypto.createHash}
 * @implements {bignum.fromBuffer}
 * @param {Object} obj
 * @return {string} Buffer array to string
 */
__private.hashsum = function (obj) {
	var buf = Buffer.from(JSON.stringify(obj), 'utf8');
	var hashdig = crypto.createHash('sha256').update(buf).digest();
	var temp = Buffer.alloc(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = hashdig[7 - i];
	}

	return bignum.fromBuffer(temp).toString();
};

/**
 * Removes a peer based on ip and port.
 * @private
 * @implements {modules.peers.remove}
 * @param {Object} options - Contains code and peer
 * @param {string} extraMessage
 */
__private.removePeer = function (options, extraMessage) {
	if (!options.peer) {
		library.logger.debug('Cannot remove empty peer');
		return false;
	}

	library.logger.debug([options.code, 'Removing peer', options.peer.ip + ':' + options.peer.port, extraMessage].join(' '));
	return modules.peers.remove(options.peer);
};

/**
 * Validates signatures body and for each signature calls receiveSignature.
 * @private
 * @implements {library.schema.validate}
 * @implements {__private.receiveSignature}
 * @param {Object} query
 * @param {function} cb
 * @return {setImmediateCallback} cb, err
 */
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

/**
 * Validates signature with schema and calls processSignature.
 * @private
 * @implements {library.schema.validate}
 * @implements {modules.multisignatures.processSignature}
 * @param {signature} signature
 * @return {setImmediateCallback} cb | error messages
 */
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

/**
 * Validates transactions with schema and calls receiveTransaction for each
 * transaction.
 * @private
 * @implements {library.schema.validate}
 * @implements {__private.receiveTransaction}
 * @param {Object} query - Contains transactions
 * @param {peer} peer
 * @param {string} extraLogMessage
 * @param {function} cb
 * @return {setImmediateCallback} cb, err
 */
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

/**
 * Normalizes transaction and remove peer if it fails.
 * Calls balancesSequence.add to receive transaction and
 * processUnconfirmedTransaction to confirm it.
 * @private
 * @implements {library.logic.transaction.objectNormalize}
 * @implements {__private.removePeer}
 * @implements {library.balancesSequence.add}
 * @implements {modules.transactions.processUnconfirmedTransaction}
 * @param {transaction} transaction
 * @param {peer} peer
 * @param {string} extraLogMessage
 * @param {function} cb
 * @return {setImmediateCallback} cb, error message
 */
__private.receiveTransaction = function (transaction, peer, extraLogMessage, cb) {
	var id = (transaction ? transaction.id : 'null');

	try {
		transaction = library.logic.transaction.objectNormalize(transaction);
	} catch (e) {
		library.logger.debug('Transaction normalization failed', {id: id, err: e.toString(), module: 'transport', tx: transaction});

		__private.removePeer({peer: peer, code: 'ETRANSACTION'}, extraLogMessage);

		return setImmediate(cb, 'Invalid transaction body - ' + e.toString());
	}

	library.balancesSequence.add(function (cb) {
		library.logger.debug('Received transaction ' + transaction.id + ' from peer ' + peer.ip + ':' + peer.port);
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
/**
 * Sets or gets headers
 * @param {Object} [headers]
 * @return {Object} private variable with headers
 */
Transport.prototype.headers = function (headers) {
	if (headers) {
		__private.headers = headers;
	}

	return __private.headers;
};


/**
 * Returns true if broadcaster consensus is less than minBroadhashConsensus.
 * Returns false if consensus is undefined.
 * @param {number} [modules.peers.getConsensus()]
 * @return {boolean}
 */
Transport.prototype.poorConsensus = function (consensus) {
	var consensus = consensus || modules.peers.getConsensus();
	if (consensus === undefined) {
		return false;
	} else {
		return (consensus < constants.minBroadhashConsensus);
	}
};

/**
 * Calls getPeers method from Broadcaster class.
 * @implements {Broadcaster.getPeers}
 * @param {Object} params
 * @param {function} cb
 * @return {Broadcaster.getPeers} calls getPeers
 */
Transport.prototype.getPeers = function (params, cb) {
	return __private.broadcaster.getPeers(params, cb);
};

// Events
/**
 * Bounds scope to private broadcaster amd initialize headers.
 * @implements {modules.system.headers}
 * @implements {broadcaster.bind}
 * @param {modules} scope - Loaded modules.
 */
Transport.prototype.onBind = function (scope) {
	modules = {
		blocks: scope.blocks,
		dapps: scope.dapps,
		loader: scope.loader,
		multisignatures: scope.multisignatures,
		peers: scope.peers,
		system: scope.system,
		transactions: scope.transactions
	};

	__private.headers = modules.system.headers();
	__private.broadcaster.bind(
		scope.peers,
		scope.transport,
		scope.transactions
	);
};

/**
 * Sets private variable loaded to true
 */
Transport.prototype.onBlockchainReady = function () {
	__private.loaded = true;
};

/**
 * Calls enqueue signatures and emits a 'signature/change' socket message.
 * @implements {Broadcaster.maxRelays}
 * @implements {Broadcaster.enqueue}
 * @implements {library.network.io.sockets.emit}
 * @param {signature} signature
 * @param {Object} broadcast
 * @emits signature/change
 */
Transport.prototype.onSignature = function (signature, broadcast) {
	if (broadcast && !__private.broadcaster.maxRelays(signature)) {
		__private.broadcaster.enqueue({}, {api: 'postSignatures', data: {signature: signature}});
		library.network.io.sockets.emit('signature/change', signature);
	}
};

/**
 * Calls enqueue transactions and emits a 'transactions/change' socket message.
 * @implements {Broadcaster.maxRelays}
 * @implements {Broadcaster.enqueue}
 * @implements {library.network.io.sockets.emit}
 * @param {transaction} transaction
 * @param {Object} broadcast
 * @emits transactions/change
 */
Transport.prototype.onUnconfirmedTransaction = function (transaction, broadcast) {
	if (broadcast && !__private.broadcaster.maxRelays(transaction)) {
		__private.broadcaster.enqueue({}, {api: 'postTransactions', data: {transaction: transaction}});
		library.network.io.sockets.emit('transactions/change', transaction);
	}
};

/**
 * Calls broadcast blocks and emits a 'blocks/change' socket message.
 * @implements {modules.system.getBroadhash}
 * @implements {Broadcaster.maxRelays}
 * @implements {Broadcaster.broadcast}
 * @implements {library.network.io.sockets.emit}
 * @param {block} block
 * @param {Object} broadcast
 * @emits blocks/change
 */
Transport.prototype.onNewBlock = function (block, broadcast) {
	if (broadcast) {
		modules.system.update(function () {
			if (!__private.broadcaster.maxRelays(block) && !modules.loader.syncing()) {
				modules.peers.list({}, function (err, peers) {
					async.each(peers.filter(function (peer) { return peer.state === Peer.STATE.CONNECTED; }), function (peer, cb) {
						peer.rpc.acceptPeer(library.logic.peers.me(), function (err) {
							if (err) {
								library.logger.debug('Failed to update peer after new block applied', peer.string);
								cb({errorMsg: err, peer: peer});
								__private.removePeer({peer: peer, code: 'ECOMMUNICATION'});
							} else {
								library.logger.debug('Peer notified correctly after update', peer.string);
								cb();
							}
						});
					}, function (err) {
						if (err) {
							library.logger.debug('Broadcasting block aborted - cannot update info at peer: ', err.peer.ip + ':' + err.peer.port);
						} else {
							__private.broadcaster.broadcast({limit: constants.maxPeers, broadhash: modules.system.getBroadhash()}, {api: 'postBlock', data: {block: block}, immediate: true});
						}
					});
				});
			}
		});
		library.network.io.sockets.emit('blocks/change', block);
	}
};

/**
 * Sets loaded to false.
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Transport.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

/**
 * Returns true if modules are loaded and private variable loaded is true.
 * @return {boolean}
 */
Transport.prototype.isLoaded = function () {
	return modules && __private.loaded;
};

// Internal API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
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

				__private.removePeer({peer: query.peer, code: 'ECOMMON'});

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
		modules.blocks.utils.loadBlocksData({
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

			__private.removePeer({peer: query.peer, code: 'EBLOCK'});

			return setImmediate(cb, e.toString());
		}

		library.bus.message('receiveBlock', block);

		return setImmediate(cb, null, {success: true, blockId: block.id});
	},

	list: function (req, cb) {
		req = req || {};
		modules.peers.list(Object.assign({}, {limit: constants.maxPeers}, req.query), function (err, peers) {
			peers = (!err ? peers : []);
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
		return setImmediate(cb, null, {success: true, height: constants.headers.height, broadhash: constants.headers.broadhash, nonce: constants.headers.nonce});
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

	getTransactions: function (query, cb) {
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

	/**
	 * @param {Peer} peer
	 * @param {function} cb
	 */
	removePeer: function (peer, cb) {
		return setImmediate(cb, __private.removePeer({peer: peer, code: 0}, '') ? null : 'Failed to remove peer');
	},

	/**
	 * @param {Peer} peer
	 * @param {function} cb
	 */
	acceptPeer: function (peer, cb) {
		if (['height', 'nonce', 'broadhash'].some(function (header) { return peer[header] === undefined; })) {
			return setImmediate(cb, 'No headers information');
		}
		return setImmediate(cb, modules.peers.update(peer) ? null : 'Failed to accept peer');
	}
};

// Export
module.exports = Transport;
