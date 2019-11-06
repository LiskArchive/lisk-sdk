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

const { TransactionError } = require('@liskhq/lisk-transactions');
const { validator } = require('@liskhq/lisk-validator');
const { convertErrorsToString } = require('../utils/error_handlers');
const Broadcaster = require('./broadcaster');
const definitions = require('../schema/definitions');
const transactionsModule = require('../transactions');

/**
 * Main transport methods. Initializes library with scope content and generates a Broadcaster instance.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires api/ws/rpc/failure_codes
 * @requires api/ws/rpc/failure_codes
 * @requires api/ws/workers/rules
 * @requires api/ws/rpc/ws_rpc
 * @requires logic/broadcaster
 * @param {scope} scope - App instance
 */
class Transport {
	constructor({
		// components
		channel,
		logger,
		storage,
		// Unique requirements
		applicationState,
		exceptions,
		// Modules
		synchronizer,
		transactionPoolModule,
		blocksModule,
		processorModule,
		interfaceAdapters,
		// Constants
		broadcasts,
		maxSharedTransactions,
	}) {
		this.message = {};

		this.channel = channel;
		this.logger = logger;
		this.storage = storage;
		this.synchronizer = synchronizer;
		this.applicationState = applicationState;
		this.exceptions = exceptions;

		this.constants = {
			broadcasts,
			maxSharedTransactions,
		};

		this.transactionPoolModule = transactionPoolModule;
		this.blocksModule = blocksModule;
		this.processorModule = processorModule;
		this.interfaceAdapters = interfaceAdapters;

		this.broadcaster = new Broadcaster(
			this.constants.broadcasts,
			this.transactionPoolModule,
			this.logger,
			this.channel,
			this.storage,
		);
	}

	/**
	 * Calls enqueue signatures and emits a 'signature/change' socket message.
	 *
	 * @param {signature} signature
	 * @param {Object} broadcast
	 * @emits signature/change
	 * @todo Add description for the params
	 */
	// eslint-disable-next-line class-methods-use-this
	onSignature(signature, broadcast) {
		if (broadcast) {
			this.broadcaster.enqueue(
				{},
				{
					api: 'postSignatures',
					data: {
						signature,
					},
				},
			);
			this.channel.publish('chain:signature:change', signature);
		}
	}

	/**
	 * Calls enqueue transactions and emits a 'transactions/change' socket message.
	 *
	 * @param {transaction} transaction
	 * @param {Object} broadcast
	 * @emits transactions/change
	 * @todo Add description for the params
	 */
	// eslint-disable-next-line class-methods-use-this
	onUnconfirmedTransaction(transaction, broadcast) {
		if (broadcast) {
			const transactionJSON = transaction.toJSON();
			this.broadcaster.enqueue(
				{},
				{
					api: 'postTransactionsAnnouncement',
					data: {
						transaction: { id: transaction.id },
					},
				},
			);
			this.channel.publish('chain:transactions:change', transactionJSON);
		}
	}

	/**
	 * Calls broadcast blocks and emits a 'blocks/change' socket message.
	 *
	 * @param {Object} block - Reduced block object
	 * @param {boolean} broadcast - Signal flag for broadcast
	 * @emits blocks/change
	 */
	// TODO: Remove after block module becomes event-emitter
	// eslint-disable-next-line class-methods-use-this
	onBroadcastBlock(block, broadcast) {
		// Exit immediately when 'broadcast' flag is not set
		if (!broadcast) return null;

		if (this.synchronizer.isActive) {
			this.logger.debug(
				'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
			);
			return null;
		}

		if (block.totalAmount) {
			block.totalAmount = block.totalAmount.toNumber();
		}

		if (block.totalFee) {
			block.totalFee = block.totalFee.toNumber();
		}

		if (block.reward) {
			block.reward = block.reward.toNumber();
		}

		if (block.transactions) {
			// Convert transactions to JSON
			block.transactions = block.transactions.map(transactionInstance =>
				transactionInstance.toJSON(),
			);
		}

		// Perform actual broadcast operation
		return this.broadcaster.broadcast(
			{},
			{ api: 'postBlock', data: { block } },
		);
	}

	/**
	 * @property {function} blocks
	 * @property {function} postBlock
	 * @property {function} list
	 * @property {function} height
	 * @property {function} status
	 * @property {function} postSignatures
	 * @property {function} getSignatures
	 * @property {function} getTransactions
	 * @property {function} postTransactionsAnnouncement
	 * @todo Add description for the functions
	 * @todo Implement API comments with apidoc.
	 * @see {@link http://apidocjs.com/}
	 */

