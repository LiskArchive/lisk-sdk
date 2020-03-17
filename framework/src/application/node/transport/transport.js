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

const { validator } = require('@liskhq/lisk-validator');
const { convertErrorsToString } = require('../utils/error_handlers');
const { InvalidTransactionError } = require('./errors');
const Broadcaster = require('./broadcaster');
const schemas = require('./schemas');

const DEFAULT_RATE_RESET_TIME = 10000;
const DEFAULT_RATE_LIMIT_FREQUENCY = 3;

class Transport {
	constructor({
		// components
		channel,
		logger,
		// Unique requirements
		applicationState,
		exceptions,
		// Modules
		synchronizer,
		transactionPoolModule,
		chainModule,
		processorModule,
		// Constants
		broadcasts,
	}) {
		this.message = {};

		this.channel = channel;
		this.logger = logger;
		this.synchronizer = synchronizer;
		this.applicationState = applicationState;
		this.exceptions = exceptions;

		this.constants = {
			broadcasts,
		};

		this.transactionPoolModule = transactionPoolModule;
		this.chainModule = chainModule;
		this.processorModule = processorModule;

		this.broadcaster = new Broadcaster({
			broadcasts: this.constants.broadcasts,
			transactionPool: this.transactionPoolModule,
			logger: this.logger,
			channel: this.channel,
		});

		// Rate limit for certain endpoints
		this.rateTracker = {};
		setInterval(() => {
			this.rateTracker = {};
		}, DEFAULT_RATE_RESET_TIME);
	}

	handleBroadcastTransaction(transaction) {
		this.broadcaster.enqueueTransactionId(transaction.id);
		this.channel.publish('app:transactions:change', transaction.toJSON());
	}

	handleBroadcastBlock(blockJSON) {
		if (this.synchronizer.isActive) {
			this.logger.debug(
				'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
			);
			return null;
		}
		return this.channel.publishToNetwork('sendToNetwork', {
			event: 'postBlock',
			data: {
				block: blockJSON,
			},
		});
	}

