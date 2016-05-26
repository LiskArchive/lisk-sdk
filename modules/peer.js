var async = require('async');
var util = require('util');
var ip = require('ip');
var Router = require('../helpers/router.js');
var extend = require('extend');
var fs = require('fs');
var path = require('path');
var sandboxHelper = require('../helpers/sandbox.js');
var sql = require('../sql/peer.js');
var _ = require('underscore');

// Private fields
var modules, library, self, private = {}, shared = {};

// List of peers not behaving well
// reset when we restart
var removed = [];

private.loopback = ["0.0.0.0", "127.0.0.1"];

// Constructor
function Peer(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;
	private.attachApi();

	setImmediate(cb, null, self);
}

// Private methods
private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) return next();
		res.status(500).send({success: false, error: "Blockchain is loading"});
	});

	router.map(shared, {
		"get /": "getPeers",
		"get /version": "version",
		"get /get": "getPeer"
	});

	router.use(function (req, res) {
		res.status(500).send({success: false, error: "API endpoint not found"});
	});

	library.network.app.use('/api/peers', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
}

private.updatePeerList = function (cb) {
	modules.transport.getFromRandomPeer({
		api: '/list',
		method: 'GET'
	}, function (err, data) {
		if (err) {
			return cb();
		}

		var report = library.scheme.validate(data.body.peers, {type: "array", required: true, uniqueItems: true});
		library.scheme.validate(data.body, {
			type: "object",
			properties: {
				peers: {
					type: "array",
					uniqueItems: true
				}
			},
			required: ['peers']
		}, function (err) {
			if (err) {
				return cb();
			}

			// Removing nodes not behaving well
			library.logger.debug("Removed peers list size: " + removed.length);
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

			library.logger.debug("Picked only: " + peers.length);

			async.eachLimit(peers, 2, function (peer, cb) {

				library.scheme.validate(peer, {
					type: "object",
					properties: {
						ip: {
							type: "string"
						},
						port: {
							type: "integer",
							minimum: 1,
							maximum: 65535
						},
						state: {
							type: "integer",
							minimum: 0,
							maximum: 3
						},
						os: {
							type: "string"
						},
						version: {
							type: "string"
						}
					},
					required: ['ip', 'port', 'state']
				}, function (err) {
					if (err) {
						err.forEach(function (e) {
							library.logger.error("Rejecting invalid peer: " + peer.ip + " " + e.path + " " + e.message);
						});

						return setImmediate(cb);
					} else {
						return self.update(peer, cb);
					}
				});
			}, cb);
		});
	});
}

private.count = function (cb) {
	library.db.query(sql.count).then(function (rows) {
		var res = rows.length && rows[0].count;
		cb(null, res)
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Peer#count error");
	});
}

private.banManager = function (cb) {
	library.db.query(sql.banManager, { now: Date.now() }).then(function (res) {
		return cb(null, res);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Peer#banManager error");
	});
}

private.getByFilter = function (filter, cb) {
	var sortFields = sql.sortFields;
	var sortMethod = '', sortBy = ''

	var fields = [];
	var params = {};

	if (filter.hasOwnProperty('state') && filter.state !== null) {
		fields.push('"state" = ${state}');
		params.state = filter.state;
	}

	if (filter.hasOwnProperty('os') && filter.os !== null) {
		fields.push('"os" = ${os}');
		params.os = filter.os;
	}

	if (filter.hasOwnProperty('version') && filter.version !== null) {
		fields.push('"version" = ${version}');
		params.version = filter.version;
	}

	if (filter.hasOwnProperty('ip') && filter.ip !== null) {
		fields.push('"ip" = ${ip}');
		params.ip = filter.ip;
	}

	if (filter.hasOwnProperty('port') && filter.port !== null) {
		fields.push('"port" = ${port}');
		params.port = filter.port;
	}

	if (filter.hasOwnProperty('orderBy')) {
		var sort = filter.orderBy.split(':');
		sortBy = sort[0].replace(/[^\w\s]/gi, '');

		if (sort.length == 2) {
			sortMethod = sort[1] == 'desc' ? 'DESC' : 'ASC'
		} else {
			sortMethod = 'DESC';
		}
	}

	if (sortBy) {
		if (sortFields.indexOf(sortBy) < 0) {
			return cb("Invalid sort field");
		} else {
			sortBy = '"' + sortBy + '"';
		}
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
		return cb("Invalid limit. Maximum is 100");
	}

	library.db.query(sql.getByFilter({
		fields: fields,
		sortBy: sortBy,
		sortMethod: sortMethod
	}), params).then(function (rows) {
		cb(null, rows);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Peer#getByFilter error");
	});
}

// Public methods
Peer.prototype.inspect = function (peer) {
	if (peer.ip) {
		peer.string = (peer.ip + ":" + peer.port || "unknown");
	} else {
		peer.string = 'unknown';
	}
	peer.loopback = (private.loopback.indexOf(peer.ip) >= 0);
	return peer;
}

Peer.prototype.accept = function (peer) {
	if (/^[0-9]+$/.test(peer.ip)) {
		peer.ip = ip.fromLong(peer.ip);
	}
	peer.port = parseInt(peer.port);

	if (!peer || !peer.ip || !peer.port) {
		throw "Rejecting invalid peer data: " + util.inspect(peer);
	} else if (!ip.isV4Format(peer.ip) && !ip.isV6Format(peer.ip)) {
		throw "Rejecting peer with invalid ip address: " + peer.ip;
	} else if (isNaN(peer.port) || peer.port == 0 || peer.port > 65535) {
		throw "Rejecting peer with invalid port: " + peer.port;
	} else {
		peer = this.inspect(peer);
		return peer;
	}
}

