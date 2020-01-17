/* eslint-disable class-methods-use-this */
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

class BaseSynchronizer {
	constructor(storage, logger, channel) {
		this.storage = storage;
		this.logger = logger;
		this.channel = channel;
	}

	async run() {
		throw new Error('#run method must be implemented');
	}

	async isValidFor() {
		throw new Error('#isValidFor method must be implemented');
	}

	async _applyPenaltyAndRestartSync(peerId, receivedBlock, reason) {
		this.logger.info(
			{ peerId, reason },
			'Applying penalty to peer and restarting synchronizer',
		);
		await this.channel.invoke('network:applyPenalty', {
			peerId,
			penalty: 100,
		});
		await this.channel.publish('chain:processor:sync', {
			block: receivedBlock,
		});
	}
}

module.exports = { BaseSynchronizer };
