/*
 * Copyright © 2019 Lisk Foundation
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
const _ = require('lodash');
const assert = require('assert');

const __private = {
	state: new WeakMap(),
};

/**
 * Initial state of the entire application:
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
 * @requires os
 * @requires lodash
 * @param {Object} initialState - Initial state of the application
 * @param {Object} logger
 */
class ApplicationState {
	constructor({
		initialState: {
			version,
			wsPort,
			httpPort,
			minVersion,
			protocolVersion,
			nethash,
			nonce,
		},
		logger,
	}) {
		this.logger = logger;
		__private.state.set(this, {
			os: os.platform() + os.release(),
			version,
			wsPort,
			httpPort,
			minVersion,
			protocolVersion,
			height: 1,
			nethash,
			broadhash: nethash,
			nonce,
		});
	}

	get state() {
		return _.cloneDeep(__private.state.get(this));
	}

	set channel(channel) {
		this.stateChannel = channel;
	}

	/**
	 * Updates broadhash and height values.
	 *
	 * @param {broadhash, height} parameters - broadhash and height to update
	 *
	 * @returns {Promise.<boolean, Error>}
	 * @throws assert.AssertionError
	 */
	async update({ broadhash, height }) {
		assert(broadhash, 'broadhash is required to update application state.');
		assert(height, 'height is required to update application state.');
		try {
			const newState = this.state;
			newState.broadhash = broadhash;
			newState.height = height;
			__private.state.set(this, newState);
			this.logger.debug('Application state', this.state);
			await this.stateChannel.publish('app:state:updated', this.state);
			return true;
		} catch (err) {
			this.logger.error(err.stack);
			throw err;
		}
	}
}

module.exports = ApplicationState;
