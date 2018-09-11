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
 * Description of the module.
 *
 * @module
 * @see Parent: {@link rpc}
 * @property {number} INVALID_HEADERS
 * @property {number} INCOMPATIBLE_NONCE
 * @property {number} INCOMPATIBLE_NETWORK
 * @property {number} INCOMPATIBLE_VERSION
 * @property {number} ALREADY_ADDED
 * @property {number} ALREADY_REMOVED
 * @property {number} DIFFERENT_CONN_ID
 * @property {number} HANDSHAKE_ERROR
 * @property {number} CONNECTION_TIMEOUT
 * @property {Object} ON_MASTER
 * @property {Object} ON_MASTER.UPDATE
 * @property {number} ON_MASTER.UPDATE.CHECK_PRESENCE
 * @property {number} ON_MASTER.UPDATE.INVALID_PEER
 * @property {number} ON_MASTER.UPDATE.TRANSPORT
 * @property {Object} ON_MASTER.REMOVE
 * @property {number} ON_MASTER.UPDATE.NOT_ON_LIST
 * @property {number} ON_MASTER.UPDATE.FROZEN_PEER
 * @property {Object} ON_MASTER.INSERT
 * @property {number} ON_MASTER.UPDATE.INSERT_ONLY_FAILURE
 * @property {number} ON_MASTER.UPDATE.NOT_ACCEPTED
 * @property {number} ON_MASTER.UPDATE.NONCE_EXISTS
 * @property {Object} errorMessages
 * @property {string} errorMessages.4100
 * @property {string} errorMessages.4101
 * @property {string} errorMessages.4102
 * @property {string} errorMessages.4103
 * @property {string} errorMessages.4104
 * @property {string} errorMessages.4105
 * @property {string} errorMessages.4106
 * @property {string} errorMessages.4107
 * @property {string} errorMessages.4108
 * @property {string} errorMessages.4200
 * @property {string} errorMessages.4201
 * @property {string} errorMessages.4210
 * @property {string} errorMessages.4211
 * @property {string} errorMessages.4230
 * @property {string} errorMessages.4231
 * @property {string} errorMessages.4232
 * @property {Object} PeerUpdateError
 * @todo Add description for the module and the properties
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
	BLACKLISTED_PEER: 4109,
	ON_MASTER: {
		UPDATE: {
			CHECK_PRESENCE: 4200,
			INVALID_PEER: 4201,
			TRANSPORT: 4202,
			BANNED: 4203,
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
	4109: 'Cannot connect - peer is blacklisted',
	4200: 'Failed to check if peer is already present',
	4201: 'Unable to match an address to the peer',
	4202: 'Transport error while invoking update procedure',
	4203: 'Attempt to update a state of banned peer',
	4210: 'Peer is not listed',
	4211: 'Attempting to remove a frozen peer',
	4230: 'Insert only update failed - peer is already listed',
	4231: 'Cannot accept a peer - private ip address or itself',
	4232: 'Attempting to insert a peer with nonce already listed',
};

/**
 * Description of the class.
 *
 * @class
 * @param {number} code
 * @param {string} message
 * @param {string} description
 * @todo Add description for the function and the params
 */
function PeerUpdateError(code, message, description) {
	this.code = code;
	this.message = message;
	this.description = description;
}

PeerUpdateError.prototype = new Error();

PeerUpdateError.prototype.toString = function() {
	return JSON.stringify({
		code: this.code,
		message: this.message,
		description: this.description,
	});
};

module.exports.PeerUpdateError = PeerUpdateError;
