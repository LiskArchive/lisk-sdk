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
	 * @throws {Error} if peer.nonce or connectionId is undefined/null/0
	 * @throws {Error} if peer registered connection before
	 * @throws {Error} if peer doesn't have nonce, height or broadhash fields
	 * @param {Object} peer
	 * @param {string} connectionId
	 * @param {function} cb
	 */
	insert: function (peer, connectionId, cb) {
		if (connectionsTable.getConnectionId(peer.nonce)) {
			throw new Error('Peer of nonce ' + peer.nonce +' is already inserted');
		}
		connectionsTable.add(peer.nonce, connectionId);
		self.sendInternally('acceptPeer', peer, cb);
	},

	/**
	 * @throws {Error} if peer.nonce is undefined/null/0
	 * @throws {Error} if peer doesn't have connection registered
	 * @throws {Error} if peer.nonce is different than assigned to given connection id
	 * @param {Object} peer
	 * @param {string} connectionId
	 * @param {function} cb
	 */
	remove: function (peer, connectionId, cb) {
		if (!connectionsTable.getConnectionId(peer.nonce)) {
			throw new Error('Peer of nonce has no connection established');
		}
		if (connectionId !== connectionsTable.getConnectionId(peer.nonce)) {
			throw new Error('Attempt to remove peer from different connection id');
		}
		self.sendInternally('removePeer', peer, function (err) {
			if (err) {
				return cb(err);
			}
			connectionsTable.remove(peer.nonce);
			return cb();
		});
	}
};

PeersUpdateRules.prototype.external = {

	/**
	 * @param {Object} request - peer object with extra requests fields added by SlaveWAMPServer
	 * @param {object} request.data - peer's data
	 * @param {string} request.socketId - connection id
	 * @param {string} request.workerId - worker id
	 * @param {function} cb
	 */
	update: function (request, cb) {
		console.log('update 1');
		z_schema.validate(request, schema.update, function (err) {
			if (err) {
				console.log('update err', err);
				return setImmediate(cb, err[0].message);
			}
			if (request.socketId !== connectionsTable.getConnectionId(request.data.nonce)) {
				throw new Error('Connection id did not match with corresponding peer');
			}
			console.log('invoke send update internally');
			self.sendInternally('acceptPeer', request.data, cb);
		});
	}
};

module.exports = PeersUpdateRules;
