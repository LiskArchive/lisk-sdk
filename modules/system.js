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

const os = require('os');
const crypto = require('crypto');
const async = require('async');
const semver = require('semver');

// Private fields
let __private = {};
let modules;
let library;
let self;

/**
 * Main system methods. Initializes library with scope content and private variables:
 * - os
 * - version
 * - port
 * - height
 * - nethash
 * - broadhash
 * - minVersion
 * - nonce
 *
 * @class
 * @requires async
 * @requires crypto
 * @requires os
 * @requires semver
 * @param {setImmediateCallback} cb - Callback function
 * @param {scope} scope - App instance
 */
class System {
	constructor(cb, scope) {
		library = {
			logger: scope.logger,
			db: scope.db,
			config: {
				version: scope.config.version,
				wsPort: scope.config.wsPort,
				httpPort: scope.config.httpPort,
				nethash: scope.config.nethash,
				minVersion: scope.config.minVersion,
				nonce: scope.config.nonce,
			},
		};

		self = this;

		__private.os = os.platform() + os.release();
		__private.version = library.config.version;
		__private.wsPort = library.config.wsPort;
		__private.httpPort = library.config.httpPort;
		__private.height = 1;
		__private.nethash = library.config.nethash;
		__private.broadhash = library.config.nethash;
		__private.minVersion = library.config.minVersion;
		__private.nonce = library.config.nonce;

		setImmediate(cb, null, self);
	}
}

// Public methods

/**
 * Sets the entire __private variable.
 *
 * @param {Object} headers
 * @todo Add description for the params
 */
System.setHeaders = function(headers) {
	__private = headers;
};

/**
 * Returns all headers from __private variable.
 *
 * @returns {*} __private
 * @todo Add description for the return value
 */
System.getHeaders = function() {
	return __private;
};

/**
 * Returns private variables object content.
 *
 * @returns {Object}
 * @todo Add description for the return value
 */
System.prototype.headers = function() {
	return __private;
};

/**
 * Gets private variable `os`.
 *
 * @returns {string}
 * @todo Add description for the return value
 */
System.prototype.getOS = function() {
	return __private.os;
};

/**
 * Gets private variable `version`.
 *
 * @returns {string}
 * @todo Add description for the return value
 */
System.prototype.getVersion = function() {
	return __private.version;
};

/**
 * Gets private variable `port`.
 *
 * @returns {number}
 * @todo Add description for the return value
 */
System.prototype.getPort = function() {
	return __private.wsPort;
};

/**
 * Gets private variable `height`.
 *
 * @returns {number}
 * @todo Add description for the return value
 */
System.prototype.getHeight = function() {
	return __private.height;
};

/**
 * Gets private variable `nethash`.
 *
 * @returns {string} hash
 * @todo Add description for the return value
 */
System.prototype.getNethash = function() {
	return __private.nethash;
};

/**
 * Gets private variable `nonce`.
 *
 * @returns {string} nonce
 * @todo Add description for the return value
 */
System.prototype.getNonce = function() {
	return __private.nonce;
};

/**
 * Invokes cb with broadhash.
 *
 * @param {function} cb
 * @param {Error} err
 * @param {string} broadhash
 * @todo Add description for the params
 */
System.prototype.getBroadhash = function(cb) {
	if (typeof cb !== 'function') {
		return __private.broadhash;
	}

	library.db.blocks
		.list({ offset: 0, limit: 5, sortField: 'b_height', sortMethod: 'DESC' })
		.then(rows => {
			if (rows.length <= 1) {
				// In case that we have only genesis block in database (query returns 1 row) - skip broadhash update
				return setImmediate(cb, null, __private.nethash);
			}
			const seed = rows.map(row => row.b_id).join('');
			const broadhash = crypto
				.createHash('sha256')
				.update(seed, 'utf8')
				.digest()
				.toString('hex');

			return setImmediate(cb, null, broadhash);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, err);
		});
};

/**
 * Gets private variable `minVersion`.
 *
 * @returns {string}
 * @todo Add description for the return value
 */
System.prototype.getMinVersion = function() {
	return __private.minVersion;
};

/**
 * Checks nethash (network) compatibility.
 *
 * @param {string} nethash
 * @returns {boolean}
 * @todo Add description for the params and the return value
 */
System.prototype.networkCompatible = function(nethash) {
	return __private.nethash === nethash;
};

/**
 * Checks version compatibility from input param against private values.
 *
 * @param {string} version
 * @returns {boolean}
 * @todo Add description for the params and the return value
 */
System.prototype.versionCompatible = function(version) {
	return semver.gte(version, __private.minVersion);
};

/**
 * Checks nonce (unique app id) compatibility- compatible when different than given.
 *
 * @param nonce
 * @returns {boolean}
 * @todo Add description for the params and the return value
 */
System.prototype.nonceCompatible = function(nonce) {
	return nonce && __private.nonce !== nonce;
};

/**
 * Updates private broadhash and height values.
 *
 * @param {Object} block - block
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 */
System.prototype.update = function(cb) {
	async.series(
		{
			getBroadhash(seriesCb) {
				self.getBroadhash((err, hash) => {
					if (!err) {
						__private.broadhash = hash;
					}

					return setImmediate(seriesCb);
				});
			},
			getHeight(seriesCb) {
				__private.height = modules.blocks.lastBlock.get().height;
				return setImmediate(seriesCb);
			},
		},
		err => {
			library.logger.debug('System headers', __private);
			return setImmediate(cb, err);
		}
	);
};

// Events
/**
 * Assigns used modules to modules variable.
 *
 * @param {modules} scope - Loaded modules
 */
System.prototype.onBind = function(scope) {
	modules = {
		blocks: scope.blocks,
	};
};

// Export
module.exports = System;
