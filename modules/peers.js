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

var _ = require('lodash');
var async = require('async');
var ip = require('ip');
// We also initialize library here
var pgp = require('pg-promise')(); // eslint-disable-line no-unused-vars
var constants = require('../helpers/constants.js');
var failureCodes = require('../api/ws/rpc/failure_codes.js');
var jobsQueue = require('../helpers/jobs_queue.js');
var Peer = require('../logic/peer.js');

// Private fields
var modules;
var library;
var self;
var __private = {};
var definitions;

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
function Peers(cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		schema: scope.schema,
		bus: scope.bus,
		nonce: scope.nonce,
		build: scope.build,
		lastCommit: scope.lastCommit,
		logic: {
			peers: scope.logic.peers,
		},
		config: {
			peers: scope.config.peers,
			version: scope.config.version,
		},
	};
	self = this;
	self.consensus = scope.config.forging.force ? 100 : 0;
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
__private.countByFilter = function(filter, cb) {
	filter.normalized = false;
	__private.getByFilter(filter, (err, peers) =>
		setImmediate(cb, null, peers.length)
	);
};

/**
 * Gets randomly ordered list of peers by filter.
 * @private
 * @param {Object} filter
 * @param {function} [cb=undefined] cb - Callback function (synchronous function if not passed.
 * @returns {setImmediateCallback|Array<Peer>} peers
 */
