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
const jobsQueue = require('../helpers/jobs_queue');

let modules;
let library;

/**
 * Main Broadcaster logic.
 * Initializes variables, sets Broadcast routes and timer based on
 * broadcast interval from config file.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires lodash
 * @requires helpers/jobs_queue
 * @param {Object} broadcasts
 * @param {boolean} force
 * @param {Transaction} transaction - Transaction instance
 * @param {Object} logger
 * @todo Add description for the params
 */
class Broadcaster {
	constructor(nonce, broadcasts, force, transaction, logger, channel, storage) {
		library = {
			logger,
			logic: {
				transaction,
			},
			config: {
				broadcasts,
				forging: {
					force,
				},
			},
			storage,
		};

		this.nonce = nonce;

		this.queue = [];
		this.config = library.config.broadcasts;

		// Broadcast routes
		this.routes = [
			{
				path: 'postTransactions',
				collection: 'transactions',
				object: 'transaction',
			},
			{
				path: 'postSignatures',
				collection: 'signatures',
				object: 'signature',
			},
		];

		this.channel = channel;

		if (broadcasts.active) {
			jobsQueue.register(
				'broadcasterReleaseQueue',
				async () => this.releaseQueue(),
				this.config.broadcastInterval
			);
		} else {
			library.logger.info(
				'Broadcasting data disabled by user through config.json'
			);
		}
	}

	/**
	 * broadcast to network.
	 *
	 * @param {Object} params
	 * @param {Object} options
	 * @returns {Promise}
	 * @throws {Error}
	 * @todo Add description for the params
	 */
	async broadcast(params, { api: event, data }) {
		// Broadcast using Elements P2P library via network module
		const wrappedData = {
			...data,
			nonce: this.nonce,
		};
		await this.channel.invoke('network:emit', {
			event,
			data: wrappedData,
		});
	}

	/**
	 * Adds new object {params, options} to queue array.
	 *
	 * @param {Object} params
	 * @param {Object} options
	 * @returns {Object[]} Queue private variable with new data
	 * @todo Add description for the params
	 */
	enqueue(params, options) {
		options.immediate = false;
		return this.queue.push({ params, options });
	}

	/**
	 * Counts relays and valid limit.
	 *
	 * @param {Object} object
	 * @returns {boolean} true - If broadcast relays exhausted
	 * @todo Add description for the params
	 */
	maxRelays(object) {
		if (!Number.isInteger(object.relays)) {
			object.relays = 0; // First broadcast
		}

		if (Math.abs(object.relays) >= this.config.relayLimit) {
			library.logger.debug('Broadcast relays exhausted', object);
			return true;
		}
		object.relays++; // Next broadcast
		return false;
	}

	/**
	 * Filters private queue based on broadcasts.
	 *
	 * @private
	 * @returns {Promise} null, boolean|undefined
	 * @todo Add description for the params
	 */
	async filterQueue() {
		library.logger.debug(`Broadcasts before filtering: ${this.queue.length}`);

		const transactionIdsNotInPool = [];
		this.queue = this.queue.filter(broadcast => {
			if (broadcast.options.immediate) {
				return false;
			}

			if (broadcast.options.data) {
				let transactionId;
				if (broadcast.options.data.transaction) {
					// Look for a transaction of a given "id"
					transactionId = broadcast.options.data.transaction.id;
				} else if (broadcast.options.data.signature) {
					// Look for a corresponding "transactionId" of a given signature
					transactionId = broadcast.options.data.signature.transactionId;
				}
				if (!transactionId) {
					return false;
				}
				// Broadcast if transaction is in transaction pool
				if (!modules.transactions.transactionInPool(transactionId)) {
					transactionIdsNotInPool.push(transactionId);
				}
				return true;
			}
			return true;
		});

		const persistedTransactionIds = (await Promise.all(
			transactionIdsNotInPool.map(async transactionId => {
				try {
					const isPersisted = await library.storage.entities.Transaction.isPersisted(
						{
							id: transactionId,
						}
					);
					return {
						transactionId,
						isPersisted,
					};
				} catch (e) {
					// if there is an error for transaction id then remove it from the broadcasts
					return {
						transactionId,
						isPersisted: true,
					};
				}
			})
		))
			.filter(({ isPersisted }) => isPersisted)
			.map(({ transactionId }) => transactionId);

		this.queue = this.queue.filter(broadcast => {
			if (broadcast.options.data) {
				let transactionId;
				if (broadcast.options.data.transaction) {
					// Look for a transaction of a given "id"
					transactionId = broadcast.options.data.transaction.id;
				} else if (broadcast.options.data.signature) {
					// Look for a corresponding "transactionId" of a given signature
					transactionId = broadcast.options.data.signature.transactionId;
				}
				return !persistedTransactionIds.includes(transactionId);
			}
			return true;
		});

		library.logger.debug(`Broadcasts after filtering: ${this.queue.length}`);

		return null;
	}

	/**
	 * Groups broadcasts by api.
	 *
	 * @private
	 * @param {Object} broadcasts
	 * @returns {Object[]} Squashed routes
	 * @todo Add description for the params
	 */
	squashQueue(broadcasts) {
		const grouped = _.groupBy(broadcasts, broadcast => broadcast.options.api);
		const squashed = [];

		this.routes.forEach(route => {
			if (Array.isArray(grouped[route.path])) {
				const data = {};

				data[route.collection] = grouped[route.path]
					.map(broadcast => broadcast.options.data[route.object])
					.filter(Boolean);

				squashed.push({
					options: { api: route.path, data },
					immediate: false,
				});
			}
		});

		return squashed;
	}

	/**
	 * Releases enqueued broadcasts:
	 * - filterQueue
	 * - squashQueue
	 * - broadcast
	 *
	 * @private
	 * @returns {Promise}
	 * @throws {Error}
	 * @todo Add description for the params
	 */
	// eslint-disable-next-line class-methods-use-this
	async releaseQueue() {
		library.logger.trace('Releasing enqueued broadcasts');

		if (!this.queue.length) {
			library.logger.trace('Queue empty');
			return null;
		}
		try {
			await this.filterQueue();
			const broadcasts = this.queue.splice(0, this.config.releaseLimit);
			const squashedBroadcasts = this.squashQueue(broadcasts);

			await Promise.all(
				squashedBroadcasts.map(({ params, options }) =>
					this.broadcast(params, options)
				)
			);

			return library.logger.info(
				`Broadcasts released: ${squashedBroadcasts.length}`
			);
		} catch (err) {
			library.logger.error('Failed to release broadcast queue', err);
			throw err;
		}
	}

	/**
	 * Binds input parameters to private variables modules.
	 *
	 * @param {Transport} transport
	 * @param {Transactions} transactions
	 * @todo Add description for the params
	 */
	// eslint-disable-next-line class-methods-use-this
	bind(transport, transactions) {
		modules = {
			transport,
			transactions,
		};
	}
}

module.exports = Broadcaster;
