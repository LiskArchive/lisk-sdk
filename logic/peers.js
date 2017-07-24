'use strict';

var _ = require('lodash');
var async = require('async');
var Peer = require('../logic/peer.js');
var schema = require('../schema/peers.js');
var System = require('../modules/system.js');
var peersManager = require('../helpers/peersManager.js');

// Private fields
var __private = {};
var self;
var library;
var modules;

/**
 * Initializes library.
 * @memberof module:peers
 * @class
 * @classdesc Main peers logic.
 * @param {Object} logger
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} Callback function with `this` as data.
 */
// Constructor
function Peers (logger, cb) {
	library = {
		logger: logger
	};
	self = this;
	__private.me = null;

	this.peersManager = peersManager;

	return setImmediate(cb, null, this);
}

Peers.prototype.me = function () {
	var me = _.extend(System.getHeaders(), {state: Peer.STATE.CONNECTED});
	delete me.ip;
	return me;
};

/**
 * Returns a peer instance.
 * @param {peer} peer
 * @return {peer} peer instance
 */
Peers.prototype.create = function (peer) {
	if (!(peer instanceof Peer)) {
		return new Peer(peer);
	} else {
		return peer;
	}
};

/**
 * Checks if peer is in peers list.
 * @param {peer} peer
 * @return {boolean} True if peer is in peers list
 */
Peers.prototype.exists = function (peer) {
	peer = self.create(peer);
	return !!self.peersManager.getByAddress(peer.string);
};

/**
 * Gets a peer from peers or creates a new one and returns it.
 * @param {peer} peer
 * @return {peer} peer new or peer from peers
 */
Peers.prototype.get = function (peer) {
	if (typeof peer === 'string') {
		return self.peersManager.getByAddress(peer);
	} else {
		peer = self.create(peer);
		return self.peersManager.getByAddress(peer.string);
	}
};

/**
 * Inserts or updates a peer
 * @param {peer} peer
 * @param {boolean} insertOnly - true to only insert.
 * @return {boolean} True if operation is success.
 */
Peers.prototype.upsert = function (peer, insertOnly) {
	// Insert new peer
	var insert = function (peer) {
		if (!_.isEmpty(modules.peers.acceptable([peer]))) {
			peer.updated = Date.now();
			if (self.peersManager.add(peer)) {
				return library.logger.debug('Inserted new peer', peer.string);
			}
			library.logger.debug('Cannot insert peer (nonce exists / empty address field)', peer.string);
		} else {
			library.logger.debug('Rejecting unacceptable peer', peer.string);
		}
	};

	// Update existing peer
	var update = function (peer) {
		peer.updated = Date.now();

		var diff = {};
		_.each(peer, function (value, key) {
			if (key !== 'updated' && self.peersManager.getByAddress(peer.string)[key] !== value) {
				diff[key] = value;
			}
		});

		self.peersManager.getByAddress(peer.string).update(peer);

		if (Object.keys(diff).length) {
			library.logger.debug('Updated peer ' + peer.string, diff);
		} else {
			library.logger.trace('Peer not changed', peer.string);
		}
	};

	peer = self.create(peer);
	peer.string = peer.string || self.peersManager.getAddress(peer.nonce);

	if (!peer.string) {
		console.trace('Upsert invalid peer rejected', {peer: peer});
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
		if (peer.state === Peer.STATE.CONNECTED) {
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

/**
 * Deletes peer from peers list.
 * @param {peer} peer
 * @return {boolean} True if peer exists
 */
Peers.prototype.remove = function (peer) {
	peer = self.create(peer);
	// Remove peer if exists
	if (self.exists(peer)) {
		library.logger.info('Removed peer', peer.string);
		library.logger.debug('Removed peer', {peer: peer});
		self.peersManager.remove(peer);
		return true;
	} else {
		library.logger.debug('Failed to remove peer', {err: 'AREMOVED', peer: peer});
		return false;
	}
};

/**
 * Returns private list of peers
 * @param {boolean} [normalize] - If true transform list to object
 * @return {peer[]} list of peers
 */
Peers.prototype.list = function (normalize) {
	if (normalize) {
		return Object.keys(self.peersManager.addressToNonceMap).map(function (key) { return self.peersManager.getByAddress(key).object(); });
	} else {
		return Object.keys(self.peersManager.addressToNonceMap).map(function (key) { return self.peersManager.getByAddress(key); });
	}
};

// Public methods
/**
 * Modules are not required in this file.
 * @param {Object} __modules - Peers module.
 */
Peers.prototype.bindModules = function (__modules) {
	modules = {
		peers: __modules.peers
	};
};

// Export
module.exports = Peers;
