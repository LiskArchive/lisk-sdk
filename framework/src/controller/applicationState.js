/* eslint-disable class-methods-use-this */
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

const __private = {};

/**
 * Initial state of the entire application.
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
class ApplicationState {
	constructor(config, logger, storage) {
		__private.logger = logger;
		__private.storage = storage;
		__private.state = {
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

	getState() {
		return __private.state;
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
		return semver.gte(version, __private.state.minVersion);
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
		const peerHard = parseInt(protocolVersion[0]);
		const myHard = parseInt(__private.state.protocolVersion[0]);
		return myHard === peerHard && peerHard >= 1;
	}

	/**
	 * Updates broadhash and height values.
	 *
	 * @returns {Promise.<boolean, Error>}
	 */
	async update() {
		try {
			const blocks = await __private.storage.entities.Block.get(
				{},
				{
					limit: 5,
					sort: 'height:desc',
				}
			);
			if (blocks.length <= 1) {
				__private.state.broadhash = __private.state.nethash;
				return true;
			}
			__private.state.height = blocks[0].height;
			const seed = blocks.map(row => row.id).join('');
			const newBroadhash = crypto
				.createHash('sha256')
				.update(seed, 'utf8')
				.digest()
				.toString('hex');
			__private.state.broadhash = newBroadhash;
			__private.logger.debug('Application state', __private.state);
			return true;
		} catch (err) {
			__private.logger.error(err.stack);
			throw err;
		}
	}
}

module.exports = ApplicationState;
