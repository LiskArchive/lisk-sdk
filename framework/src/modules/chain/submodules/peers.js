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

// Private fields
let library;
let self;

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
		library = {
			logger: scope.components.logger,
			storage: scope.components.storage,
			config: {
				version: scope.config.version,
				forging: {
					force: scope.config.forging.force,
				},
			},
			channel: scope.channel,
			blocks: scope.modules.blocks,
			constants: {
				minBroadhashConsensus: scope.config.constants.MIN_BROADHASH_CONSENSUS,
			},
		};
		self = this;
		self.consensus = scope.config.forging.force ? 100 : 0;
		self.broadhashConsensusCalculationInterval = 5000;

		library.channel.once('network:bootstrap', () => {
			self.onNetworkReady();
		});
	}

	/**
	 * Returns consensus stored by calculateConsensus.
	 *
	 * @returns {number|undefined} Last calculated consensus or null if wasn't calculated yet
	 */
	// eslint-disable-next-line class-methods-use-this
	getLastConsensus() {
		return self.consensus;
	}

	/**
	 * Calculates consensus for as a ratio active to matched peers.
	 *
	 * @returns {Promise.<number, Error>} Consensus or undefined if config.forging.force = true
	 */
	// eslint-disable-next-line class-methods-use-this
	async calculateConsensus() {
		const broadhash = library.blocks.broadhash;
		const activeCount = Math.min(
			await library.channel.invoke('network:getPeersCountByFilter', {
				state: PEER_STATE_CONNECTED,
			}),
			MAX_PEERS
		);

		const matchedCount = Math.min(
			await library.channel.invoke('network:getPeersCountByFilter', {
				broadhash,
				state: PEER_STATE_CONNECTED,
			}),
			MAX_PEERS
		);

		const consensus = +((matchedCount / activeCount) * 100).toPrecision(2);
		self.consensus = Number.isNaN(consensus) ? 0 : consensus;
		return self.consensus;
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
		if (library.config.forging.force) {
			return false;
		}
		const consensus = await self.calculateConsensus();
		return consensus < library.constants.minBroadhashConsensus;
	}

	/**
	 * Periodically calculate consensus
	 */
	// eslint-disable-next-line class-methods-use-this
	onNetworkReady() {
		library.logger.trace('Peers ready');
		const calculateConsensus = async () => {
			const consensus = await self.calculateConsensus();
			return library.logger.debug(`Broadhash consensus: ${consensus} %`);
		};

		jobsQueue.register(
			'calculateConsensus',
			calculateConsensus,
			self.broadhashConsensusCalculationInterval
		);
	}
}

// Export
module.exports = Peers;
