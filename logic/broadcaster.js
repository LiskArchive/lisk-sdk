/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var async = require('async');
var extend = require('extend');
var _ = require('lodash');
var constants = require('../helpers/constants.js');
var jobsQueue = require('../helpers/jobs_queue.js');
var bson = require('../helpers/bson.js');

// Private fields
var modules;
var library;
var self;
var __private = {};

/**
 * Main Broadcaster logic.
 * Initializes variables, sets Broadcast routes and timer based on
 * broadcast interval from config file.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires extend
 * @requires lodash
 * @requires helpers/constants
 * @requires helpers/jobs_queue
 * @requires helpers/bson
 * @param {Object} broadcasts - Description of the param
 * @param {boolean} force - Description of the param
 * @param {Peers} peers - from logic, Peers instance
 * @param {Transaction} transaction - from logic, Transaction instance
 * @param {Object} logger - Description of the param
 * @todo Add descriptions of the params
 */
// Constructor
function Broadcaster(broadcasts, force, peers, transaction, logger) {
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

	// Broadcast routes
	self.routes = [
		{
			path: 'postTransactions',
			collection: 'transactions',
			object: 'transaction',
		},
		{
			path: 'postSignatures',
			collection: 'signatures',
			object: 'signature',
		},
	];

	// Broadcaster timer
	function nextRelease(cb) {
		__private.releaseQueue(err => {
			if (err) {
				library.logger.log('Broadcaster timer', err);
			}
			return setImmediate(cb);
		});
	}

	jobsQueue.register(
		'broadcasterNextRelease',
		nextRelease,
		self.config.broadcastInterval
	);
}

// Public methods
/**
 * Binds input parameters to private variables modules.
 *
 * @param {Peers} peers - Description of the param
 * @param {Transport} transport - Description of the param
 * @param {Transactions} transactions - Description of the param
 * @todo Add descriptions of the params
 */
Broadcaster.prototype.bind = function(peers, transport, transactions) {
	modules = {
		peers: peers,
		transport: transport,
		transactions: transactions,
	};
};

/**
 * Calls peers.list function to get peers.
 *
 * @param {Object} params - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} err | peers
 * @todo Add descriptions of the params
 */
Broadcaster.prototype.getPeers = function(params, cb) {
	params.limit = params.limit || self.config.peerLimit;
	params.broadhash = params.broadhash || null;
	params.normalized = false;

	var originalLimit = params.limit;

	modules.peers.list(params, (err, peers) => {
		if (err) {
			return setImmediate(cb, err);
		}

		if (originalLimit === constants.maxPeers) {
			library.logger.info(
				['Broadhash consensus now', modules.peers.getLastConsensus(), '%'].join(
					' '
				)
			);
		}

		return setImmediate(cb, null, peers);
	});
};

/**
 * Adds new object {params, options} to queue array.
 *
 * @param {Object} params - Description of the param
 * @param {Object} options - Description of the param
 * @returns {Object[]} queue private variable with new data
 * @todo Add descriptions of the params
 */
Broadcaster.prototype.enqueue = function(params, options) {
	options.immediate = false;
	return self.queue.push({ params: params, options: options });
};

/**
 * Gets peers and for each peer create it and broadcast.
 *
 * @param {Object} params - Description of the param
 * @param {Object} options - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} err | peers
 * @todo Add descriptions of the params
 */
Broadcaster.prototype.broadcast = function(params, options, cb) {
	options.data.peer = library.logic.peers.me();
	params.limit = params.limit || self.config.peerLimit;
	params.broadhash = params.broadhash || null;

	async.waterfall(
		[
			function getPeers(waterCb) {
				if (!params.peers) {
					return self.getPeers(params, waterCb);
				} else {
					return setImmediate(waterCb, null, params.peers);
				}
			},
			function sendToPeer(peers, waterCb) {
				library.logger.debug('Begin broadcast', options);

				if (options.data.block) {
					try {
						options.data.block = bson.serialize(options.data.block);
					} catch (err) {
						library.logger.error('Broadcast serialization failed:', err);
						return setImmediate(cb, err);
					}
				}

				if (params.limit === self.config.peerLimit) {
					peers = peers.slice(0, self.config.broadcastLimit);
				}
				async.eachLimit(
					peers,
					self.config.parallelLimit,
					(peer, eachLimitCb) => {
						peer.rpc[options.api](options.data, err => {
							if (err) {
								library.logger.debug(
									`Failed to broadcast to peer: ${peer.string}`,
									err
								);
							}
							return setImmediate(eachLimitCb);
						});
					},
					err => {
						library.logger.debug('End broadcast');
						return setImmediate(waterCb, err, peers);
					}
				);
			},
		],
		(err, peers) => {
			if (cb) {
				return setImmediate(cb, err, { body: null, peer: peers });
			}
		}
	);
};

