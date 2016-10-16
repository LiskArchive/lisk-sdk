'use strict';

var extend = require('extend');
var ip = require('ip');

// Constructor
function Peer (peer) {
	return this.accept(peer || {});
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
	'height'
];

Peer.prototype.nullable = [
	'os',
	'version',
	'dappid',
	'broadhash',
	'height'
];

// Public methods
Peer.prototype.accept = function (peer) {
	if (/^[0-9]+$/.test(peer.ip)) {
		this.ip = ip.fromLong(peer.ip);
	} else {
		this.ip = peer.ip;
	}

	this.port = this.parseInt(peer.port, 0);

	if (this.ip) {
		this.string = (this.ip + ':' + this.port || 'unknown');
	} else {
		this.string = 'unknown';
	}

	if (peer.state != null) {
		this.state = peer.state;
	} else {
		this.state = 1;
	}

	if (peer.dappid != null) {
		this.dappid = peer.dappid;
	}

	this.headers(peer);
	return this;
};

Peer.prototype.parseInt = function (integer, fallback) {
	integer = parseInt(integer);
	integer = isNaN(integer) ? fallback : integer;

	return integer;
};

Peer.prototype.headers = function (headers) {
	headers = headers || {};

	headers.os = headers.os || 'unknown';
	headers.version = headers.version || '0.0.0';
	headers.port = this.parseInt(headers.port, 0);

	if (headers.height != null) {
		headers.height = this.parseInt(headers.height, 1);
	}

	this.nullable.forEach(function (property) {
		if (headers[property] != null) {
			this[property] = headers[property];
		} else {
			delete headers[property];
		}
	}.bind(this));

	return headers;
};

Peer.prototype.extend = function (object) {
	return this.headers(extend({}, this.object(), object));
};

Peer.prototype.object = function () {
	var object = {};

	this.properties.forEach(function (property) {
		object[property] = this[property];
	}.bind(this));

	if (object.broadhash != null) {
		object.broadhash = new Buffer(object.broadhash, 'hex');
	}

	this.nullable.forEach(function (property) {
		if (object[property] == null) {
			object[property] = null;
		}
	});

	return object;
};

// Export
module.exports = Peer;
