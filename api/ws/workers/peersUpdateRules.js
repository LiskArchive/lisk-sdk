'use strict';

var connectionsTable = require('./connectionsTable');
var Z_schema = require('../../../helpers/z_schema');
var schema = require('../../../schema/transport');

var self, z_schema =  new Z_schema();

/**
 * @param {SlaveWAMPServer} slaveWAMPServer
 * @constructor
 */
function PeersUpdateRules (slaveWAMPServer) {
	this.slaveWAMPServer = slaveWAMPServer;
	self = this;
}

/**
 * Sends requests to main process with SocketCluster authKey attached
 * @param {string} procedureName
 * @param {Object} peer
 * @param {function} cb
 */
PeersUpdateRules.prototype.sendInternally = function (procedureName, peer, cb) {
	this.slaveWAMPServer.sendToMaster(procedureName, {peer: peer, authKey: this.slaveWAMPServer.worker.options.authKey}, peer.nonce, cb);
};

PeersUpdateRules.prototype.internal = {

	/**
	 * @throws {Error} if peer does not exist
	 * @throws {Error} if peer.nonce or connectionId is undefined/null/0
	 * @throws {Error} if peer registered connection before
	 * @throws {Error} if peer doesn't have nonce, height or broadhash fields
	 * @throws {Error} if error has been returned from main process
	 * @param {Object} peer
	 * @param {string} connectionId
	 * @param {function} cb
	 */
	insert: function (peer, connectionId, cb) {
		if (!peer || !peer.nonce) {
			return cb('Cannot insert peer without nonce');
		}
		if (connectionsTable.getConnectionId(peer.nonce)) {
			return cb('Peer with nonce ' + peer.nonce + ' is already inserted');
		}
		if (connectionsTable.connectionIdToNonceMap[connectionId]) {
			return cb('Connection id ' + connectionId + ' is already assigned');
		}
		try {
			connectionsTable.add(peer.nonce, connectionId);
			self.sendInternally('acceptPeer', peer, function (err) {
				if (err) {
					connectionsTable.remove(peer.nonce);
				}
				return cb(err);
			});
		} catch (ex) {
			return cb(ex);
		}
	},

	/**
	 * @throws {Error} if peer does not exist
	 * @throws {Error} if peer.nonce is undefined/null/0
	 * @throws {Error} if peer doesn't have a connection registered
	 * @throws {Error} if peer.nonce is different than assigned to given connection id
	 * @throws {Error} if error has been returned from main process
	 * @param {Object} peer
	 * @param {string} connectionId
	 * @param {function} cb
	 */
	remove: function (peer, connectionId, cb) {
		if (!peer || !peer.nonce) {
			return cb('Cannot remove peer without nonce');
		}
		if (!connectionsTable.getConnectionId(peer.nonce)) {
			return cb('Peer of nonce has no connection established');
		}
		if (!connectionId || connectionId !== connectionsTable.getConnectionId(peer.nonce)) {
			return cb('Attempt to remove peer from different or empty connection id');
		}
		try {
			connectionsTable.remove(peer.nonce);
			self.sendInternally('removePeer', peer, function (err) {
				if (err) {
					connectionsTable.add(peer.nonce, connectionId);
				}
				return cb(err);
			});
		} catch (ex) {
			return cb(ex);
		}
	}
};

PeersUpdateRules.prototype.external = {

	/**
	 * @param {Object} request - peer object with extra requests fields added by SlaveWAMPServer
	 * @param {Object} request.data - peer's data
	 * @param {string} request.socketId - connection id
	 * @param {string} request.workerId - worker id
	 * @param {function} cb
	 */
	update: function (request, cb) {
		z_schema.validate(request, schema.update, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}
			if (request.socketId !== connectionsTable.getConnectionId(request.data.nonce)) {
				return setImmediate(cb, 'Connection id did not match with corresponding peer');
			}
			self.sendInternally('acceptPeer', request.data, cb);
		});
	}
};

module.exports = PeersUpdateRules;
