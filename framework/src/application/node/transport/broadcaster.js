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

const ENDPOINT_BROADCAST_TRANSACTIONS = 'postTransactionsAnnouncement';

class Broadcaster {
	constructor({ broadcasts, transactionPool, logger, channel }) {
		this.logger = logger;
		this.transactionPool = transactionPool;
		this.config = broadcasts;
		this.channel = channel;

		this.queue = [];
		this.transactionIdQueue = [];

		if (this.config.active) {
			setInterval(async () => {
				try {
					await this._broadcast();
				} catch (err) {
					this.logger.error({ err }, 'Failed to broadcast information');
				}
			}, this.config.broadcastInterval);
		} else {
			this.logger.info(
				'Broadcasting data disabled by user through config.json',
			);
		}
	}

	enqueueTransactionId(transactionId) {
		if (
			this.transactionIdQueue.find(id => id === transactionId) !== undefined
		) {
			return false;
		}
		this.transactionIdQueue.push(transactionId);
		return true;
	}

	async _broadcast() {
		this.transactionIdQueue = this.transactionIdQueue.filter(id =>
			this.transactionPool.contains(id),
		);
		if (this.transactionIdQueue.length > 0) {
			const transactionIds = this.transactionIdQueue.slice(
				0,
				this.config.releaseLimit,
			);
			await this.channel.publishToNetwork('broadcastToNetwork', {
				event: ENDPOINT_BROADCAST_TRANSACTIONS,
				data: {
					transactionIds,
				},
			});
			this.transactionIdQueue = this.transactionIdQueue.filter(
				id => !transactionIds.includes(id),
			);
		}
	}
}

module.exports = Broadcaster;
