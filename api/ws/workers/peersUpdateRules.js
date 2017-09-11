'use strict';

var connectionsTable = require('./connectionsTable');
var SlaveToMasterSender = require('./slaveToMasterSender');
var Rules = require('./rules');
var schema = require('../../../schema/transport');
var failureCodes = require('../../../api/ws/rpc/failureCodes');
var PeerUpdateError = require('../../../api/ws/rpc/failureCodes').PeerUpdateError;
var Peer = require('../../../logic/peer');
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
		peer.state = Peer.STATE.CONNECTED;
		self.slaveToMasterSender.send('updatePeer', Rules.UPDATES.INSERT, peer, function (err) {
			if (err) {
				connectionsTable.remove(peer.nonce);
				if (!err.code) {
					err = new PeerUpdateError(failureCodes.ON_MASTER.UPDATE.TRANSPORT, failureCodes.errorMessages[failureCodes.ON_MASTER.UPDATE.TRANSPORT], err);
				}
			}
			return setImmediate(cb, err);
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
		self.slaveToMasterSender.send('updatePeer', Rules.UPDATES.REMOVE, peer, function (err) {
			if (err && !err.code) {
				connectionsTable.add(peer.nonce, connectionId);
				err = new PeerUpdateError(failureCodes.ON_MASTER.UPDATE.TRANSPORT, failureCodes.errorMessages[failureCodes.ON_MASTER.UPDATE.TRANSPORT], err);
			}
			return setImmediate(cb, err);
		});
	} catch (ex) {
		return setImmediate(cb, ex);
	}
};

/**
 * @param {number} code
 * @param {Object} peer
 * @param {string} connectionId
 * @param {Function} cb
 */
PeersUpdateRules.prototype.block = function (code, peer, connectionId, cb) {
	return setImmediate(cb, new PeerUpdateError(code, failureCodes.errorMessages[code]));
};

PeersUpdateRules.prototype.internal = {
	/**
	 * @param {number} updateType
	 * @param {Object} peer
	 * @param {string} connectionId
	 * @param {function} cb
	 */
	update: function (updateType, peer, connectionId, cb) {
		self.slaveToMasterSender.getPeer(peer.nonce, function (err, onMasterPresence) {
			if (err) {
				return setImmediate(cb, new PeerUpdateError(
					failureCodes.ON_MASTER.UPDATE.CHECK_PRESENCE,
					failureCodes.errorMessages[failureCodes.ON_MASTER.UPDATE.CHECK_PRESENCE],
					err));
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
			self.slaveToMasterSender.send('updatePeer', Rules.UPDATES.INSERT, request.data, cb);
		});
	}
};

module.exports = PeersUpdateRules;
