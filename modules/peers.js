'use strict';

var _ = require('lodash');
var async = require('async');
var constants = require('../helpers/constants.js');
var jobsQueue = require('../helpers/jobsQueue.js');
var extend = require('extend');
var fs = require('fs');
var ip = require('ip');
var path = require('path');
var pgp = require('pg-promise')(); // We also initialize library here
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/peers.js');
var Peer = require('../logic/peer.js');
var sql = require('../sql/peers.js');
var util = require('util');

// Private fields
var modules, library, self, __private = {}, shared = {};

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
			forging: scope.config.forging,
			peers: scope.config.peers,
			version: scope.config.version
		},
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
	__private.getByFilter(filter, function (err, peers) {
		return setImmediate(cb, null, peers.length);
	});
};

/**
 * Gets randomly ordered list of peers by filter.
 * @private
 * @param {Object} filter
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} peers
 */
__private.getByFilter = function (filter, cb) {
	var allowedFields = ['ip', 'port', 'state', 'os', 'version', 'broadhash', 'height', 'nonce'];
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
	var peers = library.logic.peers.list(true);

	peers = peers.filter(function (peer) {
		// var peer = __private.peers[index];
		var passed = true;
		_.each(filter, function (value, key) {
			// Special case for dapp peers
			if (key === 'dappid' && (peer[key] === null || (Array.isArray(peer[key]) && !_.includes(peer[key], String(value))))) {
				passed = false;
				return false;
			}
			// Every filter field need to be in allowed fields, exists and match value
			if (_.includes(allowedFields, key) && !(peer[key] !== undefined && peer[key] === value)) {
				passed = false;
				return false;
			}
		});
		return passed;
	});

	// Sorting
	if (filter.orderBy) {
		var sort_arr = String(filter.orderBy).split(':');
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

	return setImmediate(cb, null, peers);
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
		library.logger.trace('Processing seed peer: ' + peer.string);
		self.ping(peer, function (err) {
			++updated;
			return setImmediate(eachCb);
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
					self.ping(peer, function (err) {
						++updated;
						return setImmediate(eachCb);
					});
				} else {
					return setImmediate(eachCb);
				}
			} else {
				self.ping(peer, function (err) {
					++updated;
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
 * Inserts list of peers into `peers` table and inserts dapps peers
 * into `peers_dapp` table.
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

		// Inserting dapps peers
		_.each(peers, function (peer) {
			if (peer.dappid) {
				// If there are dapps on peer - push separately for every dapp
				_.each (peer.dappid, function (dappid) {
					var dapp_peer = peer;
					dapp_peer.dappid = dappid;
					queries.push(t.none(sql.addDapp, peer));
				});
			}
		});

		return t.batch(queries);
	}).then(function (data) {
		library.logger.info('Peers exported to database');
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error('Export peers to database failed', {error: err.message || err});
		return setImmediate(cb);
	});
};

// Public methods
/**
 * Calls helpers.sandbox.callMethod().
 * @implements module:helpers#callMethod
 * @param {function} call - Method to call.
 * @param {*} args - List of arguments.
 * @param {function} cb - Callback function.
 */
Peers.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(Peers.prototype.shared, call, args, cb);
};

/**
 * Calculates consensus for as a ratio active to matched peers.
 * @param {Array<Peer>} active - active peers (with connected state)
 * @param {Array<Peer>} matched - peers with same as system broadhash
 * @returns {number|undefined} - return consensus or undefined if config.forging.force = true
 */
Peers.prototype.getConsensus = function (active, matched) {
	active = active || library.logic.peers.list(true);
	var broadhash = modules.system.getBroadhash();
	matched = matched || active.filter(function (peer) {
		return peer.broadhash === broadhash;
	});
	var activeCount = Math.min(active.length, constants.maxPeers);
	var matchedCount = Math.min(matched.length, activeCount);
	var consensus = +(matchedCount / activeCount * 100).toPrecision(2);
	return isNaN(consensus) ? 0 : consensus;
};


/**
 * Sets peer state to active (2).
 * @param {peer} peer
 * @return {function} Calls peers.upsert
 * @todo rename this function to activePeer or similar
 */
Peers.prototype.update = function (peer) {
	peer.state = Peer.STATE.CONNECTED;
	return library.logic.peers.upsert(peer);
};

/**
 * Removes peer from peers list if it is not a peer from config file list.
 * @implements logic.peers.remove
 * @param {string} pip - Peer ip
 * @param {number} port
 * @return {function} Calls peers.remove
 */
Peers.prototype.remove = function (pip, port) {
	var frozenPeer = _.find(library.config.peers.list, function (peer) {
		return peer.ip === pip && peer.port === port;
	});
	if (frozenPeer) {
		// FIXME: Keeping peer frozen is bad idea at all
		library.logger.debug('Cannot remove frozen peer', pip + ':' + port);
	} else {
		return library.logic.peers.remove ({ip: pip, port: port});
	}
};

/**
 * Pings peer.
 * @implements transport.getFromPeer
 * @param {peer} peer - List of arguments.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb | error when ping peer fails
 */
Peers.prototype.ping = function (peer, cb) {
	library.logger.trace('Pinging peer: ' + peer.string);
	modules.transport.getFromPeer(peer, {
		api: '/height',
		method: 'GET'
	}, function (err, res) {
		if (err) {
			library.logger.trace('Ping peer failed: ' + peer.string, err);
			return setImmediate(cb, err);
		} else {
			return setImmediate(cb);
		}
	});
};

/**
 * Discovers peers by getting list and validates them.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb | error
 */
Peers.prototype.discover = function (cb) {
	library.logger.trace('Peers->discover');
	function getFromRandomPeer (waterCb) {
		modules.transport.getFromRandomPeer({
			api: '/list',
			method: 'GET'
		}, function (err, res) {
			return setImmediate(waterCb, err, res);
		});
	}

	function validatePeersList (res, waterCb) {
		library.schema.validate(res.body, schema.discover.peers, function (err) {
			return setImmediate(waterCb, err, res.body.peers);
		});
	}

	function pickPeers (peers, waterCb) {
		var picked = self.acceptable(peers);
		library.logger.debug(['Picked', picked.length, 'of', peers.length, 'peers'].join(' '));
		return setImmediate(waterCb, null, picked);
	}

	function updatePeers (peers, waterCb) {
		var updated = 0;
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
			// Removing peers with private address or nonce equal to self
			if ((process.env['NODE_ENV'] || '').toUpperCase() === 'TEST') {
				return peer.nonce !== modules.system.getNonce() && (peer.os !== 'lisk-js-api');
			}
			return !ip.isPrivate(peer.ip) && peer.nonce !== modules.system.getNonce() && (peer.os !== 'lisk-js-api');
		}).value();
};

