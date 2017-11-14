'use strict';

var _ = require('lodash');
var async = require('async');
var extend = require('extend');
var fs = require('fs');
var ip = require('ip');
var path = require('path');
var pgp = require('pg-promise')(); // We also initialize library here
var util = require('util');

var apiCodes = require('../helpers/apiCodes.js');
var ApiError = require('../helpers/apiError.js');
var constants = require('../helpers/constants.js');
var failureCodes = require('../api/ws/rpc/failureCodes.js');
var jobsQueue = require('../helpers/jobsQueue.js');
var schema = require('../schema/peers.js');
var Peer = require('../logic/peer.js');
var sql = require('../sql/peers.js');

// Private fields
var modules, library, self, __private = {};

/**
 * Initializes library with scope content.
 * @memberof module:peers
 * @class
 * @classdesc Main peers methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Peers (cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		schema: scope.schema,
		bus: scope.bus,
		nonce: scope.nonce,
		build: scope.build,
		lastCommit: scope.lastCommit,
		logic: {
			peers: scope.logic.peers
		},
		config: {
			peers: scope.config.peers,
			version: scope.config.version,
			forging: {
				force: scope.config.forging.force
			}
		}
	};
	self = this;

	setImmediate(cb, null, self);
}

// Private methods
/**
 * Returns peers lenght after get them by filter.
 * @private
 * @param {Object} filter
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} peers length
 */
__private.countByFilter = function (filter, cb) {
	filter.normalized = false;
	__private.getByFilter(filter, function (err, peers) {
		return setImmediate(cb, null, peers.length);
	});
};

/**
 * Gets randomly ordered list of peers by filter.
 * @private
 * @param {Object} filter
 * @param {function} [cb=undefined] cb - Callback function (synchronous function if not passed.
 * @returns {setImmediateCallback|Array<Peer>} peers
 */
__private.getByFilter = function (filter, cb) {
	var allowedFields = ['ip', 'port', 'httpPort', 'state', 'os', 'version', 'broadhash', 'height', 'nonce'];
	var limit  = filter.limit ? Math.abs(filter.limit) : null;
	var offset = filter.offset ? Math.abs(filter.offset) : 0;

	// Sorting peers
	var sortPeers = function (field, asc) {
		return function (a, b) {
			var sort_res =
				// Nulls last
				a[field] === b[field] ? 0 :
				a[field] === null ? 1 :
				b[field] === null ? -1 :
				// Ascending
				asc ? (a[field] < b[field] ? -1 : 1) :
				// Descending
				(a[field] < b[field] ? 1 : -1);
			return sort_res;
		};
	};

	// Randomizing peers (using Fisher-Yates-Durstenfeld shuffle algorithm)
	var shuffle = function (array) {
		var m = array.length, t, i;
		// While there remain elements to shuffle
		while (m) {
			// Pick a remaining element
			i = Math.floor(Math.random() * m--);
			// And swap it with the current element
			t = array[m];
			array[m] = array[i];
			array[i] = t;
		}
		return array;
	};

	// Apply filters (by AND)
	var normalized = filter.normalized === undefined ? true : filter.normalized;
	var peers = library.logic.peers.list(normalized);

	peers = peers.filter(function (peer) {
		// var peer = __private.peers[index];
		var passed = true;
		_.each(filter, function (value, key) {
			// Every filter field need to be in allowed fields, exists and match value
			if (_.includes(allowedFields, key) && !(peer[key] !== undefined && peer[key] === value)) {
				passed = false;
				return false;
			}
		});
		return passed;
	});

	// Sorting
	if (filter.sort) {
		var sort_arr = String(filter.sort).split(':');
		var sort_field = sort_arr[0] ? (_.includes(allowedFields, sort_arr[0]) ? sort_arr[0] : null) : null;
		var sort_method = (sort_arr.length === 2) ? (sort_arr[1] === 'desc' ? false : true) : true;
		if (sort_field) {
			peers.sort(sortPeers(sort_field, sort_method));
		}
	} else {
		// Sort randomly by default
		peers = shuffle (peers);
	}

	// Apply limit if supplied
	if (limit) {
		peers = peers.slice(offset, (offset + limit));
	} else if (offset) {
		peers = peers.slice(offset);
	}

	if (!cb) {
		return peers;
	}
	return setImmediate(cb, null, peers);
};

__private.getMatched = function (test, peers) {
	peers = peers || library.logic.peers.list();

	var key = Object.keys(test)[0];
	var value = test[key];

	return peers.filter(function (peer) {
		return peer[key] === value;
	});
};

__private.updatePeerStatus = function (err, status, peer) {

	if (err) {
		peer.applyHeaders({state: Peer.STATE.DISCONNECTED});
		return false;
	} else {
		peer.applyHeaders({
			height: status.height,
			broadhash: status.broadhash,
			nonce: status.nonce,
			state: Peer.STATE.CONNECTED //connected
		});
	}

	library.logic.peers.upsert(peer, false);
};

