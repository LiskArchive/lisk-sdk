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

/**
 * ConnectionsTable - Stores connection (socket) ids and matches them with peer's nonces.
 *
 * @class
 * @memberof api.ws.workers
 * @see Parent: {@link api.ws.workers}
 */
function ConnectionsTable() {
	this.connectionIdToNonceMap = {};
	this.nonceToConnectionIdMap = {};
}

/**
 * Description of the function.
 *
 * @param {string} connectionId
 * @returns {string|undefined} Matching nonce if an entry was added previously
 * @todo Add description for the function and the params
 */
ConnectionsTable.prototype.getNonce = function(connectionId) {
	return this.connectionIdToNonceMap[connectionId];
};

/**
 * Description of the function.
 *
 * @param {string} nonce
 * @returns {string|undefined} Matching connectionId if an entry was added previously
 * @todo Add description for the function and the params
 */
ConnectionsTable.prototype.getConnectionId = function(nonce) {
	return this.nonceToConnectionIdMap[nonce];
};

/**
 * Links peer via nonce with given connectionId.
 *
 * @param {string} nonce
 * @param {string} connectionId
 * @todo Add description for the params
 */
ConnectionsTable.prototype.add = function(nonce, connectionId) {
	if (!nonce) {
		throw new Error('Cannot add connection table entry without nonce');
	}
	if (!connectionId) {
		throw new Error('Cannot add connection table entry without connectionId');
	}

	this.connectionIdToNonceMap[connectionId] = nonce;
	this.nonceToConnectionIdMap[nonce] = connectionId;
};

/**
 * Removes a peer with assigned connectionId.
 *
 * @param {string} nonce
 * @todo Add description for the params
 */
ConnectionsTable.prototype.remove = function(nonce) {
	if (!nonce) {
		throw new Error('Cannot remove connection table entry without nonce');
	}
	var connectionId = this.getConnectionId(nonce);
	this.nonceToConnectionIdMap[nonce] = null;
	delete this.nonceToConnectionIdMap[nonce];
	this.connectionIdToNonceMap[connectionId] = null;
	delete this.connectionIdToNonceMap[connectionId];
};

module.exports = new ConnectionsTable();
