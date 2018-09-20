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

const _ = require('lodash');
const BlockReward = require('../logic/block_reward.js');
const slots = require('../helpers/slots.js');

const { EPOCH_TIME, FEES } = global.constants;

// Private fields
let modules;
let library;
let blockReward;
let loaded;

/**
 * Main node methods. Initializes library with scope content and private constiables:
 * - library
 * - blockReward
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires lodash
 * @requires logic/block_reward
 * @param {setImmediateCallback} cb - Callback function
 * @param {scope} scope - App instance
 */
class Node {
	constructor(cb, scope) {
		library = {
			build: scope.build,
			lastCommit: scope.lastCommit,
			config: {
				version: scope.config.version,
				nethash: scope.config.nethash,
				nonce: scope.config.nonce,
				forging: {
					delegates: scope.config.forging.delegates,
				},
			},
		};
		blockReward = new BlockReward();
		setImmediate(cb, null, this);
	}
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
		const keyPairs = modules.delegates.getForgersKeyPairs();
		const internalForgers = library.config.forging.delegates;
		const forgersPublicKeys = {};

		for (var pair in keyPairs) {
			forgersPublicKeys[keyPairs[pair].publicKey.toString('hex')] = true;
		}

		const fullList = internalForgers.map(forger => ({
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
	 * @param {string} password - Password used to decrypt encrypted passphrase
	 * @param {boolean} forging - Forging status of a delegate to update
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 * @todo Add description for the return value
	 */
	updateForgingStatus(publicKey, password, forging, cb) {
		modules.delegates.updateForgingStatus(
			publicKey,
			password,
			forging,
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
		const height = modules.blocks.lastBlock.get().height;
		return setImmediate(cb, null, {
			build: library.build,
			commit: library.lastCommit,
			epoch: EPOCH_TIME,
			fees: {
				send: FEES.SEND,
				vote: FEES.VOTE,
				secondSignature: FEES.SECOND_SIGNATURE,
				delegate: FEES.DELEGATE,
				multisignature: FEES.MULTISIGNATURE,
				dappRegistration: FEES.DAPP_REGISTRATION,
				dappWithdrawal: FEES.DAPP_WITHDRAWAL,
				dappDeposit: FEES.DAPP_DEPOSIT,
			},
			nethash: library.config.nethash,
			nonce: library.config.nonce,
			milestone: blockReward.calcMilestone(height),
			reward: blockReward.calcReward(height).toString(),
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
		modules.peers.networkHeight({ normalized: false }, (err, networkHeight) => {
			setImmediate(cb, null, {
				broadhash: modules.system.getBroadhash(),
				consensus: modules.peers.getLastConsensus(),
				currentTime: Date.now(),
				secondsSinceEpoch: slots.getTime(),
				height: modules.blocks.lastBlock.get().height,
				loaded: modules.loader.loaded(),
				networkHeight,
				syncing: modules.loader.syncing(),
			});
		});
	},
};

// Events
/**
 * Assigns used modules to modules constiable.
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
