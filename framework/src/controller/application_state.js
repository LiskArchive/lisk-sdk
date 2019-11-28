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

class ApplicationState {
	constructor({
		initialState: {
			version,
			wsPort,
			httpPort,
			minVersion,
			protocolVersion,
			nethash,
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
			blockVersion: 0,
			maxHeightPrevoted: 0,
			nethash,
		});
	}

	get state() {
		return _.cloneDeep(__private.state.get(this));
	}

	set channel(channel) {
		this.stateChannel = channel;
	}

	async update({
		height,
		maxHeightPrevoted = this.state.maxHeightPrevoted,
		lastBlockId = this.state.lastBlockId,
		blockVersion = this.state.blockVersion,
	}) {
		assert(height, 'height is required to update application state.');
		try {
			const newState = this.state;
			newState.maxHeightPrevoted = maxHeightPrevoted;
			newState.lastBlockId = lastBlockId;
			newState.height = height;
			newState.blockVersion = blockVersion;
			__private.state.set(this, newState);
			this.logger.debug(this.state, 'Update application state');
			await this.stateChannel.publish('app:state:updated', this.state);
			return true;
		} catch (err) {
			this.logger.error(err.stack);
			throw err;
		}
	}
}

module.exports = ApplicationState;
