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

const assert = require('assert');
const utils = require('./utils');

class Synchronizer {
	constructor({
		logger,
		blocksModule,
		processorModule,
		storageModule,
		mechanisms = [],
	}) {
		assert(
			Array.isArray(mechanisms),
			'mechanisms should be an array of mechanisms',
		);
		this.mechanisms = mechanisms;
		this.logger = logger;
		this.blocksModule = blocksModule;
		this.processorModule = processorModule;
		this.storageModule = storageModule;
		this.active = false;

		this._checkMechanismsInterfaces();
	}

	/**
	 * Checks whether the registered mechanisms implement mandatory interfaces
	 * @private
	 */
	_checkMechanismsInterfaces() {
		for (const mechanism of this.mechanisms) {
			assert(
				typeof mechanism.isValidFor === 'function',
				`Mechanism ${
					mechanism.constructor.name
				} should implement "isValidFor" method`,
			);
			assert(
				typeof mechanism.run === 'function',
				`Mechanism ${mechanism.constructor.name} should implement "run" method`,
			);
		}
	}

	/**
	 * Verify if blocks are left in temp_block table
	 * If blocks are left, we want to attempt to restore those
	 *
	 * @return {Promise<void>}
	 */
	async init() {
		const isEmpty = await this.storageModule.entities.TempBlock.isEmpty();
		if (!isEmpty) {
			try {
				await utils.restoreBlocksUponStartup(
					this.logger,
					this.blocksModule,
					this.processorModule,
					this.storageModule,
				);
			} catch (err) {
				this.logger.error(
					{ err },
					'Failed to restore blocks from temp table upon startup',
				);
			}
		}
	}

	/**
	 * Start the syncing mechanism
	 * @param {Object} receivedBlock - The block you received from network, used to choose sync mechanism
	 * @param {string} peerId - The ID of the peer that is sending the block
	 * @return {*}
	 */
	async run(receivedBlock, peerId) {
		if (this.isActive) {
			throw new Error('Synchronizer is already running');
		}
		try {
			this.active = true;
			assert(
				receivedBlock,
				'A block must be provided to the Synchronizer in order to run',
			);
			assert(
				peerId,
				'A peer ID from the peer sending the block must be provided to the Synchronizer in order to run',
			);

			this.logger.info(
				{ blockId: receivedBlock.id, height: receivedBlock.height },
				'Starting synchronizer',
			);
			const receivedBlockInstance = await this.processorModule.deserialize(
				receivedBlock,
			);

			// Moving to a Different Chain
			// 1. Step: Validate new tip of chain
			await this.processorModule.validateDetached(receivedBlockInstance);

			// Choose the right mechanism to sync
			const validMechanism = await this._determineSyncMechanism(
				receivedBlockInstance,
			);

			if (!validMechanism) {
				return this.logger.info(
					{ blockId: receivedBlockInstance.id },
					'Syncing mechanism could not be determined for the given block',
				);
			}

			this.logger.info(`Triggering: ${validMechanism.constructor.name}`);

			await validMechanism.run(receivedBlockInstance, peerId);
		} finally {
			this.active = false;
		}

		return this.logger.info('Synchronization finished');
	}

	/**
	 * Check if the current syncing mechanism is active
	 * @return {*|never|boolean}
	 */
	get isActive() {
		return this.active;
	}

	/**
	 * Determine and return the syncing mechanism strategy to follow
	 * @private
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async _determineSyncMechanism(receivedBlock) {
		for (const mechanism of this.mechanisms) {
			if (await mechanism.isValidFor(receivedBlock)) {
				return mechanism;
			}
		}

		return undefined;
	}
}

module.exports = { Synchronizer };
