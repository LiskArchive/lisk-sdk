'use strict';

var _ = require('lodash');
var async = require('async');
var Peer = require('../logic/peer.js');
var schema = require('../schema/peers.js');
var constants = require('../helpers/constants.js');

// Private fields
var __private = {};
var self;
var library;

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
		logger: logger,
	};
	self = this;
	__private.peers = {};
	__private.me = null;

	this.nonceToAddressMapper = {
		addressToNonceMap: {},
		nonceToAddressMap: {},

		addSafely: function (nonce, address) {
			//it is ok to assign nonce to new address but not new address to existing nonce
			if (this.nonceToAddressMap[nonce] && address && this.nonceToAddressMap[nonce] !== address) {
				throw new Error('Peer', address, 'attempts assign nonce of', this.nonceToAddressMap[nonce]);
			}
			if (address) {
				var oldNonce = this.addressToNonceMap[address];
				if (oldNonce && oldNonce !== nonce) {
					delete this.nonceToAddressMap;
				}
				this.addressToNonceMap[address] = nonce;
			}
			if (nonce) {
				this.nonceToAddressMap[nonce] = address;
			}
		},

		getAddress: function (nonce) {
			return this.nonceToAddressMap[nonce];
		},

		getNonce: function (address) {
			return this.addressToNonceMap[address];
		}
	};

	return setImmediate(cb, null, this);
}

Peers.prototype.me = function () {
	var me = _.extend(constants.getConst('headers'), {state: Peer.STATE.ACTIVE});
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

	var preferablyFromNonceAddress =
		self.nonceToAddressMapper.getAddress(peer.nonce) ||
		self.nonceToAddressMapper.getAddress(self.nonceToAddressMapper.getNonce(peer.string)) ||
		peer.string;

	return !!__private.peers[preferablyFromNonceAddress];
};

/**
 * Gets a peer from peers or creates a new one and returns it.
 * @param {peer} peer
 * @return {peer} peer new or peer from peers
 */
Peers.prototype.get = function (peer) {
	if (typeof peer === 'string') {
		return __private.peers[peer];
	} else {
		peer = self.create(peer);
		return __private.peers[peer.string];
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
			__private.peers[peer.string] = peer;
			library.logger.debug('Inserted new peer', peer.string);
			library.logger.trace('Inserted new peer', {peer: peer}, 'myself: ', self.me());
		}
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
	peer.string = peer.string || self.nonceToAddressMapper.getAddress(peer.nonce);
	if (!peer.string) {
		library.logger.warn('Upsert invalid peer rejected', {peer: peer});
		return false;
	}

	try {
		self.nonceToAddressMapper.addSafely(peer.nonce, peer.string);
	} catch (error) {
		library.logger.warn(error.message);
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
		if (peer.state === Peer.STATE.ACTIVE) {
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
 * Upserts peer with banned state `0` and clock with current time + seconds.
 * @param {string} pip - Peer ip
 * @param {number} port
 * @param {number} seconds
 * @return {function} Calls upsert
 */
Peers.prototype.ban = function (ip, port, seconds) {
	return self.upsert({
		ip: ip,
		port: port,
		// State 0 for banned peer
		state: 0,
		clock: Date.now() + (seconds || 1) * 1000
	});
};

/**
 * Upserts peer with unbanned state `1` and deletes clock.
 * @param {string} pip - Peer ip
 * @param {number} port
 * @param {number} seconds
 * @return {peer}
 */
Peers.prototype.unban = function (peer) {
	peer = self.get(peer);
	if (peer) {
		delete peer.clock;
		peer.state = Peer.STATE.DISCONNECTED;
		library.logger.debug('Released ban for peer', peer.string);
	} else {
		library.logger.debug('Failed to release ban for peer', {err: 'INVALID', peer: peer});
	}
	return peer;
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
		library.logger.debug('Removed peer', {peer: __private.peers[peer.string]});
		__private.peers[peer.string] = null; // Possible memory leak prevention
		delete __private.peers[peer.string];
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
		return Object.keys(__private.peers).map(function (key) { return __private.peers[key].object(); });
	} else {
		return Object.keys(__private.peers).map(function (key) { return __private.peers[key]; });
	}
};

// Public methods
/**
 * Modules are not required in this file.
 * @param {modules} scope - Loaded modules.
 */
Peers.prototype.bind = function (scope) {
};

// Export
module.exports = Peers;
