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
const semver = require('semver');

/**
 * Main system methods. Initializes library with scope content and headers:
 * - os
 * - version
 * - wsPort
 * - httpPort
 * - minVersion
 * - protocolVersion
 * - height
 * - nethash
 * - broadhash
 * - nonce
 *
 * @class
 * @requires crypto
 * @requires os
 * @requires semver
 * @param {Object} options - System options
 * @param {Object} logger
 */
class System {
	constructor(config, logger, storage) {
		this.logger = logger;
		this.storage = storage;
		this.headers = {
			os: os.platform() + os.release(),
			version: config.version,
			wsPort: config.wsPort,
			httpPort: config.httpPort,
			minVersion: config.minVersion,
			protocolVersion: config.protocolVersion,
			height: 1,
			nethash: config.nethash,
			broadhash: config.nethash,
			nonce: config.nonce,
		};
	}

	/**
	 * Checks nethash (network) compatibility.
	 *
	 * @param {string} nethash
	 * @returns {boolean}
	 */
	networkCompatible(nethash) {
		if (!nethash) {
			return false;
		}
		return this.headers.nethash === nethash;
	}

	/**
	 * Checks version compatibility from input param against private values.
	 *
	 * @param {string} version
	 * @returns {boolean}
	 */
	versionCompatible(version) {
		if (!version) {
			return false;
		}
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
		if (!protocolVersion) {
			return false;
		}
		const peerHardForks = parseInt(protocolVersion.split('.')[0]);
		const systemHardForks = parseInt(
			this.headers.protocolVersion.split('.')[0]
		);
		return systemHardForks === peerHardForks && peerHardForks >= 1;
	}

	/**
	 * Checks nonce (unique app id) compatibility- compatible when different than given.
	 *
	 * @param nonce
	 * @returns {boolean}
	 */
	nonceCompatible(nonce) {
		if (!nonce) {
			return false;
		}
		return nonce && this.headers.nonce !== nonce;
	}

	/**
	 * Updates private broadhash and height values.
	 *
	 * @returns {Promise.<boolean, Error>}
	 */
	async update() {
		try {
			const blocks = await this.storage.entities.Block.get(
				{},
				{
					limit: 5,
					sort: 'height:desc',
				}
			);
			if (blocks.length <= 1) {
				this.headers.broadhash = this.headers.nethash;
				return true;
			}
			this.headers.height = blocks[0].height;
			const seed = blocks.map(row => row.id).join('');
			const newBroadhash = crypto
				.createHash('sha256')
				.update(seed, 'utf8')
				.digest()
				.toString('hex');
			this.headers.broadhash = newBroadhash;
			this.logger.debug('System headers', this.headers);
			return true;
		} catch (err) {
			this.logger.error(err.stack);
			throw err;
		}
	}
}

module.exports = System;
