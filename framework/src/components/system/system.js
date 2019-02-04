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
	constructor(config, logger, storage) {
		this.logger = logger;
		this.storage = storage;
		this.headers = {
			os: os.platform() + os.release(),
			version: config.version,
			minVersion: config.minVersion,
			protocolVersion: config.protocolVersion,
			height: 1,
			nethash: config.nethash,
			broadhash: config.nethash,
			nonce: config.nonce,
		};

		self = this;
	}

	/**
	 * Invokes cb with broadhash.
	 *
	 * @param {function} cb
	 * @param {Error} err
	 * @param {string} broadhash
	 * @todo Add description for the params
	 */
	getBroadhash(cb) {
		if (typeof cb !== 'function') {
			return this.headers.broadhash;
		}

		return this.storage.entities.Block.get(
			{},
			{ limit: 5, sort: 'height:desc' }
		)
			.then(rows => {
				if (rows.length <= 1) {
					// In case that we have only genesis block in database (query returns 1 row) - skip broadhash update
					return setImmediate(cb, null, self.headers.nethash);
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
				this.logger.error(err.stack);
				return setImmediate(cb, err);
			});
	}

	/**
	 * Checks nethash (network) compatibility.
	 *
	 * @param {string} nethash
	 * @returns {boolean}
	 * @todo Add description for the params and the return value
	 */
	networkCompatible(nethash) {
		return this.headers.nethash === nethash;
	}

	/**
	 * Checks version compatibility from input param against private values.
	 *
	 * @param {string} version
	 * @returns {boolean}
	 * @todo Add description for the params and the return value
	 */
	versionCompatible(version) {
		return semver.gte(version, this.headers.minVersion);
	}

	/**
	 * Checks protocol version compatibility from input param against
	 * private values.
	 *
	 * @param protocolVersion
	 * @returns {boolean}
	 */
	protocolVersionCompatible(protocolVersion) {
		const peerHard = parseInt(protocolVersion[0]);
		const myHard = parseInt(this.headers.protocolVersion[0]);
		return myHard === peerHard && peerHard >= 1;
	}

	/**
	 * Checks nonce (unique app id) compatibility- compatible when different than given.
	 *
	 * @param nonce
	 * @returns {boolean}
	 * @todo Add description for the params and the return value
	 */
	nonceCompatible(nonce) {
		return nonce && this.headers.nonce !== nonce;
	}

	/**
	 * Updates private broadhash and height values.
	 *
	 * @param {Object} block - block
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb, err
	 */
	update(cb) {
		async.series(
			{
				getBroadhash(seriesCb) {
					self.getBroadhash((err, hash) => {
						if (!err) {
							self.broadhash = hash;
						}

						return setImmediate(seriesCb);
					});
				},
				getHeight(seriesCb) {
					return self.storage.entities.Block.get(
						{},
						{
							limit: 5,
							sort: 'height:desc',
						}
					).then(blocks => {
						self.height = blocks[0].height;
						return setImmediate(seriesCb);
					});
				},
			},
			err => {
				this.logger.debug('System headers', this.headers);
				return setImmediate(cb, err);
			}
		);
	}
}

module.exports = System;
