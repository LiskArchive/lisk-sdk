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

const _ = require('lodash');
const async = require('async');
const ip = require('ip');
const failureCodes = require('../api/ws/rpc/failure_codes.js');
const jobsQueue = require('../helpers/jobs_queue.js');
const Peer = require('../logic/peer.js');

// Private fields
let modules;
let library;
let self;
const { MAX_PEERS } = global.constants;
const __private = {};
let definitions;

const peerDiscoveryFrequency = 30000;

/**
 * Main peers methods. Initializes library with scope content.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires lodash
 * @requires ip
 * @requires pg-promise
 * @requires api/ws/rpc/failure_codes
 * @requires helpers/jobs_queue
 * @requires logic/peer
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Peers {
	constructor(cb, scope) {
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
		self.broadhashConsensusCalculationInterval =
			scope.config.peers.options.broadhashConsensusCalculationInterval;
		self.blackListedPeers = scope.config.peers.access.blackList;

		setImmediate(cb, null, self);
	}
}

// Private methods
/**
 * Returns peers length by filter but without offset and limit.
 *
 * @private
 * @param {Object} filter
 * @returns {int} count
 * @todo Add description for the params
 */
__private.getCountByFilter = function(filter) {
	filter.normalized = false;
	delete filter.limit;
	delete filter.offset;
	var peers = __private.getByFilter(filter);
	return peers.length;
};

/**
 * Gets randomly ordered list of peers by filter.
 *
 * @private
 * @param {Object} filter
 * @param {function} [cb=undefined] cb - Callback function (synchronous function if not passed.
 * @returns {setImmediateCallback|Array<Peer>} cb, null, peers
 * @todo Add description for the params
 */
