'use strict';

var _ = require('lodash');
var constants = require('../helpers/constants.js');
var extend = require('extend');
var fs = require('fs');
var ip = require('ip');
var OrderBy = require('../helpers/orderBy.js');
var path = require('path');
var Peer = require('../logic/peer.js');
var pgp = require('pg-promise')(); // We also initialize that library here
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/peers.js');
var steed = require('steed');
var sql = require('../sql/peers.js');
var util = require('util');

// Private fields
var modules, library, self, __private = {}, shared = {};

// Constructor
function Peers (cb, scope) {
	library = scope;
	self = this;

	__private.attachApi();
	// We store peers in that object
	__private.peers = {};

	setImmediate(cb, null, self);
}

// Private methods
__private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});

	router.map(shared, {
		'get /': 'getPeers',
		'get /version': 'version',
		'get /get': 'getPeer',
		'get /count': 'count'
	});

	router.use(function (req, res) {
		res.status(500).send({success: false, error: 'API endpoint not found'});
	});

	library.network.app.use('/api/peers', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error('API error ' + req.url, err.message);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
	});
};

__private.upsertPeer = function (peer, insertOnly) {
	var index;

	var dapps = function (index, key, value) {
		if (key === 'dappid') {
			if (Array.isArray(value)) {
				__private.peers[index][key] = value;
			} else {
				__private.peers[index][key] = [];
				__private.peers[index][key].push(value);
			}
			return true;
		} else {
			return false;
		}
	};

	// Insert new peer
	var insert = function (index, peer) {
		__private.peers[index] = {};
		_.each(peer, function (value, key) {
			if (!dapps(index, key, value)) {
				__private.peers[index][key] = value;
			}
		});

		__private.peers[index].updated = Date.now();
		library.logger.debug('Inserted new peer', index);
		library.logger.trace('Inserted new peer', {peer: peer});
	};

	// Update existing peer
	var update = function (index, peer) {
		var diff = {};
		_.each(peer, function (value, key) {
			if (__private.peers[index][key] !== value) {
				diff[key] = value;
				if (!dapps(index, key, value)) {
					__private.peers[index][key] = value;
				}
			}
			__private.peers[index].updated = Date.now();
		});

		if (Object.keys(diff).length) {
			library.logger.debug('Updated peer ' + index, diff);
		} else {
			library.logger.trace('Peer not changed', index);
		}
	};

	// We need ip and port to construct valid index
	if (!peer.ip || !peer.port) {
		library.logger.warning('Failed to upsert peer', {err: 'INVALID', peer: peer});
		return false;
	}

	index = peer.ip + ':' + peer.port;

	// We need consistency here, so if peer is not instance of Peer, we should create one
	// if (!(peer instanceof Peer)) {
	// 	library.logger.trace('Creating peer object', {peer: peer});
	// 	var peerObj = self.accept(peer);
	// 	// Apply missing properties
	// 	if (peer.clock) {
	// 		peerObj.clock = peer.clock;
	// 	}
	// 	peer = peerObj;
	// }

	// Performing insert or update
	if (__private.peers[index]) {
		// Skip update if insert-only is forced
		if (!insertOnly) {
			update(index, peer);
		}
	} else {
		insert(index, peer);
	}

	// Make sure that we set all properties to null if not there
	if (!__private.peers[index].hasOwnProperty ('height')) {
		__private.peers[index].height = null;
	}
	if (!__private.peers[index].hasOwnProperty ('broadhash')) {
		__private.peers[index].broadhash = null;
	}
	if (!__private.peers[index].hasOwnProperty ('os')) {
		__private.peers[index].os = null;
	}
	if (!__private.peers[index].hasOwnProperty ('version')) {
		__private.peers[index].version = null;
	}
	if (!__private.peers[index].hasOwnProperty ('state')) {
		__private.peers[index].state = null;
	}

	// Stats for tracing changes
	var cnt_total = 0;
	var cnt_active = 0;
	var cnt_empty_height = 0;
	var cnt_empty_broadhash = 0;

	_.each(__private.peers, function (peer, index) {
		++cnt_total;
		if (peer.state === 2) {
			++cnt_active;
		}
		if (!peer.height) {
			++cnt_empty_height;
		}
		if (!peer.broadhash) {
			++cnt_empty_broadhash;
		}
	});

	library.logger.trace('Peer stats', {total: cnt_total, alive: cnt_active, empty_height: cnt_empty_height, empty_broadhash: cnt_empty_broadhash});

	return true;
};

