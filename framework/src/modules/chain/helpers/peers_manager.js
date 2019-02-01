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

const connect = require('../api/ws/rpc/connect');
const disconnect = require('../api/ws/rpc/disconnect');

/**
 * Description of the class.
 *
 * @class
 * @memberof helpers
 * @see Parent: {@link helpers}
 * @todo Add description for the class
 */
function PeersManager(logger) {
	this.peers = {};
	this.addressToNonceMap = {};
	this.nonceToAddressMap = {};
	this.logger = logger;
}

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @todo Add description for the params
 * @todo Add @returns tag
 */
PeersManager.prototype.add = function(peer) {
	// 1. do not add peers without address
	// 2. prevent changing address by the peer with same nonce
	if (
		!peer ||
		!peer.string ||
		(this.nonceToAddressMap[peer.nonce] &&
			peer.string !== this.nonceToAddressMap[peer.nonce])
	) {
		return false;
	}

	const existingPeer = this.peers[peer.string];

	if (existingPeer && existingPeer.socket) {
		peer.socket = existingPeer.socket;
	}
	this.peers[peer.string] = peer;

	if (peer.socket && peer.socket.active) {
		// Reconnect existing socket if it exists and is closed.
		// If it's already open then peer.socket.connect() will do nothing.
		peer.socket.connect();
	} else {
		// Create client WS connection to peer
		connect(peer, this.logger);
	}
	if (peer.nonce) {
		this.addressToNonceMap[peer.string] = peer.nonce;
		this.nonceToAddressMap[peer.nonce] = peer.string;
	}

	return true;
};

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @todo Add description for the params
 * @todo Add @returns tag
 */
PeersManager.prototype.remove = function(peer) {
	if (!peer || !this.peers[peer.string]) {
		return false;
	}
	const existingPeer = this.peers[peer.string];
	this.nonceToAddressMap[existingPeer.nonce] = null;
	delete this.nonceToAddressMap[existingPeer.nonce];

	this.addressToNonceMap[existingPeer.string] = null;
	delete this.addressToNonceMap[existingPeer.string];

	this.peers[existingPeer.string] = null;
	delete this.peers[existingPeer.string];

	disconnect(existingPeer);
	return true;
};

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @todo Add description for the params
 * @todo Add @returns tag
 */
PeersManager.prototype.getAll = function() {
	return this.peers;
};

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @todo Add description for the params
 * @todo Add @returns tag
 */
PeersManager.prototype.getByAddress = function(address) {
	return this.peers[address];
};

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @todo Add description for the params
 * @todo Add @returns tag
 */
PeersManager.prototype.getByNonce = function(nonce) {
	return this.peers[this.nonceToAddressMap[nonce]];
};

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @todo Add description for the params
 * @todo Add @returns tag
 */
PeersManager.prototype.getNonce = function(address) {
	return this.addressToNonceMap[address];
};

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @todo Add description for the params
 * @todo Add @returns tag
 */
PeersManager.prototype.getAddress = function(nonce) {
	return this.nonceToAddressMap[nonce];
};

module.exports = PeersManager;
