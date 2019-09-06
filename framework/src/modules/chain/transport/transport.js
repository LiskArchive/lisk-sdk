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
const _ = require('lodash');
const { convertErrorsToString } = require('../utils/error_handlers');
const Broadcaster = require('./broadcaster');
const definitions = require('../schema/definitions');
const blocksUtils = require('../blocks');
const transactionsModule = require('../transactions');

function incrementRelays(packet) {
	if (!Number.isInteger(packet.relays)) {
		packet.relays = 0;
	}
	packet.relays += 1;
}

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
		transactionPoolModule,
		blocksModule,
		loaderModule,
		interfaceAdapters,
		// Constants
		nonce,
		broadcasts,
		maxSharedTransactions,
	}) {
		this.message = {};

		this.channel = channel;
		this.logger = logger;
		this.storage = storage;
		this.applicationState = applicationState;
		this.exceptions = exceptions;

		this.constants = {
			nonce,
			broadcasts,
			maxSharedTransactions,
		};

		this.transactionPoolModule = transactionPoolModule;
		this.blocksModule = blocksModule;
		this.loaderModule = loaderModule;
		this.interfaceAdapters = interfaceAdapters;

		this.broadcaster = new Broadcaster(
			this.constants.nonce,
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
			// TODO: Remove the relays property as part of the next hard fork. This needs to be set for backwards compatibility.
			incrementRelays(signature);
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
			// TODO: Remove the relays property as part of the next hard fork. This needs to be set for backwards compatibility.
			incrementRelays(transaction);
			const transactionJSON = transaction.toJSON();
			this.broadcaster.enqueue(
				{},
				{
					api: 'postTransactions',
					data: {
						transaction: transactionJSON,
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

		// TODO: Remove the relays property as part of the next hard fork. This needs to be set for backwards compatibility.
		incrementRelays(block);

		if (this.loaderModule.syncing()) {
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

		const { broadhash } = this.applicationState;

		// Perform actual broadcast operation
		return this.broadcaster.broadcast(
			{
				broadhash,
			},
			{ api: 'postBlock', data: { block } },
		);
	}

	/**
	 * @property {function} blocksCommon
	 * @property {function} blocks
	 * @property {function} postBlock
	 * @property {function} list
	 * @property {function} height
	 * @property {function} status
	 * @property {function} postSignatures
	 * @property {function} getSignatures
	 * @property {function} getTransactions
	 * @property {function} postTransactions
	 * @todo Add description for the functions
	 * @todo Implement API comments with apidoc.
	 * @see {@link http://apidocjs.com/}
	 */
	/**
	 * Description of blocksCommon.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async blocksCommon(query) {
		query = query || {};

		if (query.ids && query.ids.split(',').length > 1000) {
			throw new Error('ids property contains more than 1000 values');
		}

		const errors = validator.validate(definitions.WSBlocksCommonRequest, query);

		if (errors.length) {
			const error = `${errors[0].message}: ${errors[0].path}`;
			this.logger.debug('Common block request validation failed', {
				err: error.toString(),
				req: query,
			});
			throw new Error(error);
		}

		const escapedIds = query.ids
			// Remove quotes
			.replace(/['"]+/g, '')
			// Separate by comma into an array
			.split(',')
			// Reject any non-numeric values
			.filter(id => /^[0-9]+$/.test(id));

		if (!escapedIds.length) {
			this.logger.debug('Common block request validation failed', {
				err: 'ESCAPE',
				req: query.ids,
			});

			throw new Error('Invalid block id sequence');
		}

		try {
			const row = await this.storage.entities.Block.get({
				id: escapedIds[0],
			});

			if (!row.length > 0) {
				return {
					success: true,
					common: null,
				};
			}

			const { height, id, previousBlockId: previousBlock, timestamp } = row[0];

			const parsedRow = {
				id,
				height,
				previousBlock,
				timestamp,
			};

			return {
				success: true,
				common: parsedRow,
			};
		} catch (error) {
			this.logger.error(error.stack);
			throw new Error('Failed to get common block');
		}
	}

	/**
	 * Description of blocks.
	 *
	 * @todo Add @param tags
	 * @todo Add description of the function
	 */
	// eslint-disable-next-line consistent-return
	async blocks(query) {
		// Get 34 blocks with all data (joins) from provided block id
		// According to maxium payload of 58150 bytes per block with every transaction being a vote
		// Discounting maxium compression setting used in middleware
		// Maximum transport payload = 2000000 bytes
		if (!query || !query.lastBlockId) {
			return {
				success: false,
				message: 'Invalid lastBlockId requested',
			};
		}

		try {
			const data = await this.blocksModule.loadBlocksDataWS({
				limit: 34, // 1977100 bytes
				lastId: query.lastBlockId,
			});

			_.each(data, block => {
				if (block.tf_data) {
					try {
						block.tf_data = block.tf_data.toString('utf8');
					} catch (e) {
						this.logger.error(
							'Transport->blocks: Failed to convert data field to UTF-8',
							{
								block,
								error: e,
							},
						);
					}
				}
			});

			return { blocks: data, success: true };
		} catch (err) {
			return {
				blocks: [],
				message: err,
				success: false,
			};
		}
	}

	/**
	 * Description of postBlock.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async postBlock(query = {}) {
		if (!this.constants.broadcasts.active) {
			return this.logger.debug(
				'Receiving blocks disabled by user through config.json',
			);
		}

		const errors = validator.validate(definitions.WSBlocksBroadcast, query);

		if (errors.length) {
			this.logger.debug(
				'Received post block broadcast request in unexpected format',
				{
					errors,
					module: 'transport',
					query,
				},
			);
			// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
			throw errors;
		}

		let block = blocksUtils.addBlockProperties(query.block);

		// Instantiate transaction classes
		block.transactions = this.interfaceAdapters.transactions.fromBlock(block);

		block = blocksUtils.objectNormalize(block);
		// TODO: endpoint should be protected before
		if (this.loaderModule.syncing()) {
			return this.logger.debug(
				"Client is syncing. Can't receive block at the moment.",
				block.id,
			);
		}
		return this.blocksModule.receiveBlockFromNetwork(block);
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
			this.logger.debug('Invalid signatures body', errors);
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
	 * Description of getTransactions.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async getTransactions() {
		const transactions = this.transactionPoolModule.getMergedTransactionList(
			true,
			this.constants.maxSharedTransactions,
		);

		return {
			success: true,
			transactions,
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
	 * Description of postTransactions.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async postTransactions(query) {
		if (!this.constants.broadcasts.active) {
			return this.logger.debug(
				'Receiving transactions disabled by user through config.json',
			);
		}

		const errors = validator.validate(definitions.WSTransactionsRequest, query);

		if (errors.length) {
			this.logger.debug('Invalid transactions body', errors);
			// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
			throw errors;
		}

		return this._receiveTransactions(query.transactions);
	}

	/**
	 * Validates signatures body and for each signature calls receiveSignature.
	 *
	 * @private
	 * @implements {__private.receiveSignature}
	 * @param {Array} signatures - Array of signatures
	 */
	async _receiveSignatures(signatures = []) {
		// eslint-disable-next-line no-restricted-syntax
		for (const signature of signatures) {
			try {
				// eslint-disable-next-line no-await-in-loop
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
		// eslint-disable-next-line no-restricted-syntax
		for (const transaction of transactions) {
			try {
				if (transaction) {
					transaction.bundled = true;
				}
				// eslint-disable-next-line no-await-in-loop
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

			const { transactionsResponses } = await composedTransactionsCheck([
				transaction,
			]);

			if (transactionsResponses[0].errors.length > 0) {
				throw transactionsResponses[0].errors;
			}
		} catch (errors) {
			const errString = convertErrorsToString(errors);
			this.logger.debug('Transaction normalization failed', {
				id,
				err: errString,
				module: 'transport',
			});

			// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
			throw errors;
		}

		this.logger.debug(`Received transaction ${transaction.id}`);

		try {
			await this.transactionPoolModule.processUnconfirmedTransaction(
				transaction,
				true,
			);
			return transaction.id;
		} catch (err) {
			this.logger.debug(`Transaction ${id}`, convertErrorsToString(err));
			if (transaction) {
				this.logger.debug('Transaction', transaction);
			}
			throw err;
		}
	}
}

// Export
module.exports = { Transport };
