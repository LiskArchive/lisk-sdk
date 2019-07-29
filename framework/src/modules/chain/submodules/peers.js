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

const jobsQueue = require('../helpers/jobs_queue');

// Private fields
let library;
let self;
const { MIN_BROADHASH_CONSENSUS } = global.constants;

const MAX_PEERS = 100;

// Since this function is only specific to broadhash calculation we keep it here and will be obselete with broadhash consensus
const consolidateConnectedPeersBasedOnPort = peerList => {
	const duplicateIps = {};

	// Make a list of duplicate IPs and capture there ports corresponding to their height
	peerList.forEach(peer => {
		if (duplicateIps[peer.ipAddress]) {
			duplicateIps[peer.ipAddress].count += 1;
			// Replace the peer port with higher height
			if (peer.height > duplicateIps[peer.ipAddress].height) {
				duplicateIps[peer.ipAddress].port = peer.wsPort;
				duplicateIps[peer.ipAddress].height = peer.height;
			}
		} else {
			duplicateIps[peer.ipAddress] = {
				port: peer.wsPort,
				height: peer.height,
				count: 1,
			};
		}
	});

	return peerList.filter(peer => {
		const peerPortInfo = duplicateIps[peer.ipAddress];
		if (peerPortInfo.count > 1 && peerPortInfo.height !== peer.height) {
			return false;
		}

		return true;
	});
};
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

		library.channel.once('network:bootstrap', () => {
			self.onNetworkReady();
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
	const connectedPeers = await library.channel.invoke(
		'network:getConnectedPeers',
		{}
	);
	const consolidatedPeers = consolidateConnectedPeersBasedOnPort(
		connectedPeers
	);
	const activeCount = Math.min(consolidatedPeers.length, MAX_PEERS);

	// Filter by broadhash from the consolidated peer list
	const filteredConnectedPeers = consolidatedPeers.filter(
		peer => peer.broadhash === broadhash
	);

	const matchedCount = Math.min(filteredConnectedPeers.length, MAX_PEERS);

	const consensus = +((matchedCount / activeCount) * 100).toPrecision(2);
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
Peers.prototype.onNetworkReady = function() {
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
