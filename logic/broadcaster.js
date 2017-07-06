'use strict';

var async = require('async');
var constants = require('../helpers/constants.js');
var jobsQueue = require('../helpers/jobsQueue.js');
var extend = require('extend');
var _ = require('lodash');

// Private fields
var modules, library, self, __private = {};

/**
 * Initializes variables, sets Broadcast routes and timer based on
 * broadcast interval from config file.
 * @memberof module:transport
 * @class
 * @classdesc Main Broadcaster logic.
 * @implements {__private.releaseQueue}
 * @param {Object} broadcasts
 * @param {boolean} force
 * @param {Peers} peers - from logic, Peers instance
 * @param {Transaction} transaction - from logic, Transaction instance
 * @param {Object} logger
 */
// Constructor
function Broadcaster (broadcasts, force, peers, transaction, logger) {
	library = {
		logger: logger,
		logic: {
			peers: peers,
			transaction: transaction,
		},
		config: {
			broadcasts: broadcasts,
			forging: {
				force: force,
			},
		},
	};
	self = this;

	self.queue = [];
	self.config = library.config.broadcasts;
	self.config.peerLimit = constants.maxPeers;

	// Optionally ignore broadhash consensus
	if (library.config.forging.force) {
		self.consensus = undefined;
	} else {
		self.consensus = 100;
	}

	// Broadcast routes
	self.routes = [{
		path: '/transactions',
		collection: 'transactions',
		object: 'transaction',
		method: 'POST'
	}, {
		path: '/signatures',
		collection: 'signatures',
		object: 'signature',
		method: 'POST'
	}];

	// Broadcaster timer
	function nextRelease (cb) {
		__private.releaseQueue(function (err) {
			if (err) {
				library.logger.log('Broadcaster timer', err);
			}
			return setImmediate(cb);
		});
	}

	jobsQueue.register('broadcasterNextRelease', nextRelease, self.config.broadcastInterval);

}

// Public methods
/**
 * Binds input parameters to private variables modules.
 * @param {Peers} peers
 * @param {Transport} transport
 * @param {Transactions} transactions
 */
Broadcaster.prototype.bind = function (peers, transport, transactions) {
	modules = {
		peers: peers,
		transport: transport,
		transactions: transactions,
	};
};

/**
 * Calls peers.list function to get peers.
 * @implements {modules.peers.list}
 * @param {Object} params
 * @param {function} cb
 * @return {setImmediateCallback} err | peers
 */
Broadcaster.prototype.getPeers = function (params, cb) {
	params.limit = params.limit || self.config.peerLimit;
	params.broadhash = params.broadhash || null;

	var originalLimit = params.limit;

	modules.peers.list(params, function (err, peers, consensus) {
		if (err) {
			return setImmediate(cb, err);
		}

		if (self.consensus !== undefined && originalLimit === constants.maxPeers) {
			library.logger.info(['Broadhash consensus now', consensus, '%'].join(' '));
			self.consensus = consensus;
		}

		return setImmediate(cb, null, peers);
	});
};

/**
 * Adds new object {params, options} to queue array .
 * @param {Object} params
 * @param {Object} options
 * @return {Object[]} queue private variable with new data
 */
Broadcaster.prototype.enqueue = function (params, options) {
	options.immediate = false;
	return self.queue.push({params: params, options: options});
};

/**
 * Gets peers and for each peer create it and broadcast. 
 * @implements {getPeers}
 * @implements {library.logic.peers.create}
 * @param {Object} params
 * @param {Object} options
 * @param {function} cb
 * @return {setImmediateCallback} err | peers
 */
Broadcaster.prototype.broadcast = function (params, options, cb) {
	params.limit = params.limit || self.config.peerLimit;
	params.broadhash = params.broadhash || null;

	async.waterfall([
		function getPeers (waterCb) {
			if (!params.peers) {
				return self.getPeers(params, waterCb);
			} else {
				return setImmediate(waterCb, null, params.peers);
			}
		},
		function getFromPeer (peers, waterCb) {
			library.logger.debug('Begin broadcast', options);

			if (params.limit === self.config.peerLimit) { 
				peers = peers.slice(0, self.config.broadcastLimit);
			}

			async.eachLimit(peers, self.config.parallelLimit, function (peer, eachLimitCb) {
				peer = library.logic.peers.create(peer);

				modules.transport.getFromPeer(peer, options, function (err) {
					if (err) {
						library.logger.debug('Failed to broadcast to peer: ' + peer.string, err);
					}
					return setImmediate(eachLimitCb);
				});
			}, function (err) {
				library.logger.debug('End broadcast');
				return setImmediate(waterCb, err, peers);
			});
		}
	], function (err, peers) {
		if (cb) {
			return setImmediate(cb, err, {body: null, peer: peers});
		}
	});
};