__private.removePeer = function (peer) {
	var index;

	// We need ip and port to construct valid index
	if (!peer.ip || !peer.port) {
		library.logger.warning('Failed to remove peer', {err: 'INVALID', peer: peer});
		return false;
	}

	index = peer.ip + ':' + peer.port;

	// Remove peer if exists
	if (__private.peers[index]) {
		library.logger.info('Removed peer', index);
		library.logger.debug('Removed peer', {peer: __private.peers[index]});
		__private.peers[index] = null; // Possible memory leak prevention
		delete __private.peers[index];
		return true;
	} else {
		library.logger.debug('Failed to remove peer', {err: 'AREMOVED', peer: peer});
		return false;
	}
};

__private.updatePeersList = function (cb) {
	function getFromRandomPeer (waterCb) {
		modules.transport.getFromRandomPeer({
			api: '/list',
			method: 'GET'
		}, function (err, res) {
			return setImmediate(waterCb, err, res);
		});
	}

	function validatePeersList (res, waterCb) {
		library.schema.validate(res.body, schema.updatePeersList.peers, function (err) {
			return setImmediate(waterCb, err, res.body.peers);
		});
	}

	function pickPeers (peers, waterCb) {
		var picked = self.acceptable(peers);

		library.logger.debug('Picked ' + picked.length + ' of ' + peers.length + ' peers');
		return setImmediate(waterCb, null, picked);
	}

	function updatePeers (peers, waterCb) {
		steed.each(peers, function (peer, eachCb) {
			peer = self.accept(peer);

			library.schema.validate(peer, schema.updatePeersList.peer, function (err) {
				if (err) {
					err.forEach(function (e) {
						library.logger.error(['Rejecting invalid peer', peer.string, e.path, e.message].join(' '));
					});
				} else if (!modules.system.versionCompatible(peer.version)) {
					library.logger.error(['Rejecting peer', peer.string, 'with incompatible version', peer.version].join(' '));
					self.remove(peer.ip, peer.port);
				} else {
					// We currently don't base on those data, but only discover new peers here - so insert-only
					__private.upsertPeer (peer, true);
				}

				return setImmediate(eachCb);
			});
		}, waterCb);
	}

	steed.waterfall([
		getFromRandomPeer,
		validatePeersList,
		pickPeers,
		updatePeers
	], function (err) {
		return setImmediate(cb, err);
	});
};

__private.count = function (cb) {
	var cnt = Object.keys(__private.peers).length;
	library.logger.debug('Peers count', cnt);
	return setImmediate(cb, null, cnt);
};

__private.countByFilter = function (filter, cb) {
	__private.getByFilter(filter, function (err, peers) {
		return setImmediate(cb, null, peers.length);
	});
};

__private.checkAndRemoveBans = function (cb) {
	var now = Date.now();
	// Operate on peers object directly, no need upsert here
	_.each(__private.peers, function (peer, index) {
		if (peer.clock && peer.clock <= now) {
			delete peer.clock;
			peer.state = 1;
			library.logger.info('Released ban for peer', peer.ip + ':' + peer.port);
		}
	});
	return setImmediate(cb);
};