	async handleRPCGetBlocksFromId(data, peerId) {
		const errors = validator.validate(schemas.getBlocksFromIdRequest, data);

		if (errors.length) {
			const error = `${errors[0].message}`;

			this.logger.warn(
				{
					err: error,
					req: data,
				},
				'getBlocksFromID request validation failed',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw new Error(error);
		}

		// Get height of block with supplied ID
		const lastBlock = await this.chainModule.dataAccess.getBlockHeaderByID(
			data.blockId,
		);
		if (!lastBlock) {
			throw new Error(`Invalid blockId requested: ${data.blockId}`);
		}

		const lastBlockHeight = lastBlock.height;

		// Calculate max block height for database query
		const fetchUntilHeight = lastBlockHeight + 34;

		const blocks = await this.chainModule.dataAccess.getBlocksByHeightBetween(
			lastBlockHeight + 1,
			fetchUntilHeight,
		);

		return blocks && blocks.map(block => this.chainModule.serialize(block));
	}

	async handleRPCGetGetHighestCommonBlock(data, peerId) {
		const valid = validator.validate(
			schemas.getHighestCommonBlockRequest,
			data,
		);

		if (valid.length) {
			const err = valid;
			const error = `${err[0].message}: ${err[0].path}`;
			this.logger.warn(
				{
					err: error,
					req: data,
				},
				'getHighestCommonBlock request validation failed',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw new Error(error);
		}

		const commonBlock = await this.chainModule.getHighestCommonBlock(data.ids);

		return this.chainModule.serialize(commonBlock);
	}

	async handleEventPostBlock(data, peerId) {
		if (!this.constants.broadcasts.active) {
			return this.logger.debug(
				'Receiving blocks disabled by user through config.json',
			);
		}

		// Should ignore received block if syncing
		if (this.synchronizer.isActive) {
			return this.logger.debug(
				{ blockId: data.block.id, height: data.block.height },
				"Client is syncing. Can't process new block at the moment.",
			);
		}

		const errors = validator.validate(schemas.postBlockEvent, data);

		if (errors.length) {
			this.logger.warn(
				{
					errors,
					module: 'transport',
					data,
				},
				'Received post block broadcast request in unexpected format',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const block = await this.processorModule.deserialize(data.block);

		return this.processorModule.process(block, { peerId });
	}

	async handleRPCGetTransactions(data = {}, peerId) {
		await this._addRateLimit(
			'getTransactions',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(schemas.getTransactionsRequest, data);
		if (errors.length) {
			this.logger.warn(
				{ err: errors, peerId },
				'Received invalid transactions body',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const { transactionIds } = data;
		if (!transactionIds) {
			// Get processable transactions from pool and collect transactions across accounts
			// Limit the transactions to send based on releaseLimit
			const transactionsBySender = this.transactionPoolModule.getProcessableTransactions();
			const transactions = Object.values(transactionsBySender).flat();
			transactions.splice(this.constants.broadcasts.releaseLimit);

			return {
				transactions,
			};
		}

		if (transactionIds.length > this.constants.broadcasts.releaseLimit) {
			const error = new Error('Received invalid request.');
			this.logger.warn({ err: error, peerId }, 'Received invalid request.');
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const transactionsFromQueues = [];
		const idsNotInPool = [];

		for (const id of transactionIds) {
			// Check if any transaction is in the queues.
			const transaction = this.transactionPoolModule.get(id);

			if (transaction) {
				transactionsFromQueues.push(transaction.toJSON());
			} else {
				idsNotInPool.push(id);
			}
		}

		if (idsNotInPool.length) {
			// Check if any transaction that was not in the queues, is in the database instead.
			const transactionsFromDatabase = await this.chainModule.dataAccess.getTransactionsByIDs(
				idsNotInPool,
			);

			return {
				transactions: transactionsFromQueues.concat(transactionsFromDatabase),
			};
		}

		return {
			transactions: transactionsFromQueues,
		};
	}

	async handleEventPostTransaction(data) {
		try {
			const id = await this._receiveTransaction(data.transaction);
			return {
				transactionId: id,
			};
		} catch (err) {
			return {
				message: 'Transaction was rejected with errors',
				errors: err.errors || err,
			};
		}
	}

	/**
	 * Process transactions IDs announcement. First validates, filter the known transactions
	 * and finally ask to the emitter the ones that are unknown.
	 */
	async handleEventPostTransactionsAnnouncement(data, peerId) {
		await this._addRateLimit(
			'postTransactionsAnnouncement',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(
			schemas.postTransactionsAnnouncementEvent,
			data,
		);

		if (errors.length) {
			this.logger.warn(
				{ err: errors, peerId },
				'Received invalid transactions body',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const unknownTransactionIDs = await this._obtainUnknownTransactionIDs(
			data.transactionIds,
		);
		if (unknownTransactionIDs.length > 0) {
			const { data: result } = await this.channel.invokeFromNetwork(
				'requestFromPeer',
				{
					procedure: 'getTransactions',
					data: { transactionIds: unknownTransactionIDs },
					peerId,
				},
			);
			try {
				for (const transaction of result.transactions) {
					transaction.bundled = true;
					await this._receiveTransaction(transaction);
				}
			} catch (err) {
				this.logger.warn({ err, peerId }, 'Received invalid transactions.');
				if (err instanceof InvalidTransactionError) {
					await this.channel.invoke('app:applyPenaltyOnPeer', {
						peerId,
						penalty: 100,
					});
				}
			}
		}

		return null;
	}

	async _obtainUnknownTransactionIDs(ids) {
		// Check if any transaction is in the queues.
		const unknownTransactionsIDs = ids.filter(
			id => !this.transactionPoolModule.contains(id),
		);

		if (unknownTransactionsIDs.length) {
			// Check if any transaction exists in the database.
			const existingTransactions = await this.chainModule.dataAccess.getTransactionsByIDs(
				unknownTransactionsIDs,
			);

			return unknownTransactionsIDs.filter(
				id =>
					existingTransactions.find(
						existingTransaction => existingTransaction.id === id,
					) === undefined,
			);
		}

		return unknownTransactionsIDs;
	}

	async _receiveTransaction(transactionJSON) {
		if (this.transactionPoolModule.contains(transactionJSON.id)) {
			return transactionJSON.id;
		}

		let transaction;
		try {
			transaction = this.chainModule.deserializeTransaction(transactionJSON);

			// Composed transaction checks are all static, so it does not need state store
			const transactionsResponses = await this.chainModule.validateTransactions(
				[transaction],
			);

			if (transactionsResponses[0].errors.length > 0) {
				throw transactionsResponses[0].errors;
			}
		} catch (errors) {
			const errString = convertErrorsToString(errors);
			const err = new InvalidTransactionError(
				errString,
				transactionJSON.id,
				errors,
			);
			this.logger.error(
				{
					err,
					module: 'transport',
				},
				'Transaction normalization failed',
			);

			throw err;
		}

		// Broadcast transaction to network if not present in pool
		this.handleBroadcastTransaction(transaction);

		const { errors } = await this.transactionPoolModule.add(transaction);

		if (!errors.length) {
			this.logger.info({ transaction }, 'Added transaction to pool');
			return transaction.id;
		}

		this.logger.error({ errors }, 'Failed to add transaction to pool');
		throw errors;
	}

	async _addRateLimit(procedure, peerId, limit) {
		if (this.rateTracker[procedure] === undefined) {
			this.rateTracker[procedure] = { [peerId]: 0 };
		}
		this.rateTracker[procedure][peerId] = this.rateTracker[procedure][peerId]
			? this.rateTracker[procedure][peerId] + 1
			: 1;
		if (this.rateTracker[procedure][peerId] > limit) {
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 10,
			});
		}
	}
}

// Export
module.exports = { Transport };