/**
 * Counts relays and valids limit.
 * @param {Object} object
 * @return {boolean} True if Broadcast relays exhausted
 */
Broadcaster.prototype.maxRelays = function (object) {
	if (!Number.isInteger(object.relays)) {
		object.relays = 0; // First broadcast
	}

	if (Math.abs(object.relays) >= self.config.relayLimit) {
		library.logger.debug('Broadcast relays exhausted', object);
		return true;
	} else {
		object.relays++; // Next broadcast
		return false;
	}
};

// Private
/**
 * Filters private queue based on broadcasts.
 * @private
 * @implements {__private.filterTransaction}
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
__private.filterQueue = function (cb) {
	library.logger.debug('Broadcasts before filtering: ' + self.queue.length);

	async.filter(self.queue, function (broadcast, filterCb) {
		if (broadcast.options.immediate) {
			return setImmediate(filterCb, null, false);
		} else if (broadcast.options.data) {
			var transaction = (broadcast.options.data.transaction || broadcast.options.data.signature);
			return __private.filterTransaction(transaction, filterCb);
		} else {
			return setImmediate(filterCb, null, true);
		}
	}, function (err, broadcasts) {
		self.queue = broadcasts;

		library.logger.debug('Broadcasts after filtering: ' + self.queue.length);
		return setImmediate(cb);
	});
};

/**
 * Checks if transaction is in pool or confirm it.
 * @private
 * @implements {modules.transactions.transactionInPool}
 * @implements {library.logic.transaction.checkConfirmed}
 * @param {transaction} transaction
 * @param {function} cb
 * @return {setImmediateCallback} cb, null, boolean
 */
__private.filterTransaction = function (transaction, cb) {
	if (transaction !== undefined) {
		if (modules.transactions.transactionInPool(transaction.id)) {
			return setImmediate(cb, null, true);
		} else {
			return library.logic.transaction.checkConfirmed(transaction, function (err) {
				return setImmediate(cb, null, !err);
			});
		}
	} else {
		return setImmediate(cb, null, false);
	}
};

/**
 * Groups broadcasts by api.
 * @private
 * @param {Object} broadcasts
 * @return {Object[]} squashed routes
 */
__private.squashQueue = function (broadcasts) {
	var grouped = _.groupBy(broadcasts, function (broadcast) {
		return broadcast.options.api;
	});

	var squashed = [];

	self.routes.forEach(function (route) {
		if (Array.isArray(grouped[route.path])) {
			var data = {};

			data[route.collection] = grouped[route.path].map(function (broadcast) {
				return broadcast.options.data[route.object];
			}).filter(Boolean);

			squashed.push({
				options: { api: route.path, data: data, method: route.method },
				immediate: false
			});
		}
	});

	return squashed;
};

/**
 * Releases enqueued broadcasts:
 * - filterQueue
 * - squashQueue
 * - broadcast
 * @private
 * @implements {__private.filterQueue}
 * @implements {__private.squashQueue}
 * @implements {getPeers}
 * @implements {broadcast}
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
__private.releaseQueue = function (cb) {
	library.logger.debug('Releasing enqueued broadcasts');

	if (!self.queue.length) {
		library.logger.debug('Queue empty');
		return setImmediate(cb);
	}

	async.waterfall([
		function filterQueue (waterCb) {
			return __private.filterQueue(waterCb);
		},
		function squashQueue (waterCb) {
			var broadcasts = self.queue.splice(0, self.config.releaseLimit);
			return setImmediate(waterCb, null, __private.squashQueue(broadcasts));
		},
		function getPeers (broadcasts, waterCb) {
			self.getPeers({}, function (err, peers) {
				return setImmediate(waterCb, err, broadcasts, peers);
			});
		},
		function broadcast (broadcasts, peers, waterCb) {
			async.eachSeries(broadcasts, function (broadcast, eachSeriesCb) {
				self.broadcast(extend({peers: peers}, broadcast.params), broadcast.options, eachSeriesCb);
			}, function (err) {
				return setImmediate(waterCb, err, broadcasts);
			});
		}
	], function (err, broadcasts) {
		if (err) {
			library.logger.debug('Failed to release broadcast queue', err);
		} else {
			library.logger.debug('Broadcasts released: ' + broadcasts.length);
		}
		return setImmediate(cb);
	});
};

// Export
module.exports = Broadcaster;