__private.getByFilter = function(filter, cb) {
	var allowedFields = [
		'ip',
		'wsPort',
		'httpPort',
		'state',
		'os',
		'version',
		'broadhash',
		'height',
		'nonce',
	];
	var limit = filter.limit ? Math.abs(filter.limit) : null;
	var offset = filter.offset ? Math.abs(filter.offset) : 0;

	// Sorting peers
	var sortPeers = function(field, asc) {
		return function(a, b) {
			var sort_res =
				// Nulls last
				a[field] === b[field]
					? 0
					: a[field] === null
						? 1
						: b[field] === null
							? -1
							: // Ascending
								asc
								? a[field] < b[field] ? -1 : 1
								: // Descending
									a[field] < b[field] ? 1 : -1;
			return sort_res;
		};
	};

	// Randomizing peers (using Fisher-Yates-Durstenfeld shuffle algorithm)
	var shuffle = function(array) {
		var m = array.length;
		var t;
		var i;
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

	peers = peers.filter(peer => {
		// var peer = __private.peers[index];
		var passed = true;
		_.each(filter, (value, key) => {
			// Every filter field need to be in allowed fields, exists and match value
			if (
				_.includes(allowedFields, key) &&
				!(peer[key] !== undefined && peer[key] === value)
			) {
				passed = false;
				return false;
			}
		});
		return passed;
	});

	// Sorting
	if (filter.sort) {
		var sort_arr = String(filter.sort).split(':');
		var sort_field = sort_arr[0]
			? _.includes(allowedFields, sort_arr[0]) ? sort_arr[0] : null
			: null;
		var sort_method = sort_arr.length === 2 ? sort_arr[1] !== 'desc' : true;
		if (sort_field) {
			peers.sort(sortPeers(sort_field, sort_method));
		}
	} else {
		// Sort randomly by default
		peers = shuffle(peers);
	}

	// Apply limit if supplied
	if (limit) {
		peers = peers.slice(offset, offset + limit);
	} else if (offset) {
		peers = peers.slice(offset);
	}

	if (!cb) {
		return peers;
	}
	return setImmediate(cb, null, peers);
};

__private.getMatched = function(test, peers) {
	peers = peers || library.logic.peers.list();

	var key = Object.keys(test)[0];
	var value = test[key];

	return peers.filter(peer => peer[key] === value);
};

__private.updatePeerStatus = function(err, status, peer) {
	if (err) {
		if (err.code === failureCodes.INCOMPATIBLE_NONCE) {
			// If the node tries to connect to itself as a peer, the
			// nonce will be incompatible. Here we put the peer in a BANNED
			// state so that the node doesn't keep trying to reconnect to itself.
			peer.applyHeaders({ state: Peer.STATE.BANNED });
		} else {
			peer.applyHeaders({ state: Peer.STATE.DISCONNECTED });
		}
	} else {
		peer.applyHeaders({
			broadhash: status.broadhash,
			height: status.height,
			httpPort: status.httpPort,
			nonce: status.nonce,
			os: status.os,
			state: Peer.STATE.CONNECTED,
			version: status.version,
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
__private.insertSeeds = function(cb) {
	var updated = 0;
	library.logger.trace('Peers->insertSeeds');
	async.each(
		library.config.peers.list,
		(peer, eachCb) => {
			peer = library.logic.peers.create(peer);
			library.logger.debug(`Processing seed peer: ${peer.string}`);
			peer.rpc.status((err, status) => {
				__private.updatePeerStatus(err, status, peer);
				if (!err) {
					updated += 1;
				} else {
					library.logger.trace(`Ping peer failed: ${peer.string}`, err);
				}
				return setImmediate(eachCb, err);
			});
		},
		() => {
			library.logger.trace('Peers->insertSeeds - Peers discovered', {
				updated: updated,
				total: library.config.peers.list.length,
			});
			return setImmediate(cb);
		}
	);
};

/**
 * Loads peers from database and checks every peer state and updated time.
 * Pings when checks are true.
 * @implements library.db
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb
 */
__private.dbLoad = function(cb) {
	var updated = 0;
	library.logger.trace('Importing peers from database');
	library.db.peers
		.list()
		.then(rows => {
			library.logger.info('Imported peers from database', {
				count: rows.length,
			});
			async.each(
				rows,
				(peer, eachCb) => {
					peer = library.logic.peers.create(peer);
					if (library.logic.peers.exists(peer)) {
						peer = library.logic.peers.get(peer);
						if (peer && peer.state > 0 && Date.now() - peer.updated > 3000) {
							return updatePeer(peer, eachCb);
						}
						return setImmediate(eachCb);
					}

					return updatePeer(peer, eachCb);

					function updatePeer(peer) {
						peer.rpc.status((err, status) => {
							__private.updatePeerStatus(err, status, peer);
							if (!err) {
								updated += 1;
							} else {
								library.logger.trace(
									`Ping peer from db failed: ${peer.string}`,
									err
								);
							}
							return setImmediate(eachCb);
						});
					}
				},
				() => {
					library.logger.trace('Peers->dbLoad Peers discovered', {
						updated: updated,
						total: rows.length,
					});
					return setImmediate(cb);
				}
			);
		})
		.catch(err => {
			library.logger.error('Import peers from database failed', {
				error: err.message || err,
			});
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
__private.dbSave = function(cb) {
	var peers = library.logic.peers.list(true);

	// Do nothing when peers list is empty
	if (!peers.length) {
		library.logger.debug('Export peers to database failed: Peers list empty');
		return setImmediate(cb);
	}

	// Wrap sql queries in transaction and execute
	library.db
		.tx('modules:peers:dbSave', t =>
			t.peers.clear().then(() => t.peers.insert(peers))
		)
		.then(() => {
			library.logger.info('Peers exported to database');
			return setImmediate(cb);
		})
		.catch(err => {
			library.logger.error('Export peers to database failed', {
				error: err.message || err,
			});
			return setImmediate(cb);
		});
};

/**
 * Returns consensus stored by Peers.prototype.calculateConsensus
 * @returns {number|undefined} - Last calculated consensus or null wasn't calculated yet
 */
Peers.prototype.getLastConsensus = function() {
	return self.consensus;
};

/**
 * Calculates consensus for as a ratio active to matched peers.
 * @param {Array<Peer>}[active=peers list] active - Active peers (with connected state).
 * @param {Array<Peer>}[matched=matching active peers] matched - Peers with same as system broadhash.
 * @returns {number} - Consensus or undefined if config.forging.force = true.
 */
Peers.prototype.calculateConsensus = function(active, matched) {
	active =
		active ||
		library.logic.peers
			.list(true)
			.filter(peer => peer.state === Peer.STATE.CONNECTED);
	var broadhash = modules.system.getBroadhash();
	matched = matched || active.filter(peer => peer.broadhash === broadhash);
	var activeCount = Math.min(active.length, constants.maxPeers);
	var matchedCount = Math.min(matched.length, activeCount);
	var consensus = +(matchedCount / activeCount * 100).toPrecision(2);
	self.consensus = isNaN(consensus) ? 0 : consensus;
	return self.consensus;
};

// Public methods
/**
 * Updates peer in peers list.
 * @param {peer} peer
 * @return {boolean|number} Calls peers.upsert
 * @todo rename this function to activePeer or similar
 */
Peers.prototype.update = function(peer) {
	return library.logic.peers.upsert(peer, false);
};

/**
 * Removes peer from peers list if it is not a peer from config file list.
 * @implements logic.peers.remove
 * @param {Peer} peer
 * @return {boolean|number} Calls peers.remove
 */
Peers.prototype.remove = function(peer) {
	var frozenPeer = _.find(
		library.config.peers.list,
		__peer => peer.ip === __peer.ip && peer.wsPort === __peer.wsPort
	);
	if (frozenPeer) {
		// FIXME: Keeping peer frozen is bad idea at all
		library.logger.debug(
			'Cannot remove frozen peer',
			`${peer.ip}:${peer.wsPort}`
		);
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
Peers.prototype.discover = function(cb) {
	library.logger.trace('Peers->discover');
	function getFromRandomPeer(waterCb) {
		self.list(
			{
				limit: 1,
				allowedStates: [Peer.STATE.DISCONNECTED, Peer.STATE.CONNECTED],
				normalized: false,
			},
			(err, peers) => {
				var randomPeer = peers.length ? peers[0] : null;
				if (!err && randomPeer) {
					randomPeer.rpc.status((err, status) => {
						__private.updatePeerStatus(err, status, randomPeer);
						if (err) {
							return setImmediate(waterCb, err);
						}
						randomPeer.rpc.list(waterCb);
					});
				} else {
					return setImmediate(waterCb, err || 'No acceptable peers found');
				}
			}
		);
	}

	function validatePeersList(result, waterCb) {
		library.schema.validate(result, definitions.PeersList, err =>
			setImmediate(waterCb, err, result.peers)
		);
	}

	function pickPeers(peers, waterCb) {
		var picked = self.acceptable(peers);
		library.logger.debug(
			['Picked', picked.length, 'of', peers.length, 'peers'].join(' ')
		);
		return setImmediate(waterCb, null, picked);
	}

	function updatePeers(peers, waterCb) {
		async.each(
			peers,
			(peer, eachCb) => {
				peer = library.logic.peers.create(peer);
				library.schema.validate(peer, definitions.Peer, err => {
					if (err) {
						library.logger.warn(
							['Rejecting invalid peer:', peer.string].join(' '),
							{ err: err }
						);
						return setImmediate(eachCb);
					}

					// Set peer state to disconnected
					peer.state = Peer.STATE.DISCONNECTED;
					// We rely on data from other peers only when new peer is discovered for the first time
					library.logic.peers.upsert(peer, true);
					return setImmediate(eachCb);
				});
			},
			() => {
				library.logger.trace('Peers discovered', peers.length);
				return setImmediate(waterCb);
			}
		);
	}

	async.waterfall(
		[getFromRandomPeer, validatePeersList, pickPeers, updatePeers],
		err => setImmediate(cb, err)
	);
};

/**
 * Filters peers with private or address or with the same nonce.
 * @param {peer[]} peers
 * @return {peer[]} Filtered list of peers
 */
Peers.prototype.acceptable = function(peers) {
	return _(peers)
		.uniqWith(
			(a, b) =>
				// Removing non-unique peers
				a.ip + a.wsPort === b.ip + b.wsPort
		)
		.filter(peer => {
			// Removing peers with private address or nonce equal to itself
			if ((process.env['NODE_ENV'] || '').toUpperCase() === 'TEST') {
				return peer.nonce !== modules.system.getNonce();
			}
			return !ip.isPrivate(peer.ip) && peer.nonce !== modules.system.getNonce();
		})
		.value();
};

/**
 * Gets peers list and calculated consensus.
 * @param {Object} options
 * @param {number} [options.limit=constants.maxPeers] - Maximum number of peers to get.
 * @param {string} [options.broadhash=null] - Broadhash to match peers by.
 * @param {string} [options.normalized=undefined] - Return peers in normalized (json) form.
 * @param {Array} [options.allowedStates=[2]] - Allowed peer states.
 * @param {number} [options.attempt=undefined] - If 0: Return peers with equal options.broadhash
 *                                               If 1: Return peers with different options.broadhash
 *                                               If not specified: return peers regardless of options.broadhash
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | peers, consensus
 */
Peers.prototype.list = function(options, cb) {
	var limit = options.limit || constants.maxPeers;
	var broadhash = options.broadhash || modules.system.getBroadhash();
	var allowedStates = options.allowedStates || [Peer.STATE.CONNECTED];
	var attempts =
		options.attempt === 0 || options.attempt === 1 ? [options.attempt] : [1, 0];
	var attemptsDescriptions = ['matched broadhash', 'unmatched broadhash'];

	function randomList(peers, cb) {
		// Get full peers list (random)
		__private.getByFilter(
			{ normalized: options.normalized },
			(err, peersList) => {
				var accepted;
				var found;
				var matched;
				var picked;

				found = peersList.length;
				var attempt = attempts.pop();
				// Apply filters
				peersList = peersList.filter(peer => {
					if (broadhash) {
						// Skip banned and disconnected peers by default
						return (
							allowedStates.indexOf(peer.state) !== -1 &&
							// Matched broadhash when attempt 0
							(attempt === 0
								? peer.broadhash === broadhash
								: // Unmatched broadhash when attempt 1
									attempt === 1 ? peer.broadhash !== broadhash : false)
						);
					} else {
						// Skip banned and disconnected peers by default
						return allowedStates.indexOf(peer.state) !== -1;
					}
				});
				matched = peersList.length;
				// Apply limit
				peersList = peersList.slice(0, limit);
				picked = peersList.length;
				accepted = peers.concat(peersList);
				library.logger.debug('Listing peers', {
					attempt: attemptsDescriptions[options.attempt],
					found: found,
					matched: matched,
					picked: picked,
					accepted: accepted.length,
				});
				return setImmediate(cb, null, accepted);
			}
		);
	}

	async.waterfall(
		[
			function(waterCb) {
				// Matched broadhash
				return randomList([], waterCb);
			},
			function(peers, waterCb) {
				limit -= peers.length;
				if (attempts.length && limit > 0) {
					// Unmatched broadhash
					return randomList(peers, waterCb);
				} else {
					return setImmediate(waterCb, null, peers);
				}
			},
		],
		cb
	);
};

// Events
/**
 * assigns scope to modules variable
 * @param {modules} scope
 */
Peers.prototype.onBind = function(scope) {
	modules = {
		system: scope.system,
	};

	definitions = scope.swagger.definitions;
};

/**
 * Triggers onPeersReady after:
 * - Ping to every member of peers list.
 * - Load peers from database and checks every peer state and updated time.
 * - Discover peers by getting list and validates them.
 */
Peers.prototype.onBlockchainReady = function() {
	async.series(
		{
			insertSeeds: function(seriesCb) {
				__private.insertSeeds(() => setImmediate(seriesCb));
			},
			importFromDatabase: function(seriesCb) {
				__private.dbLoad(() => setImmediate(seriesCb));
			},
			discoverNew: function(seriesCb) {
				self.discover(() => setImmediate(seriesCb));
			},
		},
		() => {
			library.bus.message('peersReady');
		}
	);
};

/**
 * Periodically discovers and updates peers.
 */
Peers.prototype.onPeersReady = function() {
	library.logger.trace('Peers ready');
	function peersDiscoveryAndUpdate(cb) {
		async.series(
			{
				discoverPeers: function(seriesCb) {
					library.logger.trace('Discovering new peers...');
					self.discover(err => {
						if (err) {
							library.logger.error('Discovering new peers failed', err);
						}
						return setImmediate(seriesCb);
					});
				},
				updatePeers: function(seriesCb) {
					var updated = 0;
					var peers = library.logic.peers.list();

					library.logger.trace('Updating peers', { count: peers.length });

					async.each(
						peers,
						(peer, eachCb) => {
							// If peer is not banned and not been updated during last 3 sec - ping
							if (
								peer &&
								peer.state > 0 &&
								(!peer.updated || Date.now() - peer.updated > 3000)
							) {
								library.logger.trace('Updating peer', peer);
								peer.rpc.status((err, status) => {
									__private.updatePeerStatus(err, status, peer);
									if (!err) {
										updated += 1;
									} else {
										library.logger.trace(
											`Every 10sec peers check ping peer failed ${peer.string}`,
											err
										);
									}
									return setImmediate(eachCb);
								});
							} else {
								return setImmediate(eachCb);
							}
						},
						() => {
							library.logger.trace('Peers updated', {
								updated: updated,
								total: peers.length,
							});
							return setImmediate(seriesCb);
						}
					);
				},
			},
			() => setImmediate(cb)
		);
	}
	// Loop in 10 sec intervals (5 sec + 5 sec connection timeout from pingPeer)
	jobsQueue.register('peersDiscoveryAndUpdate', peersDiscoveryAndUpdate, 5000);
};

/**
 * Export peers to database.
 * @param {function} cb - Callback function.
 */
Peers.prototype.cleanup = function(cb) {
	// Save peers on exit
	__private.dbSave(() => setImmediate(cb));
};

/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
Peers.prototype.isLoaded = function() {
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
	 * @param {string} parameters.wsPort - WS Port of the peer
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
	getPeers: function(parameters, cb) {
		parameters.normalized = true;
		return setImmediate(cb, null, __private.getByFilter(parameters));
	},

	getPeersCount: function() {
		return library.logic.peers.list(true).length;
	},
};

// Export
module.exports = Peers;
