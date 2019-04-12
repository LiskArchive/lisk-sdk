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

const { MAX_PEERS } = global.constants;

let modules;
let library;
let self;

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
 * @param {Peers} peers - Peers instance
 * @param {Transaction} transaction - Transaction instance
 * @param {Object} logger
 * @todo Add description for the params
 */
class Broadcaster {
	constructor(broadcasts, force, peers, transaction, logger) {
		library = {
			logger,
			logic: {
				peers,
				transaction,
			},
			config: {
				broadcasts,
				forging: {
					force,
				},
			},
		};

		this.queue = [];
		this.config = library.config.broadcasts;
		this.config.peerLimit = MAX_PEERS;

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

		self = this;

		if (broadcasts.active) {
			jobsQueue.register(
				'broadcasterReleaseQueue',
				this.releaseQueue,
				this.config.broadcastInterval
			);
		} else {
			library.logger.info(
				'Broadcasting data disabled by user through config.json'
			);
		}
	}

	/**
	 * Calls peers.list function to get peers.
	 *
	 * @param {Object} params
	 * @returns {SetImmediate} error, peers
	 * @todo Add description for the params
	 */
	async getPeers(params) {
		params.limit = params.limit || this.config.peerLimit;
		const peers = library.logic.peers.listRandomConnected(params);
		return peers;
	}

	/**
	 * Gets peers and for each peer create it and broadcast.
	 *
	 * @param {Object} params
	 * @param {Object} options
	 * @returns {Promise}
	 * @throws {Error}
	 * @todo Add description for the params
	 */
	async broadcast(params, options) {
		let peers;
		params.limit = params.limit || this.config.broadcastLimit;
		try {
			if (!params.peers) {
				peers = await this.getPeers(params);
			} else {
				peers = params.peers.slice(0, params.limit);
			}
			library.logger.debug('Begin broadcast', options);
			peers.forEach(peer => peer.rpc[options.api](options.data));
			library.logger.debug('End broadcast');
			return peers;
		} catch (err) {
			throw err;
		}
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

		this.queue = this.queue.filter(broadcast => {
			if (broadcast.options.immediate) {
				return false;
			}

			if (broadcast.options.data) {
				let transactionId;
				if (broadcast.options.data.transaction) {
					// Look for a transaction of a given "id" when broadcasting transactions
					transactionId = broadcast.options.data.transaction.id;
				} else if (broadcast.options.data.signature) {
					// Look for a corresponding "transactionId" of a given signature when broadcasting signatures
					transactionId = broadcast.options.data.signature.transactionId;
				}
				if (!transactionId) {
					return false;
				}
				// Broadcast if transaction is in transaction pool
				if (modules.transactions.transactionInPool(transactionId)) {
					return true;
				}
				// Don't broadcast if transaction is already confirmed
				return library.logic.transaction.checkConfirmed(
					{ id: transactionId },
					// In case of SQL error:
					// err = true, isConfirmed = false => return false
					// In case transaction exists in "trs" table:
					// err = null, isConfirmed = true => return false
					// In case transaction doesn't exists in "trs" table:
					// err = null, isConfirmed = false => return true
					(err, isConfirmed) => !err && !isConfirmed
				);
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
		library.logger.info('Releasing enqueued broadcasts');

		if (!self.queue.length) {
			library.logger.info('Queue empty');
			return null;
		}
		try {
			await self.filterQueue();
			const broadcasts = self.queue.splice(0, self.config.releaseLimit);
			const squashedBroadcasts = self.squashQueue(broadcasts);
			const peers = await self.getPeers({});

			// eslint-disable-next-line no-restricted-syntax
			for await (const squashedBroadcast of squashedBroadcasts) {
				return self.broadcast(
					Object.assign({ peers }, squashedBroadcast.params),
					squashedBroadcast.options
				);
			}

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
	 * @param {Peers} peers
	 * @param {Transport} transport
	 * @param {Transactions} transactions
	 * @todo Add description for the params
	 */
	// eslint-disable-next-line class-methods-use-this
	bind(peers, transport, transactions) {
		modules = {
			peers,
			transport,
			transactions,
		};
	}
}

module.exports = Broadcaster;
