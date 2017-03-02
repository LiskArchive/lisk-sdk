'use strict';

var _ = require('lodash');
var ip = require('ip');

var self;

// Constructor
function Peer (peer) {
	self = this;
	return self.accept(peer || {});
}

// Public properties
Peer.prototype.properties = [
	'ip',
	'port',
	'state',
	'os',
	'version',
	'dappid',
	'broadhash',
	'height',
	'clock',
	'updated'
];

Peer.prototype.immutable = [
	'ip',
	'port',
	'string'
];

Peer.prototype.headers = [
	'os',
	'version',
	'dappid',
	'broadhash',
	'height'
];

Peer.prototype.nullable = [
	'os',
	'version',
	'dappid',
	'broadhash',
	'height',
	'clock',
	'updated'
];

// Public methods
Peer.prototype.accept = function (peer) {
	// Normalize peer data
	peer = self.normalize(peer);

	// Accept only supported and defined properties
	_.each(self.properties, function (key) {
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

Peer.prototype.normalize = function (peer) {
	if (peer.dappid && !Array.isArray(peer.dappid)) {
		var dappid = peer.dappid;
		peer.dappid = [];
		peer.dappid.push(dappid);
	}

	if (peer.height) {
		peer.height = self.parseInt(peer.height, 1);
	}

	peer.port = self.parseInt(peer.port, 0);

	if (!/^[0-2]{1}$/.test(peer.state)) {
		peer.state = 1;
	}

	return peer;
};

Peer.prototype.parseInt = function (integer, fallback) {
	integer = parseInt(integer);
	integer = isNaN(integer) ? fallback : integer;

	return integer;
};

Peer.prototype.applyHeaders = function (headers) {
	headers = headers || {};
	headers = self.normalize(headers);
	self.update(headers);
	return headers;
};

Peer.prototype.update = function (peer) {
	peer = self.normalize(peer);

	// Accept only supported properties
	_.each(self.properties, function (key) {
		// Change value only when is defined, also prevent release ban when banned peer connect to our node
		if (peer[key] !== null && peer[key] !== undefined && !(key === 'state' && this.state === 0 && peer.state === 2) && !_.includes(self.immutable, key)) {
			this[key] = peer[key];
		}
	}.bind(this));

	return this;
};

Peer.prototype.object = function () {
	var copy = {};

	_.each(self.properties, function (key) {
		copy[key] = this[key];
	}.bind(this));

	_.each(self.nullable, function (key) {
		if (!copy[key]) {
			copy[key] = null;
		}
	});

	return copy;
};

// Export
module.exports = Peer;
