'use strict';

/**
 * ConnectionsTable - stores connection (socket) ids and matches them with peer's nonces
 * @constructor
 */
function ConnectionsTable () {
	this.connectionIdToNonceMap = {};
	this.nonceToConnectionIdMap = {};
}

/**
 * @param {string} connectionId
 * @returns {string|undefined} returns matching nonce if an entry was added previously
 */
ConnectionsTable.prototype.getNonce = function (connectionId) {
	return this.connectionIdToNonceMap[connectionId];
};

/**
 * @param {string} nonce
 * @returns {string|undefined} returns matching connectionId if an entry was added previously
 */
ConnectionsTable.prototype.getConnectionId = function (nonce) {
	return this.nonceToConnectionIdMap[nonce];
};

/**
 * Links peer via nonce with given connectionId
 * @param {string} nonce
 * @param {string} connectionId
 */
ConnectionsTable.prototype.add = function (nonce, connectionId) {

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
 * Removes a peer with assigned connectionId
 * @param {string} nonce
 */
ConnectionsTable.prototype.remove = function (nonce) {
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