/**
 * Gets peers list and calculated consensus.
 * @param {Object} options
 * @param {number} options.limit[=constants.maxPeers] - maximum number of peers to get
 * @param {string} options.broadhash[=null] - broadhash to match peers by
 * @param {Array} options.allowedStates[=[2]] - allowed peer states
 * @param {number} options.attempt[=undefined] - if 0: return peers with equal options.broadhash
 *                                               if 1: return peers with different options.broadhash
 *                                               if not specified: return peers regardless of options.broadhash
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | peers, consensus
 */
Peers.prototype.list = function (options, cb) {

	var limit = options.limit || constants.maxPeers;
	var broadhash = options.broadhash || modules.system.getBroadhash();
	var allowedStates = options.allowedStates || [Peer.STATE.CONNECTED];
	var attempts = (options.attempt === 0 || options.attempt === 1) ? [options.attempt] : [1, 0];

	var attemptsDescriptions = ['matched broadhash', 'unmatched broadhash'];

	function randomList (peers, cb) {
		// Get full peers list (random)
		__private.getByFilter({}, function (err, peersList) {
			var accepted, found, matched, picked;

			found = peersList.length;
			var attempt = attempts.pop();
			// Apply filters
			peersList = peersList.filter(function (peer) {
				if (broadhash) {
					// Skip banned and disconnected peers (state 0 and 1)
					return allowedStates.indexOf(peer.state) !== -1 && (
						// Matched broadhash when attempt 0
						attempt === 0 ? (peer.broadhash === broadhash) :
						// Unmatched broadhash when attempt 1
						attempt === 1 ? (peer.broadhash !== broadhash) : false
					);
				} else {
					// Skip banned and disconnected peers (state 0 and 1)
					return allowedStates.indexOf(peer.state) !== -1;
				}
			});
			matched = peersList.length;
			// Apply limit
			peersList = peersList.slice(0, limit);
			picked = peersList.length;
			accepted = self.acceptable(peers.concat(peersList));
			library.logger.debug('Listing peers', {attempt: attemptsDescriptions[attempt], found: found, matched: matched, picked: picked, accepted: accepted.length});
			return setImmediate(cb, null, accepted);
		});
	}

	async.waterfall([
		function (waterCb) {
			// Matched broadhash
			return randomList([], waterCb);
		},
		function (peers, waterCb) {
			limit -= peers.length;
			if (attempts.length && limit > 0) {
				// Unmatched broadhash
				return randomList(peers, waterCb);
			} else {
				return setImmediate(waterCb, null, peers);
			}
		}
	], cb);
};