/**
 * Pings to every member of peers list.
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb
 */
__private.insertSeeds = function (cb) {
	var updated = 0;
	library.logger.trace('Peers->insertSeeds');
	async.each(library.config.peers.list, function (peer, eachCb) {
		peer = library.logic.peers.create(peer);
		library.logger.debug('Processing seed peer: ' + peer.string);
		peer.rpc.status(function (err, status) {
			__private.updatePeerStatus(err, status, peer);
			if (!err) {
				updated += 1;
			} else {
				library.logger.trace('Ping peer failed: ' + peer.string, err);
			}
			return setImmediate(eachCb, err);
		});
	}, function (err) {
		library.logger.trace('Peers->insertSeeds - Peers discovered', {updated: updated, total: library.config.peers.list.length});
		return setImmediate(cb);
	});
};

/**
 * Loads peers from database and checks every peer state and updated time.
 * Pings when checks are true.
 * @implements library.db
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb
 */
__private.dbLoad = function (cb) {
	var updated = 0;
	library.logger.trace('Importing peers from database');
	library.db.any(sql.getAll).then(function (rows) {
		library.logger.info('Imported peers from database', {count: rows.length});
		async.each (rows, function (peer, eachCb) {
			peer = library.logic.peers.create(peer);
			if (library.logic.peers.exists(peer)) {
				peer = library.logic.peers.get(peer);
				if (peer && peer.state > 0 && Date.now() - peer.updated > 3000) {
					return updatePeer(peer, eachCb);
				}
				return setImmediate(eachCb);
			}

			return updatePeer(peer, eachCb);

			function updatePeer (peer, cb) {
				peer.rpc.status(function (err, status) {
					__private.updatePeerStatus(err, status, peer);
					if (!err) {
						updated += 1;
					} else {
						library.logger.trace('Ping peer from db failed: ' + peer.string, err);
					}
					return setImmediate(eachCb);
				});
			}
		}, function (err) {
			library.logger.trace('Peers->dbLoad Peers discovered', {updated: updated, total: rows.length});
			return setImmediate(cb);
		});
	}).catch(function (err) {
		library.logger.error('Import peers from database failed', {error: err.message || err});
		return setImmediate(cb);
	});
};

/**
 * Inserts list of peers into `peers` table
 *
 * @implements library.db
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb
 */
__private.dbSave = function (cb) {
	var peers = library.logic.peers.list(true);

	// Do nothing when peers list is empty
	if (!peers.length) {
		library.logger.debug('Export peers to database failed: Peers list empty');
		return setImmediate(cb);
	}

	// Creating set of columns
	var cs = new pgp.helpers.ColumnSet([
		'ip', 'port', 'state', 'height', 'os', 'version', 'clock',
		{name: 'broadhash', init: function (col) {
			return col.value ? Buffer.from(col.value, 'hex') : null;
		}}
	], {table: 'peers'});

	// Wrap sql queries in transaction and execute
	library.db.tx(function (t) {
		// Generating insert query
		var insert_peers = pgp.helpers.insert(peers, cs);

		var queries = [
			// Clear peers table
			t.none(sql.clear),
			// Insert all peers
			t.none(insert_peers)
		];

		return t.batch(queries);
	}).then(function (data) {
		library.logger.info('Peers exported to database');
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error('Export peers to database failed', {error: err.message || err});
		return setImmediate(cb);
	});
};

Peers.prototype.getConsensus = function (matched, active) {

	if (library.config.forging.force) {
		return undefined;
	}

	active = active || __private.getByFilter({state: Peer.STATE.CONNECTED, normalized: false});
	matched = matched || __private.getMatched({broadhash: modules.system.getBroadhash()}, active);

	active = active.slice(0, constants.maxPeers);
	matched = matched.slice(0, constants.maxPeers);

	var consensus = Math.round(matched.length / active.length * 100 * 1e2) / 100;

	if (isNaN(consensus)) {
		return 0;
	}

	return consensus;
};

// Public methods

/**
 * Updates peer in peers list.
 * @param {peer} peer
 * @return {boolean|number} Calls peers.upsert
 * @todo rename this function to activePeer or similar
 */
Peers.prototype.update = function (peer) {
	return library.logic.peers.upsert(peer, false);
};

/**
 * Removes peer from peers list if it is not a peer from config file list.
 * @implements logic.peers.remove
 * @param {Peer} peer
 * @return {boolean|number} Calls peers.remove
 */
