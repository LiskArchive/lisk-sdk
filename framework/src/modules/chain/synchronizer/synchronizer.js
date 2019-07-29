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

const BlockSynchronizationMechanism = require('./block_synchronization_mechanism');
const FastChainSwitchingMechanism = require('./fast_chain_switching_mechanism');

class Synchronizer {
	constructor() {
		this.currentStrategy = null;
		this.blockSynchronizationMechanism = new BlockSynchronizationMechanism();
		this.fastChainSwitchingMechanism = new FastChainSwitchingMechanism();
	}

	/**
	 * Start the syncing mechanism
	 * @return {*}
	 */
	run() {
		if (this.currentStrategy && this.currentStrategy.isActive()) {
			throw new Error('Blocks Sychronizer is already running');
		}

		this.currentStrategy = this._determineStrategy();

		return this.currentStrategy.run();
	}

	/**
	 * Check if the current syncing mechanism is active
	 * @return {*|never|boolean}
	 */
	isActive() {
		return this.currentStrategy.isActive();
	}

	/**
	 * Determine and return the syncing mechanism strategy to follow
	 * @private
	 */
	// eslint-disable-next-line class-methods-use-this
	_determineStrategy() {
		// Return blockSynchronizationMechanism or fastChainSwitchingMechanism depending on
		// Moving to a Different Chain conditions defined in LIP-0014
	}
}

module.exports = Synchronizer;
