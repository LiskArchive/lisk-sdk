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
		this.active = false;
	}

	get isActive() {
		return this.active;
	}

	async run() {
		throw new Error('#run method must be implemented');
	}

	async isValidFor() {
		throw new Error('#isValidFor method must be implemented');
	}

	/**
	 * Helper function that encapsulates:
	 * 1. applying a penalty to a peer.
	 * 2. restarting sync.
	 * 3. throwing the reason.
	 *
	 * @param {object} peerId - The peer ID to target
	 * @param receivedBlock
	 * @param reason
	 * a penalty and restarting sync
	 */
	async applyPenaltyAndRestartSync(peerId, receivedBlock, reason) {
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

	/**
	 * Request blocks from `fromID` ID to `toID` ID from an specific peer `peer`
	 *
	 * @param {object} peerId - The ID of the peer to target
	 * @param {string} fromId - The starting block ID to fetch from
	 * @param {string} toId - The ending block ID
	 * @return {Promise<Array<object>>}
	 */
	async requestBlocksWithinIDs(peerId, fromId, toId) {
		const maxFailedAttempts = 10; // TODO: Probably expose this to the configuration layer?
		const blocks = [];
		let failedAttempts = 0; // Failed attempt === the peer doesn't return any block or there is a network failure (no response or takes too long to answer)
		let lastFetchedID = fromId;

		while (failedAttempts < maxFailedAttempts) {
			const { data } = await this.channel.invoke('network:requestFromPeer', {
				procedure: 'getBlocksFromId',
				peerId,
				data: {
					blockId: lastFetchedID,
				},
			}); // Note that the block matching lastFetchedID is not returned but only higher blocks.

			if (data) {
				blocks.push(...data); // `data` is an array of blocks.
				lastFetchedID = data.slice(-1).pop().id;
				const index = blocks.findIndex(block => block.id === toId);
				if (index > -1) {
					return blocks.splice(0, index + 1); // Removes unwanted extra blocks
				}
			} else {
				failedAttempts += 1; // It's only considered a failed attempt if the target peer doesn't provide any blocks on a single request
			}
		}

		return blocks;
	}
}

module.exports = { BaseSynchronizer };
