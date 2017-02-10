'use strict';

var _ = require('lodash');
var async = require('async');
var constants = require('../helpers/constants.js');
var extend = require('extend');
var fs = require('fs');
var ip = require('ip');
var OrderBy = require('../helpers/orderBy.js');
var path = require('path');
var Peer = require('../logic/peer.js');
var PeerSweeper = require('../logic/peerSweeper.js');
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/peers.js');
var sql = require('../sql/peers.js');
var util = require('util');

// Private fields
var modules, library, self, __private = {}, shared = {};

// List of peers not behaving well
// reset when we restart
var removed = [];

// Constructor
function Peers (cb, scope) {
	library = scope;
	self = this;

	__private.attachApi();
	__private.sweeper = new PeerSweeper({ library: library, sql: sql });

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
		// Protect removed nodes from overflow
		if (removed.length > 100) {
			removed = [];
		}

		library.logger.debug('Removed peers: ' + removed.length);

		// Pick peers
		//
		// * Removing unacceptable peers
		// * Removing nodes not behaving well
		var picked = self.acceptable(peers).filter(function (peer) {
			return removed.indexOf(peer.ip);
		});

		// Drop one random peer from removed array to give them a chance.
		// This mitigates the issue that a node could be removed forever if it was offline for long.
		// This is not harmful for the node, but prevents network from shrinking, increasing noise.
		// To fine tune: decreasing random value threshold -> reduce noise.
		if (Math.random() < 0.5) { // Every 60/0.5 = 120s
			// Remove the first element,
			// i.e. the one that have been placed first.
			removed.shift();
			removed.pop();
		}

		library.logger.debug(['Picked', picked.length, 'of', peers.length, 'peers'].join(' '));
		return setImmediate(waterCb, null, picked);
	}

	function updatePeers (peers, waterCb) {
		async.eachLimit(peers, 2, function (peer, eachCb) {
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
					delete peer.broadhash;
					delete peer.height;
					self.update(peer);
				}

				return setImmediate(eachCb);
			});
		}, waterCb);
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

__private.count = function (cb) {
	library.db.query(sql.count).then(function (rows) {
		var res = rows.length && rows[0].count;
		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Peers#count error');
	});
};

__private.countByFilter = function (filter, cb) {
	var where = [];
	var params = {};

	if (filter.port) {
		where.push('"port" = ${port}');
		params.port = filter.port;
	}

	if (filter.state >= 0) {
		where.push('"state" = ${state}');
		params.state = filter.state;
	}

	if (filter.os) {
		where.push('"os" = ${os}');
		params.os = filter.os;
	}

	if (filter.version) {
		where.push('"version" = ${version}');
		params.version = filter.version;
	}

	if (filter.broadhash) {
		where.push('"broadhash" = ${broadhash}');
		params.broadhash = filter.broadhash;
	}

	if (filter.height) {
		where.push('"height" = ${height}');
		params.height = filter.height;
	}

	library.db.query(sql.countByFilter({
		where: where
	}), params).then(function (rows) {
		var res = rows.length && rows[0].count;
		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Peers#count error');
	});
};

__private.banManager = function (cb) {
	library.db.query(sql.banManager, { now: Date.now() }).then(function (res) {
		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Peers#banManager error');
	});
};

__private.getByFilter = function (filter, cb) {
	var where = [];
	var params = {};

	if (filter.ip) {
		where.push('"ip" = ${ip}');
		params.ip = filter.ip;
	}

	if (filter.port) {
		where.push('"port" = ${port}');
		params.port = filter.port;
	}

	if (filter.state >= 0) {
		where.push('"state" = ${state}');
		params.state = filter.state;
	}

	if (filter.os) {
		where.push('"os" = ${os}');
		params.os = filter.os;
	}

	if (filter.version) {
		where.push('"version" = ${version}');
		params.version = filter.version;
	}

	if (filter.broadhash) {
		where.push('"broadhash" = ${broadhash}');
		params.broadhash = filter.broadhash;
	}

	if (filter.height) {
		where.push('"height" = ${height}');
		params.height = filter.height;
	}

	var orderBy = OrderBy(
		filter.orderBy, {
			sortFields: sql.sortFields
		}
	);

	if (orderBy.error) {
		return setImmediate(cb, orderBy.error);
	}

	if (!filter.limit) {
		params.limit = 100;
	} else {
		params.limit = Math.abs(filter.limit);
	}

	if (!filter.offset) {
		params.offset = 0;
	} else {
		params.offset = Math.abs(filter.offset);
	}

	if (params.limit > 100) {
		return setImmediate(cb, 'Invalid limit. Maximum is 100');
	}

	library.db.query(sql.getByFilter({
		where: where,
		sortField: orderBy.sortField,
		sortMethod: orderBy.sortMethod
	}), params).then(function (rows) {
		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Peers#getByFilter error');
	});
};

// Public methods
Peers.prototype.accept = function (peer) {
	return new Peer(peer);
};

Peers.prototype.acceptable = function (peers) {
	return _.chain(peers).filter(function (peer) {
		// Removing peers with private or host's ip address
		return !(ip.isPrivate(peer.ip) || ip.address('public', 'ipv4', true).some(function (address) {
			return [address, library.config.port].join(':') === [peer.ip, peer.port].join(':');
		}));
	}).uniqWith(function (a, b) {
		// Removing non-unique peers
		return (a.ip + a.port) === (b.ip + b.port);
		// Slicing peers up to maxPeers
	}).value();
};