Peer.prototype.list = function (options, cb) {
	options.limit = options.limit || 100;

	library.db.query(sql.randomList(options), options).then(function (rows) {
		cb(null, rows);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Peer#list error");
	});
}

Peer.prototype.state = function (pip, port, state, timeoutSeconds, cb) {
	var isFrozenList = _.find(library.config.peers, function (peer) {
		return peer.ip == pip && peer.port == port;
	});
	if (isFrozenList !== undefined) return cb && cb("Peer in white list");
	if (state == 0) {
		var clock = (timeoutSeconds || 1) * 1000;
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
		return cb && cb(null, res);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb && cb();
	});
}

Peer.prototype.remove = function (pip, port, cb) {
	var isFrozenList = _.find(library.config.peers.list, function (peer) {
		return peer.ip == pip && peer.port == port;
	});
	if (isFrozenList !== undefined) return cb && cb("Peer in white list");
	removed.push(pip);
	library.db.query(sql.remove, {
		ip: pip,
		port: port
	}).then(function (res) {
		return cb && cb(null, res);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb && cb();
	});
}

Peer.prototype.addDapp = function (config, cb) {
	library.db.query(sql.getByIdPort, {
		ip: config.ip,
		port: config.port
	}).then(function (rows) {
		if (!rows.length) {
			return cb();
		}
		var peerId = rows[0].id;

		library.db.query(sql.addDapp, {
			dappId: config.dappid,
			peerId: peerId
		}).then(function (res) {
			return cb(null, res);
		}).catch(function (err) {
			library.logger.error(err.toString());
			return cb("Peer#addDapp error");
		});
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Peer#addDapp error");
	});
}

Peer.prototype.update = function (peer, cb) {
	var dappid = peer.dappid;
	var params = {
		ip: peer.ip,
		port: peer.port,
		os: peer.os || null,
		version: peer.version || null
	}

	async.series([
		function (cb) {
			library.db.query(sql.insert, extend({}, params, { state: 1 })).then(function (res) {
				return cb(null, res);
			}).catch(function (err) {
				library.logger.error(err.toString());
				return cb("Peer#update error");
			});
		},
		function (cb) {
			if (peer.state !== undefined) {
				params.state = peer.state;
			}
			library.db.query(sql.update(params), params).then(function (res) {
				return cb(null, res);
			}).catch(function (err) {
				library.logger.error(err.toString());
				return cb("Peer#update error");
			});
		},
		function (cb) {
			if (dappid) {
				self.addDapp({dappid: dappid, ip: peer.ip, port: peer.port}, cb);
			} else {
				setImmediate(cb);
			}
		}
	], function (err) {
		err && library.logger.error(err);
		cb && cb();
	})
}

Peer.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Peer.prototype.onBind = function (scope) {
	modules = scope;
}

Peer.prototype.onBlockchainReady = function () {
	async.eachSeries(library.config.peers.list, function (peer, cb) {
		library.db.query(sql.insertSeed, {
			ip: peer.ip,
			port: peer.port,
			state: 2
		}).then(function (res) {
			return cb(null, res);
		}).catch(function (err) {
			library.logger.error(err.toString());
			return cb("Peer#onBlockchainReady error");
		});
	}, function (err) {
		if (err) {
			library.logger.error(err);
		}

		private.count(function (err, count) {
			if (count) {
				private.updatePeerList(function (err) {
					err && library.logger.error('Peer#updatePeerList error', err);
					library.bus.message('peerReady');
				})
				library.logger.info('Peers ready, stored ' + count);
			} else {
				library.logger.warn('Peers list is empty');
			}
		});
	});
}

Peer.prototype.onPeerReady = function () {
	setImmediate(function nextUpdatePeerList() {
		private.updatePeerList(function (err) {
			err && library.logger.error('Peers timer:', err);
			setTimeout(nextUpdatePeerList, 60 * 1000);
		})
	});

	setImmediate(function nextBanManager() {
		private.banManager(function (err) {
			err && library.logger.error('Ban manager timer:', err);
			setTimeout(nextBanManager, 65 * 1000)
		});
	});
}

// Shared

shared.getPeers = function (req, cb) {
	var query = req.body;

	library.scheme.validate(query, {
		type: "object",
		properties: {
			state: {
				type: "integer",
				minimum: 0,
				maximum: 3
			},
			os: {
				type: "string"
			},
			version: {
				type: "string"
			},
			limit: {
				type: "integer",
				minimum: 0,
				maximum: 100
			},
			orderBy: {
				type: "string"
			},
			offset: {
				type: "integer",
				minimum: 0
			},
			port: {
				type: "integer",
				minimum: 1,
				maximum: 65535
			}
		}
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		if (query.limit < 0 || query.limit > 100) {
			return cb("Invalid limit. Maximum is 100");
		}

		private.getByFilter(query, function (err, peers) {
			if (err) {
				return cb("Peer not found");
			}

			cb(null, {peers: peers});
		});
	});
}

shared.getPeer = function (req, cb) {
	var query = req.body;

	library.scheme.validate(query, {
		type: "object",
		properties: {
			ip: {
				type: "string",
				minLength: 1
			},
			port: {
				type: "integer",
				minimum: 0,
				maximum: 65535
			}
		},
		required: ['ip', 'port']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		private.getByFilter({
			ip: query.ip,
			port: query.port
		}, function (err, peers) {
			if (err) {
				return cb("Peer not found");
			}

			var peer = peers.length ? peers[0] : null;

			cb(null, {peer: peer || {}});
		});
	});
}

shared.version = function (req, cb) {
	cb(null, {version: library.config.version, build: library.build});
}

// Export
module.exports = Peer;
