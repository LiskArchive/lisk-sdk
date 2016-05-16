var async = require('async');
var util = require('util');
var ip = require('ip');
var Router = require('../helpers/router.js');
var extend = require('extend');
var fs = require('fs');
var path = require('path');
var sandboxHelper = require('../helpers/sandbox.js');
var _ = require('underscore');

// Private fields
var modules, library, self, private = {}, shared = {};

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

			var peers = data.body.peers;

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
	library.db.query("SELECT COUNT(*)::int FROM peers").then(function (rows) {
		var res = rows.length && rows[0].count;
		cb(null, res)
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Peer#count error");
	});
}

private.banManager = function (cb) {
	library.db.query("UPDATE peers SET \"state\" = 1, \"clock\" = null WHERE (\"state\" = 0 AND \"clock\" - ${now} < 0)", { now: Date.now() }).then(function (res) {
		return cb(null, res);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Peer#banManager error");
	});
}

private.getByFilter = function (filter, cb) {
	var sortFields = ["ip", "port", "state", "os", "version"];
	var sortMethod = '', sortBy = ''
	var limit = filter.limit || null;
	var offset = filter.offset || null;
	delete filter.limit;
	delete filter.offset;

	var where = [];
	var params = {};

	if (filter.hasOwnProperty('state') && filter.state !== null) {
		where.push("\"state\" = ${state}");
		params.state = filter.state;
	}

	if (filter.hasOwnProperty('os') && filter.os !== null) {
		where.push("\"os\" = ${os}");
		params.os = filter.os;
	}

	if (filter.hasOwnProperty('version') && filter.version !== null) {
		where.push("\"version\" = ${version}");
		params.version = filter.version;
	}

	if (filter.hasOwnProperty('ip') && filter.ip !== null) {
		where.push("\"ip\" = ${ip}");
		params.ip = filter.ip;
	}

	if (filter.hasOwnProperty('port') && filter.port !== null) {
		where.push("\"port\" = ${port}");
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

	if (limit !== null) {
		if (limit > 100) {
			return cb("Invalid limit. Maximum is 100");
		}
		params['limit'] = limit;
	}

	if (offset !== null) {
		params['offset'] = offset;
	}

	library.db.query("SELECT \"ip\", \"port\", \"state\", \"os\", \"version\" FROM peers" +
		(where.length ? (" WHERE " + where.join(" AND ")) : "") +
		(sortBy ? " ORDER BY " + sortBy + " " + sortMethod : "") + " " +
		(limit ? " LIMIT ${limit}" : "") +
		(offset ? " OFFSET ${offset} " : ""), params).then(function (rows) {
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

	library.db.query("SELECT p.\"ip\", p.\"port\", p.\"state\", p.\"os\", p.\"version\" FROM peers p " + (options.dappid ? " INNER JOIN peers_dapp AS pd ON p.\"id\" = pd.\"peerId\" AND pd.\"dappid\" = ${dappid} " : "") + " WHERE p.\"state\" > 0 ORDER BY RANDOM() LIMIT ${limit}", options).then(function (rows) {
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
	library.db.query("UPDATE peers SET \"state\" = ${state}, \"clock\" = ${clock} WHERE \"ip\" = ${ip} AND \"port\" = ${port};", {
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
	library.db.query("DELETE FROM peers WHERE \"ip\" = ${ip} AND \"port\" = ${port};", {
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
	library.db.query("SELECT \"id\" FROM peers WHERE \"ip\" = ${ip} AND \"port\" = ${port}", {
		ip: config.ip,
		port: config.port
	}).then(function (rows) {
		if (!rows.length) {
			return cb();
		}
		var peerId = rows[0].id;

		library.db.query("INSERT INTO peers_dapp (\"peerId\", \"dappid\") VALUES (${peerId}, ${dappId}) ON CONFLICT DO NOTHING;", {
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
			library.db.query("INSERT INTO peers (\"ip\", \"port\", \"state\", \"os\", \"version\") VALUES (${ip}, ${port}, ${state}, ${os}, ${version}) ON CONFLICT DO NOTHING;", extend({}, params, { state: 1 })).then(function (res) {
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
			library.db.query("UPDATE peers SET \"os\" = ${os}, \"version\" = ${version}" + (peer.state !== undefined ? ", \"state\" = CASE WHEN \"state\" = 0 THEN \"state\" ELSE ${state} END " : "") + " WHERE \"ip\" = ${ip} and \"port\" = ${port};", params).then(function (res) {
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
		library.db.query("INSERT INTO peers(\"ip\", \"port\", \"state\") VALUES(${ip}, ${port}, ${state}) ON CONFLICT DO NOTHING;", {
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
