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

var Peer = require('../../../logic/peer');
var failureCodes = require('../rpc/failure_codes');
var PeerUpdateError = require('../rpc/failure_codes').PeerUpdateError;
var swaggerHelper = require('../../../helpers/swagger');
var connectionsTable = require('./connections_table');
var SlaveToMasterSender = require('./slave_to_master_sender');
var Rules = require('./rules');

var definitions = swaggerHelper.getSwaggerSpec().definitions;
var z_schema = swaggerHelper.getValidator();

var self;

/**
 * Secures peers updates. Used only by workers.
 *
 * @class
 * @memberof api.ws.workers
 * @see Parent: {@link api.ws.workers}
 * @requires api/ws/rpc/failureCodes
 * @requires api/ws/workers/connectionsTable
 * @requires api/ws/workers/rules
 * @requires api/ws/workers/slaveToMaster
 * @requires helpers/swagger
 * @requires helpers/z_schema
 * @requires logic/peer
 * @param {Object} slaveWAMPServer - Used to send verified update requests to master process
 */
function PeersUpdateRules(slaveWAMPServer) {
	this.slaveToMasterSender = new SlaveToMasterSender(slaveWAMPServer);
	this.rules = new Rules(this.insert, this.remove, this.block);
	self = this;
}

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @param {string} connectionId
 * @param {function} cb
 * @todo Add description for the function and the params
 * @todo Add @returns tag
 */
PeersUpdateRules.prototype.insert = function(peer, connectionId, cb) {
	try {
		connectionsTable.add(peer.nonce, connectionId);
		peer.state = Peer.STATE.CONNECTED;
		self.slaveToMasterSender.send(
			'updatePeer',
			Rules.UPDATES.INSERT,
			peer,
			err => {
				if (err) {
					connectionsTable.remove(peer.nonce);
					if (!err.code) {
						err = new PeerUpdateError(
							failureCodes.ON_MASTER.UPDATE.TRANSPORT,
							failureCodes.errorMessages[
								failureCodes.ON_MASTER.UPDATE.TRANSPORT
							],
							err
						);
					}
				}
				return setImmediate(cb, err);
			}
		);
	} catch (ex) {
		return setImmediate(cb, ex);
	}
};

/**
 * Description of the function.
 *
 * @param {Object} peer
 * @param {string} connectionId
 * @param {function} cb
 * @todo Add description for the function and the params
 * @todo Add @returns tag
 */
PeersUpdateRules.prototype.remove = function(peer, connectionId, cb) {
	try {
		connectionsTable.remove(peer.nonce);
		self.slaveToMasterSender.send(
			'updatePeer',
			Rules.UPDATES.REMOVE,
			peer,
			err => {
				if (err && !err.code) {
					connectionsTable.add(peer.nonce, connectionId);
					err = new PeerUpdateError(
						failureCodes.ON_MASTER.UPDATE.TRANSPORT,
						failureCodes.errorMessages[failureCodes.ON_MASTER.UPDATE.TRANSPORT],
						err
					);
				}
				return setImmediate(cb, err);
			}
		);
	} catch (ex) {
		return setImmediate(cb, ex);
	}
};

/**
 * Description of the function.
 *
 * @param {number} code
 * @param {Object} peer
 * @param {string} connectionId
 * @param {function} cb
 * @todo Add description for the function and the params
 * @todo Add @returns tag
 */
PeersUpdateRules.prototype.block = function(code, peer, connectionId, cb) {
	return setImmediate(
		cb,
		new PeerUpdateError(code, failureCodes.errorMessages[code])
	);
};

/**
 * Description of the object.
 */
PeersUpdateRules.prototype.internal = {
	/**
	 * Description of the function.
	 *
	 * @memberof api.ws.workers.PeersUpdateRules
	 * @param {number} updateType
	 * @param {Object} peer
	 * @param {string} connectionId
	 * @param {function} cb
	 * @todo Add description for the function and the params
	 * @todo Add @returns tag
	 */
	update(updateType, peer, connectionId, cb) {
		self.slaveToMasterSender.getPeer(peer.nonce, (err, onMasterPresence) => {
			if (err) {
				return setImmediate(
					cb,
					new PeerUpdateError(
						failureCodes.ON_MASTER.UPDATE.CHECK_PRESENCE,
						failureCodes.errorMessages[
							failureCodes.ON_MASTER.UPDATE.CHECK_PRESENCE
						],
						err
					)
				);
			}
			var isNoncePresent = !!connectionsTable.getNonce(connectionId);
			var isConnectionIdPresent = !!connectionsTable.getConnectionId(
				peer.nonce
			);

			self.rules.rules[updateType][isNoncePresent][isConnectionIdPresent][
				onMasterPresence
			](peer, connectionId, cb);
		});
	},
};

/**
 * Description of the object.
 */
PeersUpdateRules.prototype.external = {
	/**
	 * Description of the function.
	 *
	 * @memberof api.ws.workers.PeersUpdateRules
	 * @param {Object} request - Peer object with extra requests fields added by SlaveWAMPServer
	 * @param {Object} request.data - Peer data
	 * @param {string} request.socketId - Connection id
	 * @param {function} cb
	 * @todo Add description for the function and the params
	 * @todo Add @returns tag
	 */
	update(request, cb) {
		z_schema.validate(request, definitions.WSPeerUpdateRequest, err => {
			if (err) {
				return setImmediate(cb, err[0].message);
			}
			if (
				request.socketId !==
				connectionsTable.getConnectionId(request.data.nonce)
			) {
				return setImmediate(
					cb,
					new Error('Connection id does not match with corresponding peer')
				);
			}
			self.slaveToMasterSender.send(
				'updatePeer',
				Rules.UPDATES.INSERT,
				request.data,
				cb
			);
		});
	},
};

module.exports = PeersUpdateRules;
