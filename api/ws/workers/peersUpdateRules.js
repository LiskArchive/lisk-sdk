'use strict';

var connectionsTable = require('./connectionsTable');
var SlaveToMasterSender = require('./slaveToMasterSender');
var Rules = require('./rules');
var schema = require('../../../schema/transport');
var Z_schema = require('../../../helpers/z_schema');

var self, z_schema =  new Z_schema();

/**
 * Secures peers updates. Used only by workers.
 * @param {SlaveWAMPServer} slaveWAMPServer - used to send verified update requests to master process.
 * @constructor
 */
function PeersUpdateRules (slaveWAMPServer) {
	this.slaveToMasterSender = new SlaveToMasterSender(slaveWAMPServer);
	this.rules = new Rules(this.insert, this.remove, this.block);
	self = this;
}

/**
 * @param {Object} peer
 * @param {string} connectionId
 * @param {Function} cb
 */
PeersUpdateRules.prototype.insert = function (peer, connectionId, cb) {
	try {
		connectionsTable.add(peer.nonce, connectionId);
		self.slaveToMasterSender.send('acceptPeer', peer, function (err) {
			if (err) {
				connectionsTable.remove(peer.nonce);
			}
			return setImmediate(cb, err ? new Error(err) : null);
		});
	} catch (ex) {
		return setImmediate(cb, ex);
	}
};

/**
 * @param {Object} peer
 * @param {string} connectionId
 * @param {Function} cb
 */
PeersUpdateRules.prototype.remove = function (peer, connectionId, cb) {
	try {
		connectionsTable.remove(peer.nonce);
		self.slaveToMasterSender.send('removePeer', peer, function (err) {
			if (err) {
				connectionsTable.add(peer.nonce, connectionId);
			}
			return setImmediate(cb, err ? new Error(err) : null);
		});
	} catch (ex) {
		return setImmediate(cb, ex);
	}
};

/**
 * @param {Object} peer
 * @param {string} connectionId
 * @param {Function} cb
 */
PeersUpdateRules.prototype.block = function (peer, connectionId, cb) {
	return setImmediate(cb, new Error('Update peer action blocked - malicious behaviour detected'));
};

PeersUpdateRules.prototype.internal = {
	/**
	 * @param {number} updateType
	 * @param {Object} peer
	 * @param {string} connectionId
	 * @param {function} cb
	 */
	update: function (updateType, peer, connectionId, cb) {
		//ToDo: Peer headers and connectionId validation
		self.slaveToMasterSender.getPeer(peer.nonce, function (err, onMasterPresence) {
			if (err) {
				return setImmediate(cb, new Error('Update peer error - failed to check if peer is already added: ' + err));
			}
			var isNoncePresent = !!connectionsTable.getNonce(connectionId);
			var isConnectionIdPresent = !!connectionsTable.getConnectionId(peer.nonce);

			self.rules.rules[updateType][isNoncePresent][isConnectionIdPresent][onMasterPresence](peer, connectionId, cb);
		});
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
				return setImmediate(cb, new Error('Connection id does not match with corresponding peer'));
			}
			self.slaveToMasterSender.send('acceptPeer', request.data, cb);
		});
	}
};

module.exports = PeersUpdateRules;
