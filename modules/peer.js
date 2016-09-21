'use strict';

var _ = require('lodash');
var async = require('async');
var extend = require('extend');
var fs = require('fs');
var ip = require('ip');
var OrderBy = require('../helpers/orderBy.js');
var path = require('path');
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var sql = require('../sql/peer.js');
var util = require('util');

// Private fields
var modules, library, self, __private = {}, shared = {};

// List of peers not behaving well
// reset when we restart
var removed = [];

__private.loopback = ['0.0.0.0', '127.0.0.1'];

// Constructor
function Peer (cb, scope) {
	library = scope;
	self = this;

	__private.attachApi();

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
		'get /get': 'getPeer'
	});

	router.use(function (req, res) {
		res.status(500).send({success: false, error: 'API endpoint not found'});
	});

	library.network.app.use('/api/peers', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
};

__private.updatePeerList = function (cb) {
	modules.transport.getFromRandomPeer({
		api: '/list',
		method: 'GET'
	}, function (err, data) {
		if (err) {
			return setImmediate(cb);
		}

		var report = library.scheme.validate(data.body.peers, {type: 'array', required: true, uniqueItems: true});

		library.scheme.validate(data.body, {
			type: 'object',
			properties: {
				peers: {
					type: 'array',
					uniqueItems: true
				}
			},
			required: ['peers']
		}, function (err) {
			if (err) {
				return setImmediate(cb);
			}

			// Removing nodes not behaving well
			library.logger.debug('Removed peers list size: ' + removed.length);
			var peers = data.body.peers.filter(function (peer) {
					return removed.indexOf(peer.ip);
			});

			// Update only a subset of the peers to decrease the noise on the network.
			// Default is 20 peers. To be fined tuned. Node gets checked by a peer every 3s on average.
			// Maybe increasing schedule (every 60s right now).
			var maxUpdatePeers = library.config.peers.maxUpdatePeers || 20;
			if (peers.length > maxUpdatePeers) {
				peers = peers.slice(0, maxUpdatePeers);
			}

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

			library.logger.debug('Picked only: ' + peers.length);

			async.eachLimit(peers, 2, function (peer, cb) {
				library.scheme.validate(peer, {
					type: 'object',
					properties: {
						ip: {
							type: 'string'
						},
						port: {
							type: 'integer',
							minimum: 1,
							maximum: 65535
						},
						state: {
							type: 'integer',
							minimum: 0,
							maximum: 3
						},
						os: {
							type: 'string'
						},
						version: {
							type: 'string'
						}
					},
					required: ['ip', 'port', 'state']
				}, function (err) {
					if (err) {
						err.forEach(function (e) {
							library.logger.error('Rejecting invalid peer: ' + peer.ip + ' ' + e.path + ' ' + e.message);
						});

						return setImmediate(cb);
					} else {
						return self.update(peer, cb);
					}
				});
			}, cb);
		});
	});
};

__private.count = function (cb) {
	library.db.query(sql.count).then(function (rows) {
		var res = rows.length && rows[0].count;
		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return setImmediate(cb, 'Peer#count error');
	});
};

__private.banManager = function (cb) {
	library.db.query(sql.banManager, { now: Date.now() }).then(function (res) {
		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return setImmediate(cb, 'Peer#banManager error');
	});
};