Peers.prototype.remove = function (peer) {
	var frozenPeer = _.find(library.config.peers.list, function (__peer) {
		return peer.ip === __peer.ip && peer.port === __peer.port;
	});
	if (frozenPeer) {
		// FIXME: Keeping peer frozen is bad idea at all
		library.logger.debug('Cannot remove frozen peer', peer.ip + ':' + peer.port);
		peer.state = Peer.STATE.DISCONNECTED;
		library.logic.peers.upsert(peer);
		return failureCodes.ON_MASTER.REMOVE.FROZEN_PEER;
	}
	return library.logic.peers.remove(peer);
};

/**
 * Discovers peers by getting list and validates them.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb | error
 */
Peers.prototype.discover = function (cb) {
	library.logger.trace('Peers->discover');
	function getFromRandomPeer (waterCb) {
		self.list({limit: 1, allowedStates: [Peer.STATE.DISCONNECTED, Peer.STATE.CONNECTED], normalized: false}, function (err, peers) {
			var randomPeer = peers.length ? peers[0] : null;
			if (!err && randomPeer) {
				randomPeer.rpc.status(function (err, status) {
					__private.updatePeerStatus(err, status, randomPeer);
					randomPeer.rpc.list(waterCb);
				});
			} else {
				return setImmediate(waterCb, err || 'No acceptable peers found');
			}
		});
	}

	function validatePeersList (result, waterCb) {
		library.schema.validate(result, schema.discover.peers, function (err) {
			return setImmediate(waterCb, err, result.peers);
		});
	}

	function pickPeers (peers, waterCb) {
		var picked = self.acceptable(peers);
		library.logger.debug(['Picked', picked.length, 'of', peers.length, 'peers'].join(' '));
		return setImmediate(waterCb, null, picked);
	}

	function updatePeers (peers, waterCb) {
		async.each(peers, function (peer, eachCb) {
			peer = library.logic.peers.create(peer);
			library.schema.validate(peer, schema.discover.peer, function (err) {
				if (err) {
					library.logger.warn(['Rejecting invalid peer:', peer.string].join(' '), {err: err});
					return setImmediate(eachCb);
				}

				// Set peer state to disconnected
				peer.state = Peer.STATE.DISCONNECTED;
				// We rely on data from other peers only when new peer is discovered for the first time
				library.logic.peers.upsert(peer, true);
				return setImmediate(eachCb);
			});
		}, function (err) {
			library.logger.trace('Peers discovered', peers.length);
			return setImmediate(waterCb);
		});
	}

	async.waterfall([
		getFromRandomPeer,
		validatePeersList,
		pickPeers,
		updatePeers
	], function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Filters peers with private or address or with the same nonce.
 * @param {peer[]} peers
 * @return {peer[]} Filtered list of peers
 */
Peers.prototype.acceptable = function (peers) {
	return _(peers)
		.uniqWith(function (a, b) {
			// Removing non-unique peers
			return (a.ip + a.port) === (b.ip + b.port);
		})
		.filter(function (peer) {
			// Removing peers with private address or nonce equal to itself
			if ((process.env['NODE_ENV'] || '').toUpperCase() === 'TEST') {
				return peer.nonce !== modules.system.getNonce();
			}
			return !ip.isPrivate(peer.ip) && peer.nonce !== modules.system.getNonce();
		}).value();
};

/**
 * Gets peers list and calculated consensus.
 * @param {Object} options - Constains limit, broadhash.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | peers, consensus
 */
Peers.prototype.list = function (options, cb) {
	options.limit = options.limit || constants.maxPeers;
	options.broadhash = options.broadhash || modules.system.getBroadhash();
	options.allowedStates = options.allowedStates || [Peer.STATE.CONNECTED];
	options.attempts = ['matched broadhash', 'unmatched broadhash'];
	options.attempt = 0;
	options.matched = 0;

	function randomList (options, peers, cb) {
		// Get full peers list (random)
		__private.getByFilter({normalized: options.normalized}, function (err, peersList) {
			var accepted, found, matched, picked;

			found = peersList.length;
			// Apply filters
			peersList = peersList.filter(function (peer) {
				if (options.broadhash) {
					// Skip banned and disconnected peers by default
					return options.allowedStates.indexOf(peer.state) !== -1 && (
						// Matched broadhash when attempt 0
						options.attempt === 0 ? (peer.broadhash === options.broadhash) :
						// Unmatched broadhash when attempt 1
						options.attempt === 1 ? (peer.broadhash !== options.broadhash) : false
					);
				} else {
					// Skip banned and disconnected peers by default
					return options.allowedStates.indexOf(peer.state) !== -1;
				}
			});
			matched = peersList.length;
			// Apply limit
			peersList = peersList.slice(0, options.limit);
			picked = peersList.length;
			accepted = peers.concat(peersList);
			library.logger.debug('Listing peers', {attempt: options.attempts[options.attempt], found: found, matched: matched, picked: picked, accepted: accepted.length});
			return setImmediate(cb, null, accepted);
		});
	}

	async.waterfall([
		function (waterCb) {
			// Matched broadhash
			return randomList (options, [], waterCb);
		},
		function (peers, waterCb) {
			options.matched = peers.length;
			options.limit -= peers.length;
			++options.attempt;
			if (options.limit > 0) {
				// Unmatched broadhash
				return randomList(options, peers, waterCb);
			} else {
				return setImmediate(waterCb, null, peers);
			}
		}
	], function (err, peers) {
		// Calculate consensus
		var consensus = Math.round(options.matched / peers.length * 100 * 1e2) / 1e2;
		consensus = isNaN(consensus) ? 0 : consensus;

		library.logger.debug(['Listing', peers.length, 'total peers'].join(' '));
		return setImmediate(cb, err, peers, consensus);
	});
};

// Events
/**
 * assigns scope to modules variable
 * @param {modules} scope
 */
Peers.prototype.onBind = function (scope) {
	modules = {
		system: scope.system
	};
};

/**
 * Triggers onPeersReady after:
 * - Ping to every member of peers list.
 * - Load peers from database and checks every peer state and updated time.
 * - Discover peers by getting list and validates them.
 */
Peers.prototype.onBlockchainReady = function () {
	async.series({
		insertSeeds: function (seriesCb) {
			__private.insertSeeds(function (err) {
				return setImmediate(seriesCb);
			});
		},
		importFromDatabase: function (seriesCb) {
			__private.dbLoad (function (err) {
				return setImmediate(seriesCb);
			});
		},
		discoverNew: function (seriesCb) {
			self.discover (function (err) {
				return setImmediate(seriesCb);
			});
		}
	}, function (err) {
		library.bus.message('peersReady');
	});
};

/**
 * Discovers peers and updates them in 10sec intervals loop.
 */
Peers.prototype.onPeersReady = function () {
	library.logger.trace('Peers ready');
	function peersDiscoveryAndUpdate (cb) {
		async.series({
			discoverPeers: function (seriesCb) {
				library.logger.trace('Discovering new peers...');
				self.discover(function (err) {
					if (err) {
						library.logger.error('Discovering new peers failed', err);
					}
					return setImmediate(seriesCb);
				});
			},
			updatePeers: function (seriesCb) {
				var updated = 0;
				var peers = library.logic.peers.list();

				library.logger.trace('Updating peers', {count: peers.length});

				async.each(peers, function (peer, eachCb) {
					// If peer is not banned and not been updated during last 3 sec - ping
					if (peer && peer.state > 0 && (!peer.updated || Date.now() - peer.updated > 3000)) {
						library.logger.trace('Updating peer', peer);
						peer.rpc.status(function (err, status) {
							__private.updatePeerStatus(err, status, peer);
							if (!err) {
								updated += 1;
							} else {
								library.logger.trace('Every 10sec peers check ping peer failed ' + peer.string, err);
							}
							return setImmediate(eachCb);
						});
					} else {
						return setImmediate(eachCb);
					}
				}, function () {
					library.logger.trace('Peers updated', {updated: updated, total: peers.length});
					return setImmediate(seriesCb);
				});
			}
		}, function () {
			return setImmediate(cb);
		});
	}
	// Loop in 10sec intervals (5sec + 5sec connect timeout from pingPeer)
	jobsQueue.register('peersDiscoveryAndUpdate', peersDiscoveryAndUpdate, 60000);
};

/**
 * Export peers to database.
 * @param {function} cb - Callback function.
 */
Peers.prototype.cleanup = function (cb) {
	// Save peers on exit
	__private.dbSave (function () {
		return setImmediate(cb);
	});
};

/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
Peers.prototype.isLoaded = function () {
	return !!modules;
};

// Shared API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Peers.prototype.shared = {
	/**
	 * Utility method to get peers
	 *
	 * @param {Object} parameters - Object of all parameters
	 * @param {string} parameters.ip - IP of the peer
	 * @param {string} parameters.port - WS Port of the peer
	 * @param {string} parameters.httpPort - Web Socket Port of the peer
	 * @param {string} parameters.os - OS of the peer
	 * @param {string} parameters.version - Version the peer is running
	 * @param {int} parameters.state - Peer State
	 * @param {int} parameters.height - Current peer height
	 * @param {string} parameters.broadhash - Peer broadhash
	 * @param {int} parameters.limit - Per page limit
	 * @param {int} parameters.offset - Page start from
	 * @param {string} parameters.sort - Sort key
	 * @param {function} cb - Callback function
	 * @return {Array.<Object>}
	 */
	getPeers: function (parameters, cb) {
		parameters.normalized = true;
		return setImmediate(cb, null, __private.getByFilter(parameters));
	},

	getPeersCount: function () {
		return library.logic.peers.list(true).length;
	}
};

// Export
module.exports = Peers;
