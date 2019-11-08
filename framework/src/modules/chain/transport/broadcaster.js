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

const jobsQueue = require('../utils/jobs_queue');

const ENDPOINT_BORADCAST_TRANSACTIONS = 'postTransactionsAnnouncement';
const ENDPOINT_BORADCAST_SIGNATURES = 'postSignatures';

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
			jobsQueue.register(
				'broadcasterReleaseQueue',
				async () => this._broadcast(),
				this.config.broadcastInterval,
			);
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
			await this.channel.invoke('network:broadcast', {
				event: ENDPOINT_BORADCAST_TRANSACTIONS,
				data: {
					transactionIds: this.transactionIdQueue.splice(
						0,
						this.config.releaseLimit,
					),
				},
			});
		}
		// Broadcast using Elements P2P library via network module
		if (this.signatureObjectQueue.length > 0) {
			this.channel.invoke('network:send', {
				event: ENDPOINT_BORADCAST_SIGNATURES,
				data: {
					signatures: this.signatureObjectQueue.splice(
						0,
						this.config.releaseLimit,
					),
				},
			});
		}
	}
}

module.exports = Broadcaster;