__private.getByFilter = function (filter, cb) {
	var where = [];
	var params = {};

	if (filter.state) {
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

	if (filter.ip) {
		where.push('"ip" = ${ip}');
		params.ip = filter.ip;
	}

	if (filter.port) {
		where.push('"port" = ${port}');
		params.port = filter.port;
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

	var orderBy = OrderBy(
		filter.orderBy, {
			sortFields: sql.sortFields
		}
	);

	if (orderBy.error) {
		return setImmediate(cb, orderBy.error);
	}

	library.db.query(sql.getByFilter({
		where: where,
		sortField: orderBy.sortField,
		sortMethod: orderBy.sortMethod
	}), params).then(function (rows) {
		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return setImmediate(cb, 'Peer#getByFilter error');
	});
};

// Public methods
Peer.prototype.inspect = function (peer) {
	if (peer.ip) {
		peer.string = (peer.ip + ':' + peer.port || 'unknown');
	} else {
		peer.string = 'unknown';
	}
	peer.loopback = (__private.loopback.indexOf(peer.ip) >= 0);
	return peer;
};

Peer.prototype.accept = function (peer) {
	if (/^[0-9]+$/.test(peer.ip)) {
		peer.ip = ip.fromLong(peer.ip);
	}
	peer.port = parseInt(peer.port);

	if (!peer || !peer.ip || !peer.port) {
		throw 'Rejecting invalid peer data: ' + util.inspect(peer);
	} else if (!ip.isV4Format(peer.ip) && !ip.isV6Format(peer.ip)) {
		throw 'Rejecting peer with invalid ip address: ' + peer.ip;
	} else if (isNaN(peer.port) || peer.port === 0 || peer.port > 65535) {
		throw 'Rejecting peer with invalid port: ' + peer.port;
	} else {
		peer = this.inspect(peer);
		return peer;
	}
};

Peer.prototype.list = function (options, cb) {
	options.limit = options.limit || 100;

	library.db.query(sql.randomList(options), options).then(function (rows) {
		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return setImmediate(cb, 'Peer#list error');
	});
};

Peer.prototype.state = function (pip, port, state, timeoutSeconds, cb) {
	var isFrozenList = _.find(library.config.peers, function (peer) {
		return peer.ip === pip && peer.port === port;
	});
	if (isFrozenList !== undefined && cb) {
		return setImmediate(cb, 'Peer in white list');
	}
	var clock;
	if (state === 0) {
		clock = (timeoutSeconds || 1) * 1000;
		clock = Date.now() + clock;
	} else {
		clock = null;
	}
	library.db.query(sql.state, {
		state: state,
		clock: clock,
		ip: pip,
		port: port
	}).then(function (res) {
		return cb && setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb && setImmediate(cb);
	});
};

Peer.prototype.remove = function (pip, port, cb) {
	var isFrozenList = _.find(library.config.peers.list, function (peer) {
		return peer.ip === pip && peer.port === port;
	});
	if (isFrozenList !== undefined && cb) {
		return setImmediate(cb, 'Peer in white list');
	}
	removed.push(pip);
	library.db.query(sql.remove, {
		ip: pip,
		port: port
	}).then(function (res) {
		return cb && setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb && setImmediate(cb);
	});
};

Peer.prototype.addDapp = function (config, cb) {
	library.db.query(sql.getByIdPort, {
		ip: config.ip,
		port: config.port
	}).then(function (rows) {
		if (!rows.length) {
			return setImmediate(cb);
		}
		var peerId = rows[0].id;

		library.db.query(sql.addDapp, {
			dappId: config.dappid,
			peerId: peerId
		}).then(function (res) {
			return setImmediate(cb, null, res);
		}).catch(function (err) {
			library.logger.error(err.toString());
			return setImmediate(cb, 'Peer#addDapp error');
		});
	}).catch(function (err) {
		library.logger.error(err.toString());
		return setImmediate(cb, 'Peer#addDapp error');
	});
};

Peer.prototype.update = function (peer, cb) {
	var dappid = peer.dappid;
	var params = {
		ip: peer.ip,
		port: peer.port,
		os: peer.os || null,
		version: peer.version || null
	};

	async.series([
		function (cb) {
			library.db.query(sql.insert, extend({}, params, { state: 1 })).then(function (res) {
				return setImmediate(cb, null, res);
			}).catch(function (err) {
				library.logger.error(err.toString());
				return setImmediate(cb, 'Peer#update error');
			});
		},
		function (cb) {
			if (peer.state !== undefined) {
				params.state = peer.state;
			}
			library.db.query(sql.update(params), params).then(function (res) {
				return setImmediate(cb, null, res);
			}).catch(function (err) {
				library.logger.error(err.toString());
				return setImmediate(cb, 'Peer#update error');
			});
		},
		function (cb) {
			if (dappid) {
				self.addDapp({dappid: dappid, ip: peer.ip, port: peer.port}, cb);
			} else {
				return setImmediate(cb);
			}
		}
	], function (err) {
		if (err) {
			library.logger.error(err);
		}
		return cb && setImmediate(cb);
	});
};

Peer.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Peer.prototype.onBind = function (scope) {
	modules = scope;
};

Peer.prototype.onBlockchainReady = function () {
	async.eachSeries(library.config.peers.list, function (peer, cb) {
		library.db.query(sql.insertSeed, {
			ip: peer.ip,
			port: peer.port,
			state: 2
		}).then(function (res) {
			return setImmediate(cb, null, res);
		}).catch(function (err) {
			library.logger.error(err.toString());
			return setImmediate(cb, 'Peer#onBlockchainReady error');
		});
	}, function (err) {
		if (err) {
			library.logger.error(err);
		}

		__private.count(function (err, count) {
			if (count) {
				__private.updatePeerList(function (err) {
					if (err) {
						library.logger.error('Peer#updatePeerList error', err);
					}
					library.bus.message('peerReady');
				});
				library.logger.info('Peers ready, stored ' + count);
			} else {
				library.logger.warn('Peers list is empty');
			}
		});
	});
};

Peer.prototype.onPeerReady = function () {
	setImmediate(function nextUpdatePeerList () {
		__private.updatePeerList(function (err) {
			if (err) {
				library.logger.error('Peers timer:', err);
			}
			setTimeout(nextUpdatePeerList, 60 * 1000);
		});
	});

	setImmediate(function nextBanManager () {
		__private.banManager(function (err) {
			if (err) {
				library.logger.error('Ban manager timer:', err);
			}
			setTimeout(nextBanManager, 65 * 1000);
		});
	});
};

// Shared

shared.getPeers = function (req, cb) {
	var query = req.body;

	library.scheme.validate(query, {
		type: 'object',
		properties: {
			state: {
				type: 'integer',
				minimum: 0,
				maximum: 3
			},
			os: {
				type: 'string'
			},
			version: {
				type: 'string'
			},
			limit: {
				type: 'integer',
				minimum: 0,
				maximum: 100
			},
			orderBy: {
				type: 'string'
			},
			offset: {
				type: 'integer',
				minimum: 0
			},
			port: {
				type: 'integer',
				minimum: 1,
				maximum: 65535
			}
		}
	}, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		if (query.limit < 0 || query.limit > 100) {
			return setImmediate(cb, 'Invalid limit. Maximum is 100');
		}

		__private.getByFilter(query, function (err, peers) {
			if (err) {
				return setImmediate(cb, 'Peer not found');
			}

			return setImmediate(cb, null, {peers: peers});
		});
	});
};

shared.getPeer = function (req, cb) {
	var query = req.body;

	library.scheme.validate(query, {
		type: 'object',
		properties: {
			ip: {
				type: 'string',
				minLength: 1
			},
			port: {
				type: 'integer',
				minimum: 0,
				maximum: 65535
			}
		},
		required: ['ip', 'port']
	}, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		__private.getByFilter({
			ip: query.ip,
			port: query.port
		}, function (err, peers) {
			if (err) {
				return setImmediate(cb, 'Peer not found');
			}

			var peer = peers.length ? peers[0] : null;

			return setImmediate(cb, null, {peer: peer || {}});
		});
	});
};

shared.version = function (req, cb) {
	return setImmediate(cb, null, {version: library.config.version, build: library.build});
};

// Export
module.exports = Peer;
