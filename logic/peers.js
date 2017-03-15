'use strict';

var _ = require('lodash');
var async = require('async');
var Peer = require('../logic/peer.js');
var schema = require('../schema/peers.js');

// Private fields
var __private = {};
var self;
var modules;
var library;

// Constructor
function Peers (scope, cb) {
	library = scope;
	self = this;
	__private.peers = {};
	return setImmediate(cb, null, this);
}

Peers.prototype.create = function (peer) {
	if (!(peer instanceof Peer)) {
		return new Peer(peer);
	} else {
		return peer;
	}
};

Peers.prototype.exists = function (peer) {
	peer = self.create(peer);
	return !!__private.peers[peer.string];
};

Peers.prototype.get = function (peer) {
	if (typeof peer === 'string') {
		return __private.peers[peer];
	} else {
		peer = self.create(peer);
		return __private.peers[peer.string];
	}
};

Peers.prototype.upsert = function (peer, insertOnly) {
	// Insert new peer
	var insert = function (peer) {
		peer.updated = Date.now();
		__private.peers[peer.string] = peer;

		library.logger.debug('Inserted new peer', peer.string);
		library.logger.trace('Inserted new peer', {peer: peer});
	};

	// Update existing peer
	var update = function (peer) {
		peer.updated = Date.now();

		var diff = {};
		_.each(peer, function (value, key) {
			if (key !== 'updated' && __private.peers[peer.string][key] !== value) {
				diff[key] = value;
			}
		});

		__private.peers[peer.string].update(peer);

		if (Object.keys(diff).length) {
			library.logger.debug('Updated peer ' + peer.string, diff);
		} else {
			library.logger.trace('Peer not changed', peer.string);
		}
	};

	peer = self.create(peer);
	
	if (!peer.string) {
		library.logger.warn('Upsert invalid peer rejected', {peer: peer});
		return false;
	}

	// Performing insert or update
	if (self.exists(peer)) {
		// Skip update if insert-only is forced
		if (!insertOnly) {
			update(peer);
		} else {
			return false;
		}
	} else {
		insert(peer);
	}

	// Stats for tracking changes
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

Peers.prototype.ban = function (ip, port, seconds) {
	return self.upsert({
		ip: ip,
		port: port,
		// State 0 for banned peer
		state: 0,
		clock: Date.now() + (seconds || 1) * 1000
	});
};

Peers.prototype.unban = function (peer) {
	peer = self.get(peer);
	if (peer) {
		delete peer.clock;
		peer.state = 1;
		library.logger.debug('Released ban for peer', peer.string);
	} else {
		library.logger.debug('Failed to release ban for peer', {err: 'INVALID', peer: peer});
	}
	return peer;
};

Peers.prototype.remove = function (peer) {
	peer = self.create(peer);
	// Remove peer if exists
	if (self.exists(peer)) {
		library.logger.info('Removed peer', peer.string);
		library.logger.debug('Removed peer', {peer: __private.peers[peer.string]});
		__private.peers[peer.string] = null; // Possible memory leak prevention
		delete __private.peers[peer.string];
		return true;
	} else {
		library.logger.debug('Failed to remove peer', {err: 'AREMOVED', peer: peer});
		return false;
	}
};

Peers.prototype.list = function (normalize) {
	if (normalize) {
		return Object.keys(__private.peers).map(function (key) { return __private.peers[key].object(); });
	} else {
		return Object.keys(__private.peers).map(function (key) { return __private.peers[key]; });
	}
};

// Public methods
Peers.prototype.bind = function (scope) {
	modules = scope.modules;
	library.logger.trace('Logic/Peers->bind');
};

// Export
module.exports = Peers;