__private.getByFilter = function (filter, cb) {
	var allowedFields = ['ip', 'port', 'state', 'os', 'version', 'broadhash', 'height'];
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
	var peers = Object.keys(__private.peers).filter(function (index) {
		var peer = __private.peers[index];
		var passed = true;
		_.each(filter, function (value, key) {
			// Special case for dapp peers
			if (key === 'dappid' && Array.isArray(peer[key]) && !_.includes(peer[key], String(value))) {
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
	}).map(function (peer) {
		return __private.peers[peer];
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

// Public methods
Peers.prototype.accept = function (peer) {
	return new Peer(peer);
};

Peers.prototype.acceptable = function (peers) {
	return _.chain(peers).filter(function (peer) {
		// Removing peers with private or host's ip address
		return !(ip.isPrivate(peer.ip) || ip.address('public', 'ipv4', true).some(function (address) {
			return (address + ':' + library.config.port) === (peer.ip + ':' + peer.port);
		}));
	}).uniqWith(function (a, b) {
		// Removing non-unique peers
		return (a.ip + a.port) === (b.ip + b.port);
		// Slicing peers up to maxPeers
	}).slice(0, constants.maxPeers).value();
};

Peers.prototype.list = function (options, cb) {
	options.limit = options.limit || constants.maxPeers;
	options.broadhash = options.broadhash || modules.system.getBroadhash();
	options.attempts = ['matched broadhash', 'unmatched broadhash'];
	options.attempt = 0;
	options.matched = 0;

	function randomList (options, peers, cb) {
		// Get full peers list (random)
		__private.getByFilter ({}, function (err, peersList) {
			var accepted, found, matched, picked;

			found = peersList.length;
			// Apply filters
			peersList = peersList.filter(function (peer) {
				if (options.broadhash) {
					// Skip banned peers (state 0)
					return peer.state > 0 && (
						// Matched broadhash when attempt 0
						options.attempt === 0 ? (peer.broadhash === options.broadhash) : 
						// Unmatched broadhash when attempt 1
						options.attempt === 1 ? (peer.broadhash !== options.broadhash) : false
					);
				} else {
					// Skip banned peers (state 0)
					return peer.state > 0;
				}
			});
			matched = peersList.length;
			// Apply limit
			peersList = peersList.slice(0, options.limit);
			picked = peersList.length;
			accepted = self.acceptable(peers.concat(peersList));
			library.logger.debug('Listing peers', {attempt: options.attempts[options.attempt], found: found, matched: matched, picked: picked, accepted: accepted.length});
			return setImmediate(cb, null, accepted);
		});
	}

	steed.waterfall([
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

		library.logger.debug('Listing ' + peers.length + ' total peers');
		return setImmediate(cb, err, peers, consensus);
	});
};

Peers.prototype.ban = function (pip, port, seconds) {
	var frozenPeer = _.find(library.config.peers, function (peer) {
		return peer.ip === pip && peer.port === port;
	});
	if (frozenPeer) {
		//FIXME: Keeping peer frozen is bad idea at all
		library.logger.debug('Cannot ban frozen peer', pip + ':' + port);
	} else {
		return __private.upsertPeer ({
			ip: pip,
			port: port,
			// State 0 for banned peer
			state: 0,
			clock: Date.now() + (seconds || 1) * 1000,
		});
	}
};

Peers.prototype.remove = function (pip, port) {
	var frozenPeer = _.find(library.config.peers.list, function (peer) {
		return peer.ip === pip && peer.port === port;
	});
	if (frozenPeer) {
		//FIXME: Keeping peer frozen is bad idea at all
		library.logger.debug('Cannot remove frozen peer', pip + ':' + port);
	} else {
		return __private.removePeer ({ip: pip, port: port});
	}
};

Peers.prototype.update = function (peer) {
	peer.state = 2;
	return __private.upsertPeer(self.accept(peer));
};

Peers.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

Peers.prototype.pingPeer = function (peer, cb) {
	library.logger.trace('Ping peer: ' + peer.ip + ':' + peer.port);
	modules.transport.getFromPeer(peer, {
		api: '/height',
		method: 'GET'
	}, function (err, res) {
		if (err) {
			return setImmediate(cb, 'Failed to get height from peer: ' + peer.string);
		} else {
			return setImmediate(cb);
		}
	});
};

__private.dbLoad = function (cb) {
	library.logger.trace('Importing peers from database');
	library.db.any(sql.getAll).then(function (rows) {
		library.logger.trace('Imported peers from database', {count: rows.length});
		steed.each (rows, function (row, eachCb) {
			// Delete dapp if null
			if (!row.dappid) {
				delete row.dappid;
			}
			__private.upsertPeer(row);
			setImmediate(eachCb);
		}, function (err) {
			return setImmediate(cb, err);
		});
	}).catch(function (err) {
        library.logger.error('Import peers from database failed', {error: err.message || err});
        return setImmediate(cb);
	});
};

__private.dbSave = function (cb) {
	var peers = [];
	// Preparing peers list (for consistency)
	_.each(__private.peers, function (peer) {
		peers.push(peer);
	});

	// Do nothing when peers list is empty
	if (!peers.length) {
		library.logger.debug('Export peers to database failed: Peers list empty');
		return setImmediate(cb);
	}

	// Creating set of columns
	var cs = new pgp.helpers.ColumnSet([
		'ip', 'port',
		{name: 'state',     def: 1},
		{name: 'height',    def: 1},
		{name: 'os',        def: null},
		{name: 'version',   def: null},
		{name: 'broadhash', def: null, init: function (col) {
			return col.value ? new Buffer(col.value, 'hex') : null;
		}},
		{name: 'clock',     def: null}
	], {table: 'peers'});
	// Generating insert query
	var insert_peers = pgp.helpers.insert(peers, cs);

	// Wrap sql queries in transaction and execute
	library.db.tx(function (t) {
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
    })
    .then(function (data) {
        library.logger.debug('Peers exported to database');
        return setImmediate(cb);
    })
    .catch(function (err) {
        library.logger.error('Export peers to database failed', {error: err.message || err});
        return setImmediate(cb);
    });
};

// Events
Peers.prototype.onBind = function (scope) {
	modules = scope;
};

Peers.prototype.onBlockchainReady = function () {
	steed.series({
		insertSeeds: function (seriesCb) {
			steed.each(library.config.peers.list, function (peer, eachCb) {
				self.update({
					ip: peer.ip,
					port: peer.port,
					version: modules.system.getVersion(),
					state: 2,
					// Apply our broadhash to seeds cause issues and sometimes will prevent sync
					broadhash: null, //modules.system.getBroadhash(),
					height: 1
				});
				setImmediate(eachCb);
			}, function (err) {
				setImmediate(seriesCb, err);
			});
		},
		importFromDatabase: function (seriesCb) {
			__private.dbLoad (function (err) {
				setImmediate(seriesCb, err);
			});
		}
	}, function (err) {
		__private.count(function (err, count) {
			if (count) {
				__private.updatePeersList(function (err) {
					if (err) {
						library.logger.error('Peers#updatePeersList error', err);
					}
					library.bus.message('peersReady');
				});
				library.logger.info('Peers ready, stored ' + count);
			} else {
				library.logger.warn('Peers list is empty');
				library.bus.message('peersReady');
			}
		});
	});
};

Peers.prototype.onPeersReady = function () {
	library.logger.trace('Peers ready');
	setImmediate(function nextSeries () {
		steed.series({
			updatePeersList: function (seriesCb) {
				library.logger.trace('Updating peers list...');
				__private.updatePeersList(function (err) {
					if (err) {
						library.logger.error('Peers timer', err);
					}
					setImmediate(seriesCb);
				});
			},
			updatePeers: function (seriesCb) {
				var updated = 0;
				var peers = Object.keys(__private.peers);
				library.logger.trace('Updating peers...');
				steed.each(peers, function (index, eachCb) {
					var peer = __private.peers[index];
					// If peer is not banned and not been updated during last 3 sec - ping
					if (peer && peer.state > 0 && Date.now() - peer.updated > 3000) {
						self.pingPeer (peer, function (err, res) {
							++updated;
							setImmediate(eachCb);
						});
					} else {
						setImmediate(eachCb);
					}
				}, function () {
					library.logger.trace('Peers updated', {updated: updated, total: peers.length});
					setImmediate(seriesCb);
				});
			},
			nextBanManager: function (seriesCb) {
				library.logger.trace('Checking peers bans...');
				__private.checkAndRemoveBans(function (err) {
					setImmediate(seriesCb);
				});
			}
		}, function (err) {
			// Loop in 10sec intervals (5sec + 5sec connect timeout from pingPeer)
			setTimeout(nextSeries, 5000);
		});
	});
};

Peers.prototype.cleanup = function (cb) {
	// Save peers on exit
	__private.dbSave (function () {
		return setImmediate(cb);
	});
};

// Shared
shared.count = function (req, cb) {
	steed.series({
		connected: function (cb) {
			__private.countByFilter({state: 2}, cb);
		},
		disconnected: function (cb) {
			__private.countByFilter({state: 1}, cb);
		},
		banned: function (cb) {
			__private.countByFilter({state: 0}, cb);
		}
	}, function (err, res) {
		if (err) {
			return setImmediate(cb, 'Failed to get peer count');
		}

		return setImmediate(cb, null, res);
	});
};

shared.getPeers = function (req, cb) {
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
};

shared.getPeer = function (req, cb) {
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
				return setImmediate(cb, null, {success: false, error: 'Peer not found'});
			}
		});
	});
};

/**
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
shared.version = function (req, cb) {
	return setImmediate(cb, null, {
		build:   library.build,
		commit:  library.lastCommit,
		version: library.config.version
	});
};

// Export
module.exports = Peers;
