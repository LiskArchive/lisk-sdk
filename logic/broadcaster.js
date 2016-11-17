'use strict';

var async = require('async');
var constants = require('../helpers/constants.js');
var extend = require('extend');

// Private fields
var modules, library, self, __private = {};

// Constructor
function Broadcaster (scope) {
	library = scope;
	self = this;

	self.queue = [];
	self.peerLimit = constants.maxPeers;
	self.broadcastLimit = 20;
	self.releaseLimit = constants.maxTxsPerBlock;
	self.broadcastInterval = 5000;
	self.relayLimit = 5;

	// Optionally ignore broadhash efficiency
	if (!library.config.forging.force) {
		self.efficiency = 100;
	} else {
		self.efficiency = undefined;
	}

	// Broadcaster timer
	setInterval(function () {
		async.series([
			__private.releaseQueue
		], function (err) {
			if (err) {
				library.logger.log('Broadcaster timer', err);
			}
		});
	}, self.broadcastInterval);
}

// Public methods
Broadcaster.prototype.bind = function (scope) {
	modules = scope;
};

Broadcaster.prototype.getPeers = function (params, cb) {
	params.limit = params.limit || self.peerLimit;
	params.broadhash = params.broadhash || null;

	modules.peers.list(params, function (err, peers, efficiency) {
		if (err) {
			return setImmediate(cb, err);
		}

		if (self.efficiency !== undefined) {
			self.efficiency = efficiency;
		}

		return setImmediate(cb, null, peers);
	});
};

Broadcaster.prototype.enqueue = function (params, options) {
	return self.queue.push({params: params, options: options});
};

Broadcaster.prototype.broadcast = function (params, options, cb) {
	params.limit = params.limit || self.peerLimit;
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

			async.eachLimit(peers.slice(0, self.broadcastLimit), self.broadcastLimit, function (peer, eachLimitCb) {
				peer = modules.peers.accept(peer);

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

Broadcaster.prototype.maxRelays = function (object) {
	if (!Number.isInteger(object.relays)) {
		object.relays = 1; // First broadcast
	} else {
		object.relays++; // Next broadcast
	}

	if (Math.abs(object.relays) > self.relayLimit) {
		library.logger.debug('Broadcast relays exhausted', object);
		return true;
	} else {
		return false;
	}
};

// Private
__private.cleanQueue = function (cb) {
	library.logger.debug('Broadcasts before cleaning: ' + self.queue.length);

	self.queue = self.queue.filter(function (broadcast) {
		if (!broadcast.options || !broadcast.options.data) {
			return false;
		} else if (broadcast.options.data.transaction) {
			var transaction = broadcast.options.data.transaction;

			if (transaction !== undefined) {
				return modules.transactions.transactionInPool(transaction.id);
			} else {
				return false;
			}
		} else {
			return true;
		}
	});

	library.logger.debug('Broadcasts after cleaning: ' + self.queue.length);

	return setImmediate(cb);
};

__private.releaseQueue = function (cb) {
	var broadcasts;

	library.logger.debug('Releasing enqueued broadcasts');

	async.waterfall([
		function cleanQueue (waterCb) {
			return __private.cleanQueue(waterCb);
		},
		function getPeers (waterCb) {
			return self.getPeers({}, waterCb);
		},
		function broadcast (peers, waterCb) {
			broadcasts = self.queue.splice(0, self.releaseLimit);

			async.eachSeries(broadcasts, function (broadcast, eachSeriesCb) {
				self.broadcast(extend({peers: peers}, broadcast.params), broadcast.options, eachSeriesCb);
			}, waterCb);
		}
	], function (err) {
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
