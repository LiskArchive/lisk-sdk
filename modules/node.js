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

var _ = require('lodash');
var BlockReward = require('../logic/block_reward.js');
var constants = require('../helpers/constants.js');

// Private fields
var modules;
var library;
var blockReward;
var loaded;

/**
 * Main node methods. Initializes library with scope content and private variables:
 * - library
 * - blockReward
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires lodash
 * @requires helpers/constants
 * @requires logic/block_reward
 * @param {setImmediateCallback} cb - Callback function
 * @param {scope} scope - App instance
 */
// Constructor
function Node(cb, scope) {
	library = {
		build: scope.build,
		lastCommit: scope.lastCommit,
		config: {
			version: scope.config.version,
			nethash: scope.config.nethash,
			nonce: scope.config.nonce,
			forging: {
				secret: scope.config.forging.secret,
			},
		},
	};
	blockReward = new BlockReward();
	setImmediate(cb, null, this);
}

Node.prototype.internal = {
	/**
	 * Get the forging status of a delegate.
	 *
	 * @param {string} publicKey - Public key of delegate
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 * @todo Add description for the return value
	 */
	getForgingStatus(publicKey, cb) {
		var keyPairs = modules.delegates.getForgersKeyPairs();
		var internalForgers = library.config.forging.secret;
		var forgersPublicKeys = {};

		for (var pair in keyPairs) {
			forgersPublicKeys[keyPairs[pair].publicKey.toString('hex')] = true;
		}

		var fullList = internalForgers.map(forger => ({
			forging: !!forgersPublicKeys[forger.publicKey],
			publicKey: forger.publicKey,
		}));

		if (publicKey && _.find(fullList, { publicKey })) {
			return setImmediate(cb, null, [
				{ publicKey, forging: !!forgersPublicKeys[publicKey] },
			]);
		}

		if (publicKey && !_.find(fullList, { publicKey })) {
			return setImmediate(cb, null, []);
		}

		return setImmediate(cb, null, fullList);
	},

	/**
	 * Toggle the forging status of a delegate.
	 *
	 * @param {string} publicKey - Public key of a delegate
	 * @param {string} decryptionKey - Key used to decrypt encrypted passphrase
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 * @todo Add description for the return value
	 */
	toggleForgingStatus(publicKey, decryptionKey, cb) {
		modules.delegates.toggleForgingStatus(
			publicKey,
			decryptionKey,
			(err, result) => {
				if (err) {
					return setImmediate(cb, err);
				}

				return setImmediate(cb, null, result);
			}
		);
	},
};

// Public methods
/**
 * Description of the member.
 *
 * @property {function} getConstants
 * @property {function} getStatus
 * @todo Add description for the member and its functions
 */
Node.prototype.shared = {
	/**
	 * Description of getConstants.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	getConstants(req, cb) {
		if (!loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}
		var height = modules.blocks.lastBlock.get().height;
		return setImmediate(cb, null, {
			build: library.build,
			commit: library.lastCommit,
			epoch: constants.epochTime,
			fees: constants.fees,
			nethash: library.config.nethash,
			nonce: library.config.nonce,
			milestone: blockReward.calcMilestone(height),
			reward: blockReward.calcReward(height),
			supply: blockReward.calcSupply(height),
			version: library.config.version,
		});
	},

	/**
	 * Description of getStatus.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	getStatus(req, cb) {
		if (!loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}
		modules.loader.getNetwork((err, network) => {
			network = network || { height: null };
			return setImmediate(cb, null, {
				broadhash: modules.system.getBroadhash(),
				consensus: modules.peers.getLastConsensus() || null,
				height: modules.blocks.lastBlock.get().height,
				loaded: modules.loader.loaded(),
				networkHeight: network.height,
				syncing: modules.loader.syncing(),
			});
		});
	},
};

// Events
/**
 * Assigns used modules to modules variable.
 *
 * @param {modules} scope - Loaded modules
 */
Node.prototype.onBind = function(scope) {
	modules = {
		blocks: scope.blocks,
		loader: scope.loader,
		peers: scope.peers,
		system: scope.system,
		delegates: scope.delegates,
	};
	loaded = true;
};

// Export
module.exports = Node;