// Events
/**
 * assigns scope to modules variable
 * @param {modules} scope
 */
Peers.prototype.onBind = function (scope) {
	modules = {
		transport: scope.transport,
		system: scope.system,
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
						self.ping(peer, function (err) {
							++updated;
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
	jobsQueue.register('peersDiscoveryAndUpdate', peersDiscoveryAndUpdate, 5000);
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
	count: function (req, cb) {
		async.series({
			connected: function (cb) {
				__private.countByFilter({state: Peer.STATE.CONNECTED}, cb);
			},
			disconnected: function (cb) {
				__private.countByFilter({state: Peer.STATE.DISCONNECTED}, cb);
			},
			banned: function (cb) {
				__private.countByFilter({state: Peer.STATE.BANNED}, cb);
			}
		}, function (err, res) {
			if (err) {
				return setImmediate(cb, 'Failed to get peer count');
			}

			return setImmediate(cb, null, res);
		});
	},

	getPeers: function (req, cb) {
		library.schema.validate(req.body, schema.getPeers, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			if (req.body.limit < 0 || req.body.limit > 100) {
				return setImmediate(cb, 'Invalid limit. Maximum is 100');
			}

			__private.getByFilter(req.body, function (err, peers) {
				if (err) {
					return setImmediate(cb, 'Failed to get peers');
				}

				return setImmediate(cb, null, {peers: peers});
			});
		});
	},

	getPeer: function (req, cb) {
		library.schema.validate(req.body, schema.getPeer, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			__private.getByFilter({
				ip: req.body.ip,
				port: req.body.port
			}, function (err, peers) {
				if (err) {
					return setImmediate(cb, 'Failed to get peer');
				}

				if (peers.length) {
					return setImmediate(cb, null, {success: true, peer: peers[0]});
				} else {
					return setImmediate(cb, 'Peer not found');
				}
			});
		});
	},

	/*
	 * Returns information about version
	 *
	 * @public
	 * @async
	 * @method version
	 * @param  {Object}   req HTTP request object
	 * @param  {Function} cb Callback function
	 * @return {Function} cb Callback function from params (through setImmediate)
	 * @return {Object}   cb.err Always return `null` here
	 * @return {Object}   cb.obj Anonymous object with version info
	 * @return {String}   cb.obj.build Build information (if available, otherwise '')
	 * @return {String}   cb.obj.commit Hash of last git commit (if available, otherwise '')
	 * @return {String}   cb.obj.version Lisk version from config file
	 */
	version: function (req, cb) {
		return setImmediate(cb, null, {
			build: library.build,
			commit: library.lastCommit,
			version: library.config.version
		});
	}
};

// Export
module.exports = Peers;
