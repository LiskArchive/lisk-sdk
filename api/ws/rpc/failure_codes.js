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
 * Description of the object.
 *
 * @name failureCodes
 * @memberof api.ws.rpc.failureCodes
 * @see Parent: {@link api.ws.rpc}
 * @todo: Add description of the object
 */
module.exports = {
	INVALID_HEADERS: 4100,
	INCOMPATIBLE_NONCE: 4101,
	INCOMPATIBLE_NETWORK: 4102,
	INCOMPATIBLE_VERSION: 4103,
	ALREADY_ADDED: 4104,
	ALREADY_REMOVED: 4105,
	DIFFERENT_CONN_ID: 4106,
	HANDSHAKE_ERROR: 4107,
	CONNECTION_TIMEOUT: 4108,
	ON_MASTER: {
		UPDATE: {
			CHECK_PRESENCE: 4200,
			INVALID_PEER: 4201,
			TRANSPORT: 4202,
		},
		REMOVE: {
			NOT_ON_LIST: 4210,
			FROZEN_PEER: 4211,
		},
		INSERT: {
			INSERT_ONLY_FAILURE: 4230,
			NOT_ACCEPTED: 4231,
			NONCE_EXISTS: 4232,
		},
	},
};

/**
 * Description of the object.
 *
 * @name errorMessages
 * @memberof api.ws.rpc.failureCodes
 * @todo: Add description of the object
 */
module.exports.errorMessages = {
	4100: 'Invalid headers',
	4101: 'Request is made by itself',
	4102: 'Request is made on the wrong network',
	4103: 'Request is made from incompatible version',
	4104: 'Attempting to insert an already active peer',
	4105: 'Attempting to remove a non-existent peer',
	4106: 'Attempting to change peer data from different connection',
	4107: 'Cannot connect - handshake error',
	4108: 'Connection timeout exceeded',
	4200: 'Failed to check if peer is already present',
	4201: 'Unable to match an address to the peer',
	4202: 'Transport error while invoking update procedure',
	4210: 'Peer is not listed',
	4211: 'Attempting to remove a frozen peer',
	4230: 'Insert only update failed - peer is already listed',
	4231: 'Cannot accept a peer - private ip address or itself',
	4232: 'Attempting to insert a peer with nonce already listed',
};

/**
 * Description of the function.
 *
 * @class
 * @memberof api.ws.rpc.failureCodes
 * @param {number} code - Description of the param
 * @param {string} message - Description of the param
 * @param {string} description - Description of the param
 * @todo: Add description of the function and its parameters
 */
function PeerUpdateError(code, message, description) {
	this.code = code;
	this.message = message;
	this.description = description;
}

PeerUpdateError.prototype.toString = function() {
	return JSON.stringify({
		code: this.code,
		message: this.message,
		description: this.description,
	});
};

PeerUpdateError.prototype = new Error();

module.exports.PeerUpdateError = PeerUpdateError;