__private.getByFilter = function(filter, cb) {
	const allowedFields = [
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
	const limit = filter.limit ? Math.abs(filter.limit) : null;
	const offset = filter.offset ? Math.abs(filter.offset) : 0;

	/**
	 * Sorts peers.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	const sortPeers = function(field, asc) {
		return function(a, b) {
			// Match the default JavaScript sort order.
			if (a[field] === b[field]) {
				return 0;
			}
			// Ascending
			if (asc) {
				// Undefined last
				if (a[field] === undefined) {
					return 1;
				}
				if (b[field] === undefined) {
					return -1;
				}
				// Null second last
				if (a[field] === null) {
					return 1;
				}
				if (b[field] === null) {
					return -1;
				}
				if (a[field] < b[field]) {
					return -1;
				}
				return 1;
			}
			// Descending
			// Undefined first
			if (a[field] === undefined) {
				return -1;
			}
			if (b[field] === undefined) {
				return 1;
			}
			// Null second
			if (a[field] === null) {
				return -1;
			}
			if (b[field] === null) {
				return 1;
			}
			if (a[field] < b[field]) {
				return 1;
			}
			return -1;
		};
	};

	// Apply filters (by AND)
	const normalized = filter.normalized === undefined ? true : filter.normalized;
	let peers = library.logic.peers.list(normalized);

	peers = peers.filter(peer => {
		// const peer = __private.peers[index];
		let passed = true;
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
		const sort_arr = String(filter.sort).split(':');
		const sort_field = sort_arr[0]
			? _.includes(allowedFields, sort_arr[0]) ? sort_arr[0] : null
			: null;
		const sort_method = sort_arr.length === 2 ? sort_arr[1] !== 'desc' : true;
		if (sort_field) {
			peers.sort(sortPeers(sort_field, sort_method));
		}
	} else {
		// Sort randomly by default
		peers = _.shuffle(peers);
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

/**
 * Description of getMatched.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
__private.getMatched = function(test, peers) {
	peers = peers || library.logic.peers.list();

	const key = Object.keys(test)[0];
	const value = test[key];

	return peers.filter(peer => peer[key] === value);
};

/**
 * Check if the ip exists in the peer blacklist coming from config file.
 *
 * @param ip
 * @returns {boolean}
 * @todo Add description for the params and the return value
 */
__private.isBlacklisted = function(ip) {
	return self.blackListedPeers.includes(ip);
};

/**
 * Description of updatePeerStatus.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
__private.updatePeerStatus = function(err, status, peer) {
	if (err) {
		if (err.code === failureCodes.INCOMPATIBLE_NONCE) {
			// If the node tries to connect to itself as a peer, the
			// nonce will be incompatible. Here we put the peer in a BANNED
			// state so that the node doesn't keep trying to reconnect to itself.
			peer.applyHeaders({
				state: Peer.STATE.BANNED,
				nonce: library.logic.peers.me().nonce,
			});
		} else {
			library.logic.peers.remove(peer);
		}
	} else if (!modules.system.versionCompatible(status.version)) {
		library.logger.debug(
			`Peers->updatePeerStatus Incompatible version, rejecting peer: ${
				peer.string
			}, version: ${status.version}`
		);
		library.logic.peers.remove(peer);
	} else {
		let state;
		// Ban peer if it is presented in the array of black listed peers
		if (__private.isBlacklisted(peer.ip)) {
			state = Peer.STATE.BANNED;
		} else {
			state = Peer.STATE.CONNECTED;
		}

		peer.applyHeaders({
			broadhash: status.broadhash,
			height: status.height,
			httpPort: status.httpPort,
			nonce: status.nonce,
			os: status.os,
			state,
			version: status.version,
		});
	}

	library.logic.peers.upsert(peer, false);
};

/**
 * Pings to every member of peers list.
 *
 * @private
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 */
__private.insertSeeds = function(cb) {
	let updated = 0;
	library.logger.trace('Peers->insertSeeds');
	async.each(
		library.config.peers.list,
		(peer, eachCb) => {
			// Ban peer if it is presented in the array of black listed peers
			if (__private.isBlacklisted(peer.ip)) {
				peer.state = Peer.STATE.BANNED;
			}

			peer = library.logic.peers.create(peer);
			library.logger.debug(`Processing seed peer: ${peer.string}`);
			if (library.logic.peers.upsert(peer, true) !== true) {
				return setImmediate(eachCb);
			}

			// Continue if peer it is not blacklisted nor banned
			if (peer.state !== Peer.STATE.BANNED) {
				peer.rpc.status((err, status) => {
					__private.updatePeerStatus(err, status, peer);
					if (!err) {
						updated += 1;
					} else {
						library.logger.trace(`Ping peer failed: ${peer.string}`, err);
					}
					return setImmediate(eachCb);
				});
			} else {
				return setImmediate(eachCb);
			}
		},
		() => {
			library.logger.trace('Peers->insertSeeds - Peers discovered', {
				updated,
				total: library.config.peers.list.length,
			});
			return setImmediate(cb);
		}
	);
};

/**
 * Loads peers from database and checks every peer state and updated time.
 * Pings when checks are true.
 *
 * @private
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 */
__private.dbLoad = function(cb) {
	let updated = 0;
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
					// Ban peer if it is presented in the array of black listed peers
					if (__private.isBlacklisted(peer.ip)) {
						peer.state = Peer.STATE.BANNED;
					}

					peer = library.logic.peers.create(peer);
					if (library.logic.peers.upsert(peer, true) !== true) {
						return setImmediate(eachCb);
					}
					if (
						peer.state !== Peer.STATE.BANNED &&
						Date.now() - peer.updated > 3000
					) {
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
					return setImmediate(eachCb);
				},
				() => {
					library.logger.trace('Peers->dbLoad Peers discovered', {
						updated,
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
 * Inserts list of peers into `peers` table.
 *
 * @private
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 */
__private.dbSave = function(cb) {
	const peers = library.logic.peers.list(true);

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
 * Returns consensus stored by Peers.prototype.calculateConsensus.
 *
 * @returns {number|undefined} Last calculated consensus or null if wasn't calculated yet
 */
Peers.prototype.getLastConsensus = function() {
	return self.consensus;
};

/**
 * Calculates consensus for as a ratio active to matched peers.
 *
 * @param {Array<Peer>}[active=peers list] active - Active peers (with connected state)
 * @param {Array<Peer>}[matched=matching active peers] matched - Peers with same as system broadhash
 * @returns {number} Consensus or undefined if config.forging.force = true
 */
Peers.prototype.calculateConsensus = function(active, matched) {
	active =
		active ||
		library.logic.peers
			.list(true)
			.filter(peer => peer.state === Peer.STATE.CONNECTED);
	const broadhash = modules.system.getBroadhash();
	matched = matched || active.filter(peer => peer.broadhash === broadhash);
	const activeCount = Math.min(active.length, MAX_PEERS);
	const matchedCount = Math.min(matched.length, activeCount);
	const consensus = +(matchedCount / activeCount * 100).toPrecision(2);
	self.consensus = isNaN(consensus) ? 0 : consensus;
	return self.consensus;
};

// Public methods
/**
 * Updates peer in peers list.
 *
 * @param {peer} peer
 * @returns {boolean|number} Calls peers.upsert
 * @todo rename this function to activePeer or similar
 * @todo Add description for the params
 */
Peers.prototype.update = function(peer) {
	return library.logic.peers.upsert(peer, false);
};

/**
 * Removes peer from peers list if it is not a peer from config file list.
 *
 * @param {Peer} peer
 * @returns {boolean|number} Calls peers.remove
 * @todo Add description for the params
 */
Peers.prototype.remove = function(peer) {
	const frozenPeer = _.find(
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
 *
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 */
Peers.prototype.discover = function(cb) {
	library.logger.trace('Peers->discover');

	/**
	 * Description of getFromRandomPeer.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	function getFromRandomPeer(waterCb) {
		self.list(
			{
				limit: 1,
				allowedStates: [Peer.STATE.DISCONNECTED, Peer.STATE.CONNECTED],
				normalized: false,
			},
			(err, peers) => {
				const randomPeer = peers.length ? peers[0] : null;
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

	/**
	 * Description of validatePeersList.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	function validatePeersList(result, waterCb) {
		library.schema.validate(result, definitions.PeersList, err =>
			setImmediate(waterCb, err, result.peers)
		);
	}

	/**
	 * Description of pickPeers.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	function pickPeers(peers, waterCb) {
		const picked = self.acceptable(peers);
		library.logger.debug(
			['Picked', picked.length, 'of', peers.length, 'peers'].join(' ')
		);
		return setImmediate(waterCb, null, picked);
	}

	/**
	 * Description of updatePeers.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	function updatePeers(peers, waterCb) {
		async.each(
			peers,
			(peer, eachCb) => {
				peer = library.logic.peers.create(peer);
				library.schema.validate(peer, definitions.Peer, err => {
					if (err) {
						library.logger.warn(
							['Rejecting invalid peer:', peer.string].join(' '),
							{ err }
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
 *
 * @param {peer[]} peers
 * @returns {peer[]} Filtered list of peers
 * @todo Add description for the params
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
			if ((process.env.NODE_ENV || '').toUpperCase() === 'TEST') {
				return peer.nonce !== modules.system.getNonce();
			}
			return !ip.isPrivate(peer.ip) && peer.nonce !== modules.system.getNonce();
		})
		.value();
};

/**
 * Gets peers list and calculated consensus.
 *
 * @param {Object} options
 * @param {number} [options.limit=MAX_PEERS] - Maximum number of peers to get
 * @param {string} [options.broadhash=null] - Broadhash to match peers by
 * @param {string} [options.normalized=undefined] - Return peers in normalized (json) form
 * @param {Array} [options.allowedStates=[2]] - Allowed peer states
 * @param {number} [options.attempt=undefined] - If 0: Return peers with equal options.broadhash
 *                                               If 1: Return peers with different options.broadhash
 *                                               If not specified: return peers regardless of options.broadhash
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, peers
 */
Peers.prototype.list = function(options, cb) {
	let limit = options.limit || MAX_PEERS;
	const broadhash = options.broadhash || modules.system.getBroadhash();
	const allowedStates = options.allowedStates || [Peer.STATE.CONNECTED];
	const attempts =
		options.attempt === 0 || options.attempt === 1 ? [options.attempt] : [1, 0];
	const attemptsDescriptions = ['matched broadhash', 'unmatched broadhash'];

	/**
	 * Description of randomList.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	function randomList(peers, cb) {
		// Get full peers list (random)
		__private.getByFilter(
			{ normalized: options.normalized },
			(err, peersList) => {
				const found = peersList.length;
				const attempt = attempts.pop();
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
					}
					// Skip banned and disconnected peers by default
					return allowedStates.indexOf(peer.state) !== -1;
				});
				const matched = peersList.length;
				// Apply limit
				peersList = peersList.slice(0, limit);
				const picked = peersList.length;
				const accepted = peers.concat(peersList);
				library.logger.debug('Listing peers', {
					attempt: attemptsDescriptions[attempt],
					found,
					matched,
					picked,
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
				}
				peers = _.shuffle(peers);
				return setImmediate(waterCb, null, peers);
			},
		],
		cb
	);
};

/**
 * Gets the height of maximum number of peers at one particular height.
 *
 * @param {Object} options
 * @param {string} [options.normalized=false] - Return peers in normalized (json) form
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, peers
 */
Peers.prototype.networkHeight = function(options, cb) {
	self.list(options, (err, peers) => {
		if (err || peers.length === 0) {
			return setImmediate(cb, err, 0);
		}
		// count by number of peers at one height
		const mostPopularHeight = _(peers)
			.countBy('height')
			.map((count, height) => ({
				height,
				count,
			}))
			.maxBy('count');
		const networkHeight = Number(mostPopularHeight.height);

		library.logger.debug(`Network height is: ${networkHeight}`);
		library.logger.trace(mostPopularHeight);

		return setImmediate(cb, null, networkHeight);
	});
};

// Events
/**
 * Assigns scope to modules constiable.
 *
 * @param {modules} scope
 * @todo Add description for the params
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
			insertSeeds(seriesCb) {
				__private.insertSeeds(() => setImmediate(seriesCb));
			},
			importFromDatabase(seriesCb) {
				__private.dbLoad(() => setImmediate(seriesCb));
			},
			discoverNew(seriesCb) {
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
	/**
	 * Description of peersDiscoveryAndUpdate.
	 *
	 * @todo Add @param tags
	 */
	function peersDiscoveryAndUpdate(cb) {
		async.series(
			{
				/**
				 * Description of randomList.
				 *
				 * @todo Add @param tags
				 * @todo Add @returns tag
				 */
				discoverPeers(seriesCb) {
					library.logger.trace('Discovering new peers...');
					self.discover(err => {
						if (err) {
							library.logger.error('Discovering new peers failed', err);
						}
						return setImmediate(seriesCb);
					});
				},

				/**
				 * Description of updatePeers.
				 *
				 * @todo Add @param tags
				 * @todo Add @returns tag
				 */
				updatePeers(seriesCb) {
					let updated = 0;
					const peers = library.logic.peers.list();

					library.logger.trace('Updating peers', { count: peers.length });

					async.each(
						peers,
						(peer, eachCb) => {
							// If peer is not banned and not been updated during last 3 sec - ping
							if (
								peer &&
								peer.state !== Peer.STATE.BANNED &&
								(!peer.updated || Date.now() - peer.updated > 3000)
							) {
								library.logger.trace('Updating peer', peer.object());
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
								updated,
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

	function calculateConsensus(cb) {
		self.calculateConsensus();
		library.logger.debug(
			['Broadhash consensus:', self.getLastConsensus(), '%'].join(' ')
		);
		return setImmediate(cb);
	}
	// Loop in 30 sec intervals for less new insertion after removal
	jobsQueue.register(
		'peersDiscoveryAndUpdate',
		peersDiscoveryAndUpdate,
		peerDiscoveryFrequency
	);

	jobsQueue.register(
		'calculateConsensus',
		calculateConsensus,
		self.broadhashConsensusCalculationInterval
	);
};

/**
 * Export peers to database.
 *
 * @param {function} cb - Callback function
 */
Peers.prototype.cleanup = function(cb) {
	// Save peers on exit
	__private.dbSave(() => setImmediate(cb));
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded
 */
Peers.prototype.isLoaded = function() {
	return !!modules;
};

/**
 * Shared API.
 *
 * @property {function} getPeers - Utility method to get peers
 * @property {function} getPeersCount
 * @todo Add description for getPeersCount function
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Peers.prototype.shared = {
	/**
	 * Utility method to get peers.
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
	 * @returns {Array.<Object>}
	 * @todo Add description for the return value
	 */
	getPeers(parameters, cb) {
		parameters.normalized = true;
		return setImmediate(cb, null, __private.getByFilter(parameters));
	},

	/**
	 * Utility method to get peers count by filter.
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
	 * @returns {int} count
	 * @todo Add description for the return value
	 */
	getPeersCountByFilter(parameters) {
		return __private.getCountByFilter(parameters);
	},
};

// Export
module.exports = Peers;
