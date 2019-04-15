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

const jobsQueue = require('../helpers/jobs_queue');

// Private fields
let library;
let self;
const { MIN_BROADHASH_CONSENSUS } = global.constants;

const PEER_STATE_CONNECTED = 2;

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
 * @requires helpers/jobs_queue
 * @requires logic/peer
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Peers {
	constructor(cb, scope) {
		library = {
			logger: scope.components.logger,
			storage: scope.components.storage,
			config: {
				network: scope.config.network,
				version: scope.config.version,
				forging: {
					force: scope.config.forging.force,
				},
			},
			applicationState: scope.applicationState,
			channel: scope.channel,
		};
		self = this;
		self.consensus = scope.config.forging.force ? 100 : 0;
		self.broadhashConsensusCalculationInterval = 5000;

		library.channel.once('network:ready', () => {
			self.onAppReady();
		});
		setImmediate(cb, null, self);
	}
}

/**
 * Returns consensus stored by Peers.prototype.calculateConsensus.
 *
 * @returns {number|undefined} Last calculated consensus or null if wasn't calculated yet
 */
Peers.prototype.getLastConsensus = function() {
	return self.consensus;
};

/**
 * Calculates consensus for as a ratio active to matched peers.
 *
 * @returns {Promise.<number, Error>} Consensus or undefined if config.forging.force = true
 */
Peers.prototype.calculateConsensus = async function() {
	const { broadhash } = library.applicationState;
	const activeCount = await library.channel.invoke(
		'network:getPeersCountByFilter',
		{ state: PEER_STATE_CONNECTED }
	);
	const matchedCount = await library.channel.invoke(
		'network:getPeersCountByFilter',
		{ broadhash }
	);
	const consensus = +(matchedCount / activeCount * 100).toPrecision(2);
	self.consensus = Number.isNaN(consensus) ? 0 : consensus;
	return self.consensus;
};

// Public methods
/**
 * Returns true if application consensus is less than MIN_BROADHASH_CONSENSUS.
 * Returns false if library.config.forging.force is true.
 *
 * @returns {boolean}
 * @todo Add description for the return value
 */
Peers.prototype.isPoorConsensus = async function() {
	if (library.config.forging.force) {
		return false;
	}
	const consensus = await self.calculateConsensus();
	return consensus < MIN_BROADHASH_CONSENSUS;
};

/**
 * Periodically calculate consensus
 */
Peers.prototype.onAppReady = function() {
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
};

// Export
module.exports = Peers;
