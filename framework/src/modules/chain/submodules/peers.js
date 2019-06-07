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

const jobsQueue = require('../utils/jobs_queue');

const PEER_STATE_CONNECTED = 2;
const MAX_PEERS = 100;

/**
 * Main peers methods. Initializes library with scope content.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires lodash
 * @requires ip
 * @requires pg-promise
 * @requires semver
 * @requires api/ws/rpc/failure_codes
 * @requires utils/jobs_queue
 * @requires logic/peer
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Peers {
	constructor(scope) {
		this.library = {
			logger: scope.components.logger,
			config: {
				forging: {
					force: scope.config.forging.force,
				},
			},
			channel: scope.channel,
			constants: {
				minBroadhashConsensus: scope.config.constants.minBroadhashConsensus,
			},
		};
		this.consensus = scope.config.forging.force ? 100 : 0;
		this.broadhashConsensusCalculationInterval = 5000;

		this.library.channel.once('network:bootstrap', () => {
			this.onNetworkReady();
		});
	}

	/**
	 * Returns consensus stored by calculateConsensus.
	 *
	 * @returns {number|undefined} Last calculated consensus or null if wasn't calculated yet
	 */
	// eslint-disable-next-line class-methods-use-this
	getLastConsensus() {
		return this.consensus;
	}

	/**
	 * Calculates consensus for as a ratio active to matched peers.
	 *
	 * @returns {Promise.<number, Error>} Consensus or undefined if config.forging.force = true
	 */
	// eslint-disable-next-line class-methods-use-this
	async calculateConsensus(broadhash) {
		const activeCount = Math.min(
			await this.library.channel.invoke('network:getPeersCountByFilter', {
				state: PEER_STATE_CONNECTED,
			}),
			MAX_PEERS
		);

		const matchedCount = Math.min(
			await this.library.channel.invoke('network:getPeersCountByFilter', {
				broadhash,
				state: PEER_STATE_CONNECTED,
			}),
			MAX_PEERS
		);

		const consensus = +((matchedCount / activeCount) * 100).toPrecision(2);
		this.consensus = Number.isNaN(consensus) ? 0 : consensus;
		return this.consensus;
	}

	// Public methods
	/**
	 * Returns true if application consensus is less than MIN_BROADHASH_CONSENSUS.
	 * Returns false if library.config.forging.force is true.
	 *
	 * @returns {boolean}
	 * @todo Add description for the return value
	 */
	// eslint-disable-next-line class-methods-use-this
	async isPoorConsensus() {
		if (this.library.config.forging.force) {
			return false;
		}
		const consensus = await this.calculateConsensus();
		return consensus < this.library.constants.minBroadhashConsensus;
	}

	/**
	 * Periodically calculate consensus
	 */
	// eslint-disable-next-line class-methods-use-this
	onNetworkReady() {
		this.library.logger.trace('Peers ready');
		const calculateConsensus = async () => {
			const consensus = await this.calculateConsensus();
			return this.library.logger.debug(`Broadhash consensus: ${consensus} %`);
		};

		jobsQueue.register(
			'calculateConsensus',
			calculateConsensus,
			this.broadhashConsensusCalculationInterval
		);
	}
}

// Export
module.exports = Peers;