Peers.prototype.list = function (options, cb) {
	options.limit = options.limit || constants.maxPeers;
	options.broadhash = options.broadhash || modules.system.getBroadhash();
	options.attempts = ['matched broadhash', 'unmatched broadhash', 'fallback'];
	options.attempt = 0;
	options.matched = 0;

	if (!options.broadhash) {
		delete options.broadhash;
	}

	function randomList (options, peers, cb) {
		library.db.query(sql.randomList(options), options).then(function (rows) {
			options.limit -= rows.length;
			if (options.attempt === 0 && rows.length > 0) { options.matched = rows.length; }
			library.logger.debug(['Listing', rows.length, options.attempts[options.attempt], 'peers'].join(' '));
			return setImmediate(cb, null, self.acceptable(peers.concat(rows)));
		}).catch(function (err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Peers#list error');
		});
	}

	async.waterfall([
		// Matched broadhash
		function (waterCb) {
			return randomList(options, [], waterCb);
		},
		// Unmatched broadhash
		function (peers, waterCb) {
			if (options.limit > 0) {
				options.attempt += 1;

				return randomList(options, peers, waterCb);
			} else {
				return setImmediate(waterCb, null, peers);
			}
		},
		// Fallback
		function (peers, waterCb) {
			delete options.broadhash;

			if (options.limit > 0) {
				options.attempt += 1;

				return randomList(options, peers, waterCb);
			} else {
				return setImmediate(waterCb, null, peers);
			}
		}
	], function (err, peers) {
		var consensus = Math.round(options.matched / peers.length * 100 * 1e2) / 1e2;
		    consensus = isNaN(consensus) ? 0 : consensus;

		library.logger.debug(['Listing', peers.length, 'total peers'].join(' '));
		return setImmediate(cb, err, peers, consensus);
	});
};

Peers.prototype.state = function (pip, port, state, timeoutSeconds) {
	var frozenPeer = _.find(library.config.peers, function (peer) {
		return peer.ip === pip && peer.port === port;
	});
	if (frozenPeer) {
		library.logger.debug('Not changing state of frozen peer', [pip, port].join(':'));
	} else {
		var clock;

		if (state === 0) {
			clock = (timeoutSeconds || 1) * 1000;
			clock = Date.now() + clock;
		} else {
			clock = null;
		}
		return __private.sweeper.push('state', {
			state: state,
			clock: clock,
			ip: pip,
			port: port
		});
	}
};

Peers.prototype.isRemoved = function (pip) {
	return (removed.indexOf(pip) !== -1);
};

Peers.prototype.remove = function (pip, port) {
	var frozenPeer = _.find(library.config.peers.list, function (peer) {
		return peer.ip === pip && peer.port === port;
	});
	if (frozenPeer) {
		library.logger.debug('Not removing frozen peer', [pip, port].join(':'));
	} else if (self.isRemoved(pip)) {
		library.logger.debug('Peer already removed', [pip, port].join(':'));
	} else {
		removed.push(pip);
		return __private.sweeper.push('remove', { ip: pip, port: port });
	}
};

Peers.prototype.update = function (peer) {
	peer.state = 2;
	removed.splice(removed.indexOf(peer.ip));
	return __private.sweeper.push('upsert', self.accept(peer).object());
};

Peers.prototype.pingPeer = function (peer, cb) {
	library.logger.trace('Ping peer: ' + peer.ip + ':' + peer.port);
	modules.transport.getFromPeer(peer, {
		api: '/height',
		method: 'GET'
	}, function (err, res) {
		if (err) {
			return setImmediate(cb, 'Failed to ping peer: ' + peer.ip + ':' + peer.port);
		} else {
			return setImmediate(cb);
		}
	});
};

Peers.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Peers.prototype.onBind = function (scope) {
	modules = scope;
};

Peers.prototype.onBlockchainReady = function () {
	async.series({
		insertSeeds: function (seriesCb) {
			async.eachSeries(library.config.peers.list, function (peer, eachCb) {
				self.update({
					ip: peer.ip,
					port: peer.port,
					version: modules.system.getVersion(),
					state: 2,
					broadhash: null,
					height: 1
				});

				return setImmediate(eachCb);
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		},
		waitForSweep: function (seriesCb) {
			return setTimeout(seriesCb, 1000);
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
	library.logger.trace('onPeersReady');
	setImmediate(function nextSeries () {
		async.series({
			updatePeersList: function (seriesCb) {
				library.logger.trace('onPeersReady->updatePeersList');
				__private.updatePeersList(function (err) {
					if (err) {
						library.logger.error('Peers timer', err);
					}
					return setImmediate(seriesCb);
				});
			},
			nextBanManager: function (seriesCb) {
				library.logger.trace('onPeersReady->nextBanManager');
				__private.banManager(function (err) {
					if (err) {
						library.logger.error('Ban manager timer', err);
					}
					return setImmediate(seriesCb);
				});
			},
			updatePeers: function (seriesCb) {
				library.logger.trace('onPeersReady->updatePeers');
				self.list ({limit: 500}, function (err, peers, consensus) {
					if (err) {
						library.logger.error('Get peers failed', err);
						return setImmediate(seriesCb, err);
					}

					library.logger.trace('onPeersReady->updatePeers', {count: (peers ? peers.length : null)});
					var updated = 0;
					async.each(peers, function (peer, eachCb) {
						library.logger.debug('Updating peer', {peer: peer});
						// If peer is not banned and not been updated during last 3 sec - ping
						if (peer && peer.state > 0) {
							self.pingPeer (peer, function (err, res) {
								if (!err) {
									++updated;
								}
								setImmediate(eachCb);
							});
						} else {
							setImmediate(eachCb);
	 					}
					}, function () {
						library.logger.trace('onPeersReady->updatePeers', {updated: updated, total: peers.length});
						setImmediate(seriesCb);
					});
				});
			}
		}, function (err) {
			return setTimeout(nextSeries, 5000);
		});
	});
};

// Shared
shared.count = function (req, cb) {
	async.series({
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
