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

const _ = require('lodash');
const ip = require('ip');

/**
 * Main peer logic. Creates a peer.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires lodash
 * @requires ip
 * @requires api/ws/rpc/ws_rpc
 * @param {peer} peer
 * @returns Calls accept method
 * @todo Add description for the params
 */
class Peer {
	constructor(peer) {
		return this.accept(peer || {});
	}

	/**
	 * Checks peer properties and adjusts according rules.
	 *
	 * @param {peer} peer
	 * @returns {Object} this
	 * @todo Add description for the params
	 */
	accept(peer) {
		// Normalize peer data
		peer = this.normalize(peer);

		// Accept only supported and defined properties
		_.each(this.properties, key => {
			if (peer[key] !== null && peer[key] !== undefined) {
				this[key] = peer[key];
			}
		});

		// Adjust properties according to rules
		if (/^[0-9]+$/.test(this.ip)) {
			this.ip = ip.fromLong(this.ip);
		}

		if (this.ip && this.wsPort) {
			this.string = `${this.ip}:${this.wsPort}`;
		}

		return this;
	}

	/**
	 * Normalizes peer data.
	 *
	 * @param {peer} peer
	 * @returns {peer}
	 * @todo Add description for the params
	 */
	normalize(peer) {
		if (peer.height) {
			peer.height = this.parseInt(peer.height, 1);
		}

		peer.wsPort = this.parseInt(peer.wsPort, 0);

		if (peer.httpPort != null) {
			peer.httpPort = this.parseInt(peer.httpPort, 0);
		}
		peer.state = this.parseInt(peer.state, Peer.STATE.DISCONNECTED);

		return peer;
	}

	/**
	 * Normalizes headers.
	 *
	 * @param {Object} headers
	 * @returns {Object} Normalized headers
	 * @todo Add description for the params
	 */
	applyHeaders(headers) {
		headers = headers || {};
		headers = this.normalize(headers);
		this.update(headers);
		return headers;
	}

	/**
	 * Updates peer values if mutable.
	 *
	 * @param {peer} peer
	 * @returns {Object} this
	 * @todo Add description for the params
	 */
	update(peer) {
		peer = this.normalize(peer);

		// Accept only supported properties
		_.each(this.properties, key => {
			// Change value only when is defined
			if (peer[key] && !this.required.includes(key)) {
				// Update optional httpPort and nonce
				// for the first time when peer object
				// has httpPort and nonce as undefined
				const isOptional = this.optional.includes(key);
				const isExists = this[key];
				if (!isOptional || (!isExists && isOptional)) {
					this[key] = peer[key];
				}
			}
		});

		return this;
	}

	/**
	 * Description of the function.
	 *
	 * @returns {peer} Clone of peer
	 * @todo Add description for the function
	 */
	object() {
		const copy = {};

		_.each(this.properties, key => {
			copy[key] = this[key];
		});

		delete copy.rpc;
		return copy;
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * @typedef {Object} peer
 * @property {string} ip
 * @property {number} wsPort - Between 1 and 65535
 * @property {number} httpPort - Between 1 and 65535
 * @property {number} state - Between 0 and 2. (banned = 0, unbanned = 1, active = 2)
 * @property {string} os - Between 1 and 64 chars
 * @property {string} version - Between 5 and 12 chars
 * @property {string} broadhash
 * @property {number} height - Minimum 1
 * @property {Date} clock
 * @property {Date} updated
 * @property {string} nonce
 * @property {string} string
 */
Peer.prototype.properties = [
	'ip',
	'wsPort',
	'state',
	'os',
	'version',
	'broadhash',
	'height',
	'clock',
	'updated',
	'nonce',
	'httpPort',
];

Peer.prototype.required = ['ip', 'wsPort', 'string'];

Peer.prototype.optional = ['httpPort', 'nonce'];

Peer.prototype.connectionProperties = ['rpc', 'socket', 'connectionOptions'];

Peer.prototype.headers = ['os', 'version', 'broadhash', 'height', 'nonce'];

Peer.STATE = {
	BANNED: 0,
	DISCONNECTED: 1,
	CONNECTED: 2,
};

/**
 * Checks number or assigns default value from parameter.
 *
 * @param {number} integer
 * @param {number} [fallback]
 * @returns {number} If not integer returns fallback
 * @todo Add description for the params
 */
Peer.prototype.parseInt = function(integer, fallback) {
	integer = parseInt(integer);
	integer = isNaN(integer) ? fallback : integer;

	return integer;
};

module.exports = Peer;
