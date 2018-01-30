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

var connectionsTable = require('./connectionsTable');
var SlaveToMasterSender = require('./slaveToMasterSender');
var Rules = require('./rules');
var failureCodes = require('../../../api/ws/rpc/failureCodes');
var PeerUpdateError = require('../../../api/ws/rpc/failureCodes').PeerUpdateError;
var swaggerHelper = require('../../../helpers/swagger');
var definitions = swaggerHelper.getSwaggerSpec().definitions;
var z_schema =  swaggerHelper.getValidator();
var Peer = require('../../../logic/peer');
var Z_schema = require('../../../helpers/z_schema');

var self;

/**
 * Secures peers updates. Used only by workers.
 *
 * @class
 * @memberof api/ws.workers
 * @requires helpers/swagger
 * @requires helpers/z_schema
 * @requires logic/peer
 * @requires api/ws/rpc/failureCodes
 * @requires api/ws/workers/connectionsTable
 * @requires api/ws/workers/slaveToMaster
 * @requires api/ws/workers/rules
 * @param {Object} slaveWAMPServer - used to send verified update requests to master process
 */
function PeersUpdateRules (slaveWAMPServer) {
	this.slaveToMasterSender = new SlaveToMasterSender(slaveWAMPServer);
	this.rules = new Rules(this.insert, this.remove, this.block);
	self = this;
}

/**
 * Description.
 *
 * @param {Object} peer - Description
 * @param {string} connectionId - Description
 * @param {function} cb - Description
 * @todo: Add description of the functions and its parameters
 * @todo: Add returns-tag
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
 * Description.
 *
 * @param {Object} peer - Description
 * @param {string} connectionId - Description
 * @param {function} cb - Description
 * @todo: Add description of the functions and its parameters
 * @todo: Add returns-tag
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
 * Description.
 *
 * @param {number} code - Description
 * @param {Object} peer - Description
 * @param {string} connectionId - Description
 * @param {function} cb - Description
 * @todo: Add description of the functions and its parameters
 * @todo: Add returns-tag
 */
PeersUpdateRules.prototype.block = function (code, peer, connectionId, cb) {
	return setImmediate(cb, new PeerUpdateError(code, failureCodes.errorMessages[code]));
};


/**
 * Description.
 */
PeersUpdateRules.prototype.internal = {
	/**
	 * @memberof api/ws.workers.PeersUpdateRules
	 * @param {number} updateType - Description
	 * @param {Object} peer - Description
	 * @param {string} connectionId - Description
	 * @param {function} cb - Description
	 * @todo: Add description of the functions and its parameters
	 * @todo: Add returns-tag
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

/**
 * Description.
 *
 * @param {Object} request - peer object with extra requests fields added by SlaveWAMPServer
 * @param {Object} request.data - peer's data
 * @param {string} request.socketId - connection id
 * @param {string} request.workerId - worker id
 * @param {function} cb - Description
 * @todo: Add description of the functions and its parameters
 * @todo: Add returns-tag
 */
PeersUpdateRules.prototype.external = {
	update: function (request, cb) {
		z_schema.validate(request, definitions.WSPeerUpdateRequest, function (err) {
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
