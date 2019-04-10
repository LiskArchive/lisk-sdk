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

const async = require('async');
const _ = require('lodash');
const jobsQueue = require('../helpers/jobs_queue');

const { MAX_PEERS } = global.constants;

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

		if (broadcasts.active) {
			jobsQueue.register(
				'broadcasterNextRelease',
				this.nextRelease.bind(this),
				this.config.broadcastInterval
			);
		} else {
			library.logger.info(
				'Broadcasting data disabled by user through config.json'
			);
		}
	}

	// Broadcaster timer
	nextRelease(cb) {
		this.releaseQueue(err => {
			if (err) {
				library.logger.info('Broadcaster timer', err);
			}
			return setImmediate(cb);
		});
	}

	/**
	 * Calls peers.list function to get peers.
	 *
	 * @param {Object} params
	 * @param {function} cb
	 * @returns {SetImmediate} error, peers
	 * @todo Add description for the params
	 */
	getPeers(params, cb) {
		params.limit = params.limit || this.config.peerLimit;
		const peers = library.logic.peers.listRandomConnected(params);
		return setImmediate(cb, null, peers);
	}

	/**
	 * Gets peers and for each peer create it and broadcast.
	 *
	 * @param {Object} params
	 * @param {Object} options
	 * @param {function} cb
	 * @returns {SetImmediate} error, peers
	 * @todo Add description for the params
	 */
	broadcast(params, options, cb) {
		params.limit = params.limit || this.config.broadcastLimit;

		async.waterfall(
			[
				waterCb => {
					if (!params.peers) {
						return this.getPeers(params, waterCb);
					}
					return setImmediate(
						waterCb,
						null,
						params.peers.slice(0, params.limit)
					);
				},
				(peers, waterCb) => {
					library.logger.debug('Begin broadcast', options);
					peers.forEach(peer => peer.rpc[options.api](options.data));
					library.logger.debug('End broadcast');
					return setImmediate(waterCb, null, peers);
				},
			],
			(err, peers) => {
				if (cb) {
					return setImmediate(cb, err, { peers });
				}
				return true;
			}
		);
	}

	// TODO: The below functions should be converted into static functions,
	// however, this will lead to incompatibility with modules and tests implementation.
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
	 * @param {function} cb
	 * @returns {SetImmediate} null, boolean|undefined
	 * @todo Add description for the params
	 */
	filterQueue(cb) {
		library.logger.debug(`Broadcasts before filtering: ${this.queue.length}`);

		async.filter(
			this.queue,
			(broadcast, filterCb) => {
				if (broadcast.options.immediate) {
					return setImmediate(filterCb, null, false);
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
						return setImmediate(filterCb, null, false);
					}
					// Broadcast if transaction is in transaction pool
					if (modules.transactions.transactionInPool(transactionId)) {
						return setImmediate(filterCb, null, true);
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
						(err, isConfirmed) => filterCb(null, !err && !isConfirmed)
					);
				}
				return setImmediate(filterCb, null, true);
			},
			(err, broadcasts) => {
				this.queue = broadcasts;

				library.logger.debug(
					`Broadcasts after filtering: ${this.queue.length}`
				);
				return setImmediate(cb);
			}
		);
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
	 * @param {function} cb
	 * @returns {SetImmediate}
	 * @todo Add description for the params
	 */
	releaseQueue(cb) {
		library.logger.info('Releasing enqueued broadcasts');

		if (!this.queue.length) {
			library.logger.info('Queue empty');
			return setImmediate(cb);
		}

		return async.waterfall(
			[
				waterCb => this.filterQueue(waterCb),
				waterCb => {
					const broadcasts = this.queue.splice(0, this.config.releaseLimit);
					return setImmediate(waterCb, null, this.squashQueue(broadcasts));
				},
				(broadcasts, waterCb) => {
					this.getPeers({}, (err, peers) =>
						setImmediate(waterCb, err, broadcasts, peers)
					);
				},
				(broadcasts, peers, waterCb) => {
					async.eachSeries(
						broadcasts,
						(broadcast, eachSeriesCb) => {
							this.broadcast(
								Object.assign({ peers }, broadcast.params),
								broadcast.options,
								eachSeriesCb
							);
						},
						err => setImmediate(waterCb, err, broadcasts)
					);
				},
			],
			(err, broadcasts) => {
				if (err) {
					library.logger.error('Failed to release broadcast queue', err);
				} else {
					library.logger.info(`Broadcasts released: ${broadcasts.length}`);
				}
				return setImmediate(cb);
			}
		);
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
