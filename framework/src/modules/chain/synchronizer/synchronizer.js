/*
<<<<<<< HEAD
 * Copyright © 2019 Lisk Foundation
=======
 * Copyright © 2018 Lisk Foundation
>>>>>>> feature/introduce_bft_consensus
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

const assert = require('assert');

const {
	verifySignature,
	verifyVersion,
	verifyReward,
	verifyId,
	verifyPayload,
} = require('../blocks/verify');

class Synchronizer {
	constructor({
		storage,
		logger,
		blockReward,
		exceptions,
		maxTransactionsPerBlock,
		maxPayloadLength,
	}) {
		this.storage = storage;
		this.logger = logger;
		this.blockReward = blockReward;
		this.exceptions = exceptions;

		this.constants = {
			maxPayloadLength,
			maxTransactionsPerBlock,
		};

		this.mechanisms = [];
	}

	/**
	 * Register a sync mechanism with synchronizer
	 * It must have "isValidFor" and "run" interface to call upon
	 *
	 * "isValidFor" must return true/false to match the sync mechanism
	 * "isValidFor" can throw error to abort the synchronization
	 *
	 * "run" must initiate the synchronization
	 * "run" must keep track of its state internally
	 *
	 * @param {Object} mechanism - Mechanism to register
	 */
	register(mechanism) {
		assert(
			mechanism.isValidFor,
			'Sync mechanism must have "isValidFor" interface'
		);
		assert(mechanism.run, 'Sync mechanism must have "run" interface');
		assert(mechanism.isActive, 'Sync mechanism must have "isActive" interface');

		this.mechanisms.push(mechanism);
	}

	/**
	 * Start the syncing mechanism
	 * @param {Object} receivedBlock - The block you received from network, used to choose sync mechanism
	 * @return {*}
	 */
	async run(receivedBlock) {
		if (this.activeMechanism) {
			throw new Error(
				`Blocks Sychronizer with ${
					this.activeMechanism.constructor.name
				} is already running`
			);
		}

		const lastBlock = await this.storage.entities.Block.getLastBlock();

		// Moving to a Different Chain
		// 1. Step: Validate new tip of chain
		const result = this._verifyBlockBeforeSync(lastBlock, receivedBlock);
		if (!result.verified) {
			throw Error(
				`Block verification for chain synchronization failed with errors: ${result.errors.join()}`
			);
		}

		// Choose the right mechanism to sync
		const validMechanism = await this._determineSyncMechanism(receivedBlock);

		if (!validMechanism) {
			return this.logger.info(
				"Can't determine sync mechanism at the moment for block",
				receivedBlock
			);
		}

		return validMechanism.run(receivedBlock);
	}

	/**
	 * Check if the current syncing mechanism is active
	 * @return {*|never|boolean}
	 */
	isActive() {
		return this.activeMechanism ? this.activeMechanism.isActive : false;
	}

	/**
	 * Return active mechanism
	 * @return {Object}
	 */
	get activeMechanism() {
		return this.mechanisms.find(mechanism => mechanism.isActive);
	}

	/**
	 * Determine and return the syncing mechanism strategy to follow
	 * @private
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async _determineSyncMechanism(receivedBlock) {
		try {
			// Loop through to find first mechanism which return true for isValidFor(receivedBlock)
			return await this.mechanisms.find(async mechanism =>
				mechanism.isValidFor(receivedBlock)
			);
		} catch (error) {
			this.logger.error('Error during determining valid sync mechanism', error);
			return null;
		}
	}

	/**
	 * Perform all checks outlined in Step 1 of the section "Processing Blocks" except for checking height, parentBlockID and delegate slot (block B may be in the future and assume different delegates that are not active in the round of block A). If any check fails, the peer that sent block B is banned and the node aborts the process of moving to a different chain.
	 *
	 * https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#moving-to-a-different-chain
	 *
	 * @param lastBlock
	 * @param receivedBlock
	 * @private
	 */
	_verifyBlockBeforeSync(lastBlock, receivedBlock) {
		let result = { verified: true, errors: [] };

		result = verifySignature(receivedBlock, result);
		result = verifyVersion(receivedBlock, this.exceptions, result);
		result = verifyReward(
			this.blockReward,
			receivedBlock,
			this.exceptions,
			result
		);
		result = verifyId(receivedBlock, result);
		result = verifyPayload(
			receivedBlock,
			this.constants.maxTransactionsPerBlock,
			this.constants.maxPayloadLength,
			result
		);

		result.verified = result.errors.length === 0;
		result.errors.reverse();

		return result;
	}
}

module.exports = { Synchronizer };
