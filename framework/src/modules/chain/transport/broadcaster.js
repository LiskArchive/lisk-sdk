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
const ENDPOINT_BROADCAST_SIGNATURES = 'postSignatures';

/**
 * Main Broadcaster logic.
 * Initializes variables, sets Broadcast routes and timer based on
 * broadcast interval from config file.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires lodash
 * @requires utils/jobs_queue
 * @param {Object} broadcasts
 * @param {Object} logger
 * @todo Add description for the params
 */
class Broadcaster {
	constructor({ broadcasts, transactionPool, logger, channel }) {
		this.logger = logger;
		this.transactionPool = transactionPool;
		this.config = broadcasts;
		this.channel = channel;

		this.queue = [];
		this.transactionIdQueue = [];
		this.signatureObjectQueue = [];

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

	/**
	 * Enqueue transactionId into queue if not exists
	 * @param {string} transactionId  transaction id as string
	 */
	enqueueTransactionId(transactionId) {
		if (
			this.transactionIdQueue.find(id => id === transactionId) !== undefined
		) {
			return false;
		}
		this.transactionIdQueue.push(transactionId);
		return true;
	}

	/**
	 * Enqueue signature object without duplicate signature
	 * @param {Object} signatureObject with all required parameters
	 */
	enqueueSignatureObject(signatureObject) {
		if (
			this.signatureObjectQueue.find(
				obj => obj.signature === signatureObject.signature,
			) !== undefined
		) {
			return false;
		}
		this.signatureObjectQueue.push(signatureObject);
		return true;
	}

	/**
	 * broadcast to network.
	 */
	async _broadcast() {
		if (this.transactionIdQueue.length > 0) {
			this.transactionIdQueue = this.transactionIdQueue.filter(id =>
				this.transactionPool.transactionInPool(id),
			);
			const transactionIds = this.transactionIdQueue.slice(
				0,
				this.config.releaseLimit,
			);
			await this.channel.invoke('network:broadcast', {
				event: ENDPOINT_BROADCAST_TRANSACTIONS,
				data: {
					transactionIds,
				},
			});
			this.transactionIdQueue = this.transactionIdQueue.filter(
				id => !transactionIds.includes(id),
			);
		}
		// Broadcast using Elements P2P library via network module
		if (this.signatureObjectQueue.length > 0) {
			const signatures = this.signatureObjectQueue.slice(
				0,
				this.config.releaseLimit,
			);
			await this.channel.invoke('network:send', {
				event: ENDPOINT_BROADCAST_SIGNATURES,
				data: {
					signatures,
				},
			});
			this.signatureObjectQueue = this.signatureObjectQueue.filter(
				obj =>
					signatures.find(
						signatureObj => signatureObj.signature === obj.signature,
					) === undefined,
			);
		}
	}
}

module.exports = Broadcaster;