	/**
	 * Returns a set of full blocks starting from the ID defined in the payload up to
	 * the current tip of the chain.
	 * @param {object} payload
	 * @param {string} payload.blockId - The ID of the starting block
	 * @return {Promise<Array<object>>}
	 */
	async getBlocksFromId(payload) {
		validator.validate(definitions.getBlocksFromIdRequest, payload);

		if (validator.validator.errors) {
			this.logger.debug(
				{
					err: validator.validator.errors,
					req: payload,
				},
				'getBlocksFromID request validation failed',
			);
			throw validator.validator.errors;
		}

		return this.blocksModule.loadBlocksFromLastBlockId(payload.blockId, 34);
	}

	/**
	 * Description of postBlock.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async postBlock(query = {}, peerId) {
		if (!this.constants.broadcasts.active) {
			return this.logger.debug(
				'Receiving blocks disabled by user through config.json',
			);
		}

		// Should ignore received block if syncing
		if (this.synchronizer.isActive) {
			return this.logger.debug(
				{ blockId: query.block.id, height: query.block.height },
				"Client is syncing. Can't process new block at the moment.",
			);
		}

		const errors = validator.validate(definitions.WSBlocksBroadcast, query);

		if (errors.length) {
			this.logger.debug(
				{
					errors,
					module: 'transport',
					query,
				},
				'Received post block broadcast request in unexpected format',
			);
			// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
			throw errors;
		}

		const block = await this.processorModule.deserialize(query.block);

		return this.processorModule.process(block, { peerId });
	}

	/**
	 * Description of postSignature.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async postSignature(query) {
		const errors = validator.validate(definitions.Signature, query.signature);

		if (errors.length) {
			const error = new TransactionError(errors[0].message);
			return {
				success: false,
				code: 400,
				errors: [error],
			};
		}

		try {
			await this.transactionPoolModule.getTransactionAndProcessSignature(
				query.signature,
			);
			return { success: true };
		} catch (err) {
			return {
				success: false,
				code: 409,
				errors: err,
			};
		}
	}

	/**
	 * Description of postSignatures.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async postSignatures(query) {
		if (!this.constants.broadcasts.active) {
			return this.logger.debug(
				'Receiving signatures disabled by user through config.json',
			);
		}

		const errors = validator.validate(definitions.WSSignaturesList, query);

		if (errors.length) {
			this.logger.debug({ err: errors }, 'Invalid signatures body');
			// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
			throw errors;
		}

		return this._receiveSignatures(query.signatures);
	}

	/**
	 * Description of getSignatures.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async getSignatures() {
		const transactions = this.transactionPoolModule.getMultisignatureTransactionList(
			true,
			this.constants.maxSharedTransactions,
		);

		const signatures = transactions
			.filter(
				transaction => transaction.signatures && transaction.signatures.length,
			)
			.map(transaction => ({
				transaction: transaction.id,
				signatures: transaction.signatures,
			}));

		return {
			success: true,
			signatures,
		};
	}

	/**
	 * Get default number of transactions or by ids.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async getTransactions(ids) {
		if (!(ids && Array.isArray(ids) && ids.length)) {
			return {
				success: true,
				transactions: this.transactionPoolModule.getMergedTransactionList(
					true,
					this.constants.maxSharedTransactions,
				),
			};
		}

		if (ids.length > this.constants.maxSharedTransactions) {
			// TODO: apply penalty to the requester #3672
			return {
				success: false,
				transactions: [],
			};
		}

		const transactionsFromQueues = [];
		const idsNotInPool = [];

		for (const id of ids) {
			// Check if any transaction is in the queues.
			const transactionInPool = this.transactionPoolModule.findInTransactionPool(
				id,
			);

			if (transactionInPool) {
				transactionsFromQueues.push(transactionInPool.toJSON());
			} else {
				idsNotInPool.push(id);
			}
		}

		if (idsNotInPool.length) {
			// Check if any transaction that was not in the queues, is in the database instead.
			const transactionsFromDatabase = await this.storage.entities.Transaction.get(
				{ id_in: idsNotInPool },
				{ limit: this.constants.maxSharedTransactions },
			);

			return {
				success: true,
				transactions: transactionsFromQueues.concat(transactionsFromDatabase),
			};
		}

		return {
			success: true,
			transactions: transactionsFromQueues,
		};
	}

	/**
	 * Description of postTransaction.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async postTransaction(query) {
		try {
			const id = await this._receiveTransaction(query.transaction);
			return {
				success: true,
				transactionId: id,
			};
		} catch (err) {
			return {
				success: false,
				message: err.message || 'Transaction was rejected with errors',
				errors: err,
			};
		}
	}

	/**
	 * Process transactions IDs announcement. First validates, filter the known transactions
	 * and finally ask to the emitter the ones that are unknown.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async postTransactionsAnnouncement({ data, peerId }) {
		if (!this.constants.broadcasts.active) {
			return this.logger.debug(
				'Receiving transactions disabled by user through config.json',
			);
		}

		const errors = validator.validate(definitions.WSTransactionsRequest, data);

		if (errors.length) {
			this.logger.debug({ err: errors }, 'Invalid transactions body');
			// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
			throw errors;
		}

		const unknownTransactionIDs = await this._obtainUnknownTransactionIDs(
			data.transactions.map(transaction => transaction.id),
		);
		if (unknownTransactionIDs.length > 0) {
			const { data: result } = await this.channel.invoke(
				'network:requestFromPeer',
				{
					procedure: 'getTransactions',
					data: unknownTransactionIDs,
					peerId,
				},
			);
			return this._receiveTransactions(result.transactions);
		}

		return null;
	}

	/**
	 * It filters the known transaction IDs because they are either in the queues or exist in the database.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async _obtainUnknownTransactionIDs(ids) {
		// Check if any transaction is in the queues.
		const unknownTransactionsIDs = ids.filter(
			id => !this.transactionPoolModule.transactionInPool(id),
		);

		if (unknownTransactionsIDs.length) {
			// Check if any transaction exists in the database.
			const existingTransactions = await this.storage.entities.Transaction.get(
				{
					id_in: unknownTransactionsIDs,
				},
				{
					limit: this.constants.maxSharedTransactions,
				},
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

	/**
	 * Validates signatures body and for each signature calls receiveSignature.
	 *
	 * @private
	 * @implements {__private.receiveSignature}
	 * @param {Array} signatures - Array of signatures
	 */
	async _receiveSignatures(signatures = []) {
		for (const signature of signatures) {
			try {
				await this._receiveSignature(signature);
			} catch (err) {
				this.logger.debug(err, signature);
			}
		}
	}

