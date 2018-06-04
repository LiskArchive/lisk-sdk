/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const _ = require('lodash');
const failureCodes = require('../api/ws/rpc/failure_codes.js');
const Peer = require('../logic/peer.js');
const System = require('../modules/system.js');
const PeersManager = require('../helpers/peers_manager.js');

// Private fields
let self;
let library;
let modules;

/**
 * Main peers logic. Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires lodash
 * @requires api/ws/rpc/failure_codes
 * @requires logic/peer
 * @requires modules/system
 * @requires helpers/peers_manager
 * @param {Object} logger
 * @param {function} cb - Callback function
 * @returns {SetImmediate} null, this
 * @todo Add description for the params
 */
class Peers {
	constructor(logger, cb) {
		library = {
			logger,
		};
		self = this;

		this.peersManager = new PeersManager(logger);

		return setImmediate(cb, null, this);
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Returns current peer state and system headers.
 *
 * @returns {Object} system headers and peer status
 */
Peers.prototype.me = function() {
	return Object.assign({}, System.getHeaders(), {
		state: Peer.STATE.CONNECTED,
	});
};

/**
 * Returns a peer instance.
 *
 * @param {peer} peer
 * @returns {peer} Peer instance
 * @todo Add description for the params
 */
Peers.prototype.create = function(peer) {
	if (!(peer instanceof Peer)) {
		return new Peer(peer);
	}
	return peer;
};

/**
 * Checks if peer is in peers list.
 *
 * @param {peer} peer
 * @returns {boolean} true - If peer is in peers list
 * @todo Add description for the params
 */
Peers.prototype.exists = function(peer) {
	peer = self.create(peer);
	return !!self.peersManager.getByAddress(peer.string);
};

/**
 * Gets a peer from peers or creates a new one and returns it.
 *
 * @param {peer} peer
 * @returns {peer} Found peer or new peer
 * @todo Add description for the params
 */
Peers.prototype.get = function(peer) {
	if (typeof peer === 'string') {
		return self.peersManager.getByAddress(peer);
	}
	peer = self.create(peer);
	return self.peersManager.getByAddress(peer.string);
};

/**
 * Inserts or updates a peer.
 *
 * @param {peer} peer
 * @param {boolean} insertOnly - True to only insert
 * @returns {boolean|number} true - If operation is success, error code in other case
 * @todo Add description for the params
 */
Peers.prototype.upsert = function(peer, insertOnly) {
	// Insert new peer
	const insert = function(peer) {
		peer.updated = Date.now();
		return self.peersManager.add(peer);
	};

	// Update existing peer
	const update = function(peer) {
		peer.updated = Date.now();
		const diff = {};

		const recentPeer = self.peersManager.getByAddress(peer.string);
		// Make a copy for logging difference purposes only
		const recentPeerBeforeUpdate = Object.assign({}, recentPeer);

		recentPeer.update(peer);
		self.peersManager.add(recentPeer);

		// Create a log after peer update to summarize updated fields
		_.each(recentPeer, (value, key) => {
			if (
				key !== 'updated' &&
				peer.properties.indexOf(key) !== -1 &&
				recentPeerBeforeUpdate[key] !== value
			) {
				diff[key] = value;
			}
		});

		if (Object.keys(diff).length) {
			library.logger.debug(`Updated peer ${peer.string}`, diff);
		} else {
			library.logger.trace('Peer not changed', peer.string);
		}
	};

	peer = self.create(peer);
	peer.string = peer.string || self.peersManager.getAddress(peer.nonce);

	if (!peer.string) {
		library.logger.trace('Upsert invalid peer rejected', { peer });
		return failureCodes.ON_MASTER.UPDATE.INVALID_PEER;
	}

	// Performing insert or update
	if (self.exists(peer)) {
		// Skip update if insert-only is forced
		if (!insertOnly) {
			update(peer);
		} else {
			return failureCodes.ON_MASTER.INSERT.INSERT_ONLY_FAILURE;
		}
	} else {
		if (_.isEmpty(modules.peers.acceptable([peer]))) {
			library.logger.debug('Rejecting unacceptable peer', peer.string);
			return failureCodes.ON_MASTER.INSERT.NOT_ACCEPTED;
		}
		if (insert(peer)) {
			library.logger.debug('Inserted new peer', peer.string);
		} else {
			library.logger.debug(
				'Cannot insert peer (nonce exists / empty address field)',
				peer.string
			);
			return failureCodes.ON_MASTER.INSERT.NONCE_EXISTS;
		}
	}

	// Stats for tracking changes
	let cnt_total = 0;
	let cnt_active = 0;
	let cnt_empty_height = 0;
	let cnt_empty_broadhash = 0;

	_.each(self.peersManager.peers, peer => {
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

	library.logger.trace('Peer stats', {
		total: cnt_total,
		alive: cnt_active,
		empty_height: cnt_empty_height,
		empty_broadhash: cnt_empty_broadhash,
	});

	return true;
};

/**
 * Deletes peer from peers list.
 *
 * @param {peer} peer
 * @returns {boolean|number} true - If peer exists, error code in other case
 * @todo Add description for the params
 */
Peers.prototype.remove = function(peer) {
	peer = self.create(peer);
	// Remove peer if exists
	if (self.exists(peer)) {
		library.logger.info('Removed peer', peer.string);
		library.logger.debug('Removed peer', { peer: peer.object() });
		self.peersManager.remove(peer);
		return true;
	}
	library.logger.debug('Failed to remove peer', {
		err: 'AREMOVED',
		peer: peer.object(),
	});
	return failureCodes.ON_MASTER.REMOVE.NOT_ON_LIST;
};

/**
 * Returns private list of peers.
 *
 * @param {boolean} [normalize] - If true transform list to object
 * @returns {peer[]} List of peers
 */
Peers.prototype.list = function(normalize) {
	if (normalize) {
		return Object.keys(self.peersManager.peers).map(key =>
			self.peersManager.getByAddress(key).object()
		);
	}
	return Object.keys(self.peersManager.peers).map(key =>
		self.create(self.peersManager.getByAddress(key))
	);
};

/**
 * Returns a random list of connected peers.
 *
 * @param {Object} [options] - Optional
 * @param {number} [options.limit] - Maximum number of peers to get; defaults to all
 * @returns {peer[]} List of peers
 */
Peers.prototype.listRandomConnected = function(options) {
	options = options || {};
	const peerList = Object.keys(self.peersManager.peers)
		.map(key => self.peersManager.peers[key])
		.filter(peer => peer.state === Peer.STATE.CONNECTED);
	const shuffledPeerList = _.shuffle(peerList);
	return options.limit ? shuffledPeerList.slice(0, options.limit)
		: shuffledPeerList;
};

/**
 * Modules are not required in this file.
 *
 * @param {Object} __modules - Peers module
 */
Peers.prototype.bindModules = function(__modules) {
	modules = {
		peers: __modules.peers,
	};
};

// Export
module.exports = Peers;
