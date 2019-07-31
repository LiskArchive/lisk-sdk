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

class FastChainSwitchingMechanism {
	constructor({ storage, logger, blocks, slots, dpos, activeDelegates }) {
		this.storage = storage;
		this.logger = logger;
		this.slots = slots;
		this.dpos = dpos;
		this.blocks = blocks;
		this.constants = {
			activeDelegates,
		};
		this.active = false;
	}

	// eslint-disable-next-line class-methods-use-this,no-empty-function
	async run() {}

	get isActive() {
		return this.active;
	}

	/**
	 * Check if this sync mechanism is valid for the received block
	 *
	 * @param {object} receivedBlock - The blocked received from the network
	 * @return {Promise.<Boolean|undefined>} - If the mechanism applied to received block
	 * @throws {Error} - In case want to abort the sync pipeline
	 */
	async isValidFor(receivedBlock) {
		const lastBlock = this.blocks.lastBlock;

		// 3. Step: Check whether B justifies fast chain switching mechanism
		const twoRounds = this.constants.activeDelegates * 2;
		if (Math.abs(receivedBlock.height - lastBlock.height) > twoRounds) {
			return false;
		}

		const blockRound = this.slots.calcRound(receivedBlock.height);
		const delegateList = await this.dpos.getRoundDelegates(blockRound);

		return delegateList.includes(receivedBlock.generatorPublicKey);
	}
}

module.exports = { FastChainSwitchingMechanism };