/**
 * Counts relays and valid limit.
 *
 * @param {Object} object - Description of the param
 * @returns {boolean} True if Broadcast relays exhausted
 * @todo Add descriptions of the params
 */
Broadcaster.prototype.maxRelays = function(object) {
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
 *
 * @private
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb
 * @todo Add descriptions of the params
 */
__private.filterQueue = function(cb) {
	library.logger.debug(`Broadcasts before filtering: ${self.queue.length}`);

	async.filter(
		self.queue,
		(broadcast, filterCb) => {
			if (broadcast.options.immediate) {
				return setImmediate(filterCb, null, false);
			} else if (broadcast.options.data) {
				var transaction =
					broadcast.options.data.transaction ||
					broadcast.options.data.signature;
				return __private.filterTransaction(transaction, filterCb);
			} else {
				return setImmediate(filterCb, null, true);
			}
		},
		(err, broadcasts) => {
			self.queue = broadcasts;

			library.logger.debug(`Broadcasts after filtering: ${self.queue.length}`);
			return setImmediate(cb);
		}
	);
};

/**
 * Checks if transaction is in pool or confirm it.
 *
 * @private
 * @param {transaction} transaction - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb, null, boolean
 * @todo Add descriptions of the params
 */
__private.filterTransaction = function(transaction, cb) {
	if (transaction !== undefined) {
		if (modules.transactions.transactionInPool(transaction.id)) {
			return setImmediate(cb, null, true);
		} else {
			return library.logic.transaction.checkConfirmed(transaction, err =>
				setImmediate(cb, null, !err)
			);
		}
	} else {
		return setImmediate(cb, null, false);
	}
};

/**
 * Groups broadcasts by api.
 *
 * @private
 * @param {Object} broadcasts - Description of the param
 * @returns {Object[]} squashed routes
 * @todo Add descriptions of the params
 */
__private.squashQueue = function(broadcasts) {
	var grouped = _.groupBy(broadcasts, broadcast => broadcast.options.api);

	var squashed = [];

	self.routes.forEach(route => {
		if (Array.isArray(grouped[route.path])) {
			var data = {};

			data[route.collection] = grouped[route.path]
				.map(broadcast => broadcast.options.data[route.object])
				.filter(Boolean);

			squashed.push({
				options: { api: route.path, data: data },
				immediate: false,
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
 *
 * @private
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb
 * @todo Add descriptions of the params
 */
__private.releaseQueue = function(cb) {
	library.logger.debug('Releasing enqueued broadcasts');

	if (!self.queue.length) {
		library.logger.debug('Queue empty');
		return setImmediate(cb);
	}

	async.waterfall(
		[
			function filterQueue(waterCb) {
				return __private.filterQueue(waterCb);
			},
			function squashQueue(waterCb) {
				var broadcasts = self.queue.splice(0, self.config.releaseLimit);
				return setImmediate(waterCb, null, __private.squashQueue(broadcasts));
			},
			function getPeers(broadcasts, waterCb) {
				self.getPeers({}, (err, peers) =>
					setImmediate(waterCb, err, broadcasts, peers)
				);
			},
			function broadcast(broadcasts, peers, waterCb) {
				async.eachSeries(
					broadcasts,
					(broadcast, eachSeriesCb) => {
						self.broadcast(
							extend({ peers: peers }, broadcast.params),
							broadcast.options,
							eachSeriesCb
						);
					},
					err => setImmediate(waterCb, err, broadcasts)
				);
			},
		],
		(err, broadcasts) => {
			if (err) {
				library.logger.debug('Failed to release broadcast queue', err);
			} else {
				library.logger.debug(`Broadcasts released: ${broadcasts.length}`);
			}
			return setImmediate(cb);
		}
	);
};

// Export
module.exports = Broadcaster;