	/**
	 * Validates signature with schema and calls getTransactionAndProcessSignature.
	 *
	 * @private
	 * @param {Object} query
	 * @param {string} query.signature
	 * @param {Object} query.transaction
	 * @returns {Promise.<boolean, Error>}
	 * @todo Add description for the params
	 */
	async _receiveSignature(signature) {
		const errors = validator.validate(definitions.Signature, signature);

		if (errors.length) {
			throw errors;
		}

		return this.transactionPoolModule.getTransactionAndProcessSignature(
			signature,
		);
	}

	/**
	 * Validates transactions with schema and calls receiveTransaction for each transaction.
	 *
	 * @private
	 * @implements {__private.receiveTransaction}
	 * @param {Array} transactions - Array of transactions
	 */
	async _receiveTransactions(transactions = []) {
		for (const transaction of transactions) {
			try {
				if (transaction) {
					transaction.bundled = true;
				}
				await this._receiveTransaction(transaction);
			} catch (err) {
				this.logger.debug(convertErrorsToString(err), transaction);
			}
		}
	}

	/**
	 * Normalizes transaction
	 * processUnconfirmedTransaction to confirm it.
	 *
	 * @private
	 * @param {transaction} transaction
	 * @returns {Promise.<boolean, Error>}
	 * @todo Add description for the params
	 */
	async _receiveTransaction(transactionJSON) {
		const id = transactionJSON ? transactionJSON.id : 'null';
		let transaction;
		try {
			transaction = this.interfaceAdapters.transactions.fromJson(
				transactionJSON,
			);

			const composedTransactionsCheck = transactionsModule.composeTransactionSteps(
				transactionsModule.checkAllowedTransactions(
					this.blocksModule.lastBlock,
				),
				transactionsModule.validateTransactions(this.exceptions),
			);

			// Composed transaction checks are all static, so it does not need state store
			const { transactionsResponses } = await composedTransactionsCheck(
				[transaction],
				undefined,
			);

			if (transactionsResponses[0].errors.length > 0) {
				throw transactionsResponses[0].errors;
			}
		} catch (errors) {
			const errString = convertErrorsToString(errors);
			this.logger.error(
				{
					id,
					err: errString,
					module: 'transport',
				},
				'Transaction normalization failed',
			);

			// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
			throw errors;
		}

		this.logger.debug({ id: transaction.id }, 'Received transaction');

		try {
			await this.transactionPoolModule.processUnconfirmedTransaction(
				transaction,
				true,
			);
			return transaction.id;
		} catch (err) {
			this.logger.debug(`Transaction ${id}`, convertErrorsToString(err));
			if (transaction) {
				this.logger.debug({ transaction }, 'Transaction');
			}
			throw err;
		}
	}
}

// Export
module.exports = { Transport };
