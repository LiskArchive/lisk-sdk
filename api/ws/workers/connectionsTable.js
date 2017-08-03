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
 * @returns {string|undefined} returns matching connection id if an entry was added previously
 */
ConnectionsTable.prototype.getConnectionId = function (nonce) {
	return this.nonceToConnectionIdMap[nonce];
};

/**
 * Links peer (peer's nonce) with given connection id
 * @param {string} nonce
 * @param {string} connectionId
 */
ConnectionsTable.prototype.add = function (nonce, connectionId) {
	if (!nonce) {
		throw 'Cannot add connection table entry without nonce';
	}
	if (!connectionId) {
		throw 'Cannot add connection table entry without connectionId';
	}

	this.connectionIdToNonceMap[connectionId] = nonce;
	this.nonceToConnectionIdMap[nonce] = connectionId;
};

/**
 * Removes assignment a peer with connection id
 * @param {string} nonce
 */
ConnectionsTable.prototype.remove = function (nonce) {
	if (!nonce) {
		throw 'Cannot remove connection table entry without nonce';
	}
	var connectionId = this.getConnectionId(nonce);
	this.nonceToConnectionIdMap[nonce] = null;
	delete this.nonceToConnectionIdMap[nonce];
	this.connectionIdToNonceMap[connectionId] = null;
	delete this.connectionIdToNonceMap[connectionId];
};

module.exports = new ConnectionsTable();
