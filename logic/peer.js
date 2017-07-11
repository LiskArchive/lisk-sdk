'use strict';

var _ = require('lodash');
var ip = require('ip');
var wsRPC = require('../api/ws/rpc/wsRPC').wsRPC;

/**
 * Creates a peer.
 * @memberof module:peers
 * @class
 * @classdesc Main peer logic.
 * @implements {Peer.accept}
 * @param {peer} peer
 * @return calls accept method
 */
// Constructor
function Peer (peer) {

	Object.defineProperties(this, {
		rpc: {
			get: function () {
				return wsRPC.getClientRPCStub(this.ip, this.port);
			}.bind(this)
		}
	});

	return this.accept(peer || {});
}

/**
 * @typedef {Object} peer
 * @property {string} ip
 * @property {number} port - Between 1 and 65535
 * @property {number} state - Between 0 and 2. (banned = 0, unbanned = 1, active = 2)
 * @property {string} os - Between 1 and 64 chars
 * @property {string} version - Between 5 and 12 chars
 * @property {hash} broadhash
 * @property {number} height - Minimum 1
 * @property {Date} clock
 * @property {Date} updated
 * @property {string} nonce - Check this!
 * @property {string} string
 */
// Public properties
Peer.prototype.properties = [
	'ip',
	'port',
	'state',
	'os',
	'version',
	'broadhash',
	'height',
	'clock',
	'updated',
	'nonce',
	'httpPort'
];

Peer.prototype.immutable = [
	'ip',
	'port',
	'httpPort',
	'string'
];

Peer.prototype.headers = [
	'os',
	'version',
	'broadhash',
	'height',
	'nonce'
];

Peer.prototype.nullable = [
	'os',
	'version',
	'broadhash',
	'height',
	'clock',
	'updated'
];

Peer.STATE = {
	BANNED: 0,
	DISCONNECTED: 1,
	CONNECTED: 2
};

// Public methods
/**
 * Checks peer properties and adjusts according rules.
 * @param {peer} peer
 * @return {Object} this
 */
Peer.prototype.accept = function (peer) {
	// Normalize peer data
	peer = this.normalize(peer);

	// Accept only supported and defined properties
	_.each(this.properties, function (key) {
		if (peer[key] !== null && peer[key] !== undefined) {
			this[key] = peer[key];
		}
	}.bind(this));

	// Adjust properties according to rules
	if (/^[0-9]+$/.test(this.ip)) {
		this.ip = ip.fromLong(this.ip);
	}

	if (this.ip && this.port) {
		this.string = this.ip + ':' + this.port;
	}

	return this;
};

/**
 * Normalizes peer data.
 * @param {peer} peer
 * @return {peer}
 */
Peer.prototype.normalize = function (peer) {
	if (peer.height) {
		peer.height = this.parseInt(peer.height, 1);
	}

	peer.port = this.parseInt(peer.port, 0);
	peer.state = this.parseInt(peer.state, Peer.STATE.DISCONNECTED);

	return peer;
};

/**
 * Checks number or assigns default value from parameter.
 * @param {number} integer
 * @param {number} [fallback]
 * @return {number} if not integer returns fallback
 */
Peer.prototype.parseInt = function (integer, fallback) {
	integer = parseInt(integer);
	integer = isNaN(integer) ? fallback : integer;

	return integer;
};

/**
 * Normalizes headers
 * @param {Object} headers
 * @return {Object} headers normalized
 */
Peer.prototype.applyHeaders = function (headers) {
	headers = headers || {};
	headers = this.normalize(headers);
	this.update(headers);
	return headers;
};

/**
 * Updates peer values if mutable.
 * @param {peer} peer
 * @return {Object} this
 */
Peer.prototype.update = function (peer) {
	peer = this.normalize(peer);

	// Accept only supported properties
	_.each(this.properties, function (key) {
		// Change value only when is defined
		if (peer[key] !== null && peer[key] !== undefined && !_.includes(this.immutable, key)) {
			this[key] = peer[key];
		}
	}.bind(this));

	return this;
};

/**
 * @return {peer} clones current peer
 */
Peer.prototype.object = function () {
	var copy = {};

	_.each(this.properties, function (key) {
		copy[key] = this[key];
	}.bind(this));

	_.each(this.nullable, function (key) {
		if (!copy[key]) {
			copy[key] = null;
		}
	});

	delete copy.rpc;
	return copy;
};

// Export
module.exports = Peer;
