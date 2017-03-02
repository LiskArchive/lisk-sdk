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
	if (/^[0-9]+$/.test(peer.ip)) {
		this.ip = ip.fromLong(peer.ip);
	} else {
		this.ip = peer.ip;
	}

	this.port = self.parseInt(peer.port, 0);

	if (this.ip && this.port) {
		this.string = this.ip + ':' + this.port;
	}

	if (/^[0-2]{1}$/.test(peer.state)) {
		this.state = peer.state;
	} else {
		this.state = 1;
	}

	if (peer.dappid) {
		if (Array.isArray(peer.dappid)) {
			this.dappid = peer.dappid;
		} else {
			this.dappid = [];
			this.dappid.push(peer.dappid);
		}
	}

	if (peer.height) {
		this.height = self.parseInt(peer.height, 1);
	}

	if (peer.clock) {
		this.clock = peer.clock;
	}

	return this;
};

Peer.prototype.parseInt = function (integer, fallback) {
	integer = parseInt(integer);
	integer = isNaN(integer) ? fallback : integer;

	return integer;
};

Peer.prototype.applyHeaders = function (headers) {
	headers = headers || {};

	if (headers.height) {
		headers.height = self.parseInt(headers.height, 1);
	}

	if (headers.port) {
		headers.port = self.parseInt(headers.port, 0);
	}

	_.each(headers, function (value, key) {
		if (_.includes(this.headers, key)) {
			this[key] = value;
		}
	}.bind(this));

	return headers;
};

Peer.prototype.update = function (object) {
	_.each(object, function (value, key) {
		// Change value only when is defined, also prevent release ban when banned peer connect to our node
		if (value !== null && value !== undefined && !(key === 'state' && this.state === 0 && object.state === 2)) {
			this[key] = value;
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

	if (!/^[0-2]{1}$/.test(this.state)) {
		copy.state = 1;
	}

	return copy;
};

// Export
module.exports = Peer;
