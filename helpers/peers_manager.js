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

	this.peers[peer.string] = peer;

	if (peer.socket) {
		// Reconnect existing socket
		peer.socket.connect();
	} else {
		// Create client WS connection to peer
		connect(peer, this.logger);
	}
	if (peer.nonce) {
		this.addressToNonceMap[peer.string] = peer.nonce;
		this.nonceToAddressMap[peer.nonce] = peer.string;
	} else if (this.addressToNonceMap[peer.string]) {
		delete this.addressToNonceMap[peer.string];
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
	this.nonceToAddressMap[peer.nonce] = null;
	delete this.nonceToAddressMap[peer.nonce];

	this.addressToNonceMap[peer.string] = null;
	delete this.addressToNonceMap[peer.string];

	this.peers[peer.string] = null;
	delete this.peers[peer.string];

	disconnect(peer);
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
