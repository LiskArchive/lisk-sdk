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

const { TransactionError } = require('@liskhq/lisk-transactions');
const async = require('async');
const { promisify } = require('util');
const _ = require('lodash');
const { convertErrorsToString } = require('./helpers/error_handlers');
// eslint-disable-next-line prefer-const
let Broadcaster = require('./logic/broadcaster');
const definitions = require('./schema/definitions');
const blocksModule = require('./blocks');
const transactionsModule = require('./transactions');

const exceptions = global.exceptions;
const { MAX_SHARED_TRANSACTIONS } = global.constants;

// Private fields
let modules;
let library;
// eslint-disable-next-line prefer-const
let __private = {};

__private.messages = {};

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
 * @returns {setImmediateCallback} cb, null, self
 */
class Transport {
	constructor(scope) {
		library = {
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			bus: scope.bus,
			schema: scope.schema,
			balancesSequence: scope.balancesSequence,
			block: scope.block,
			config: {
				forging: {
					force: scope.config.forging.force,
				},
				broadcasts: {
					active: scope.config.broadcasts.active,
				},
			},
			applicationState: scope.applicationState,
		};

		__private.broadcaster = new Broadcaster(
			scope.config.nonce,
			scope.config.broadcasts,
			scope.config.forging.force,
			scope.modules.transactionPool,
			scope.components.logger,
			scope.channel,
			scope.components.storage
		);

		this.shared = this.attachSharedMethods();
	}

	/**
	 * Bounds scope to private broadcaster amd initialize modules.
	 *
	 * @param {modules} scope - Exposed modules
	 */
	// eslint-disable-next-line class-methods-use-this
	onBind(scope) {
		modules = {
			blocks: scope.modules.blocks,
			loader: scope.modules.loader,
			interfaceAdapters: scope.modules.interfaceAdapters,
			transactionPool: scope.modules.transactionPool,
		};
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
		if (broadcast && !__private.broadcaster.maxRelays(signature)) {
			__private.broadcaster.enqueue(
				{},
				{
					api: 'postSignatures',
					data: {
						signature,
					},
				}
			);
			library.channel.publish('chain:signature:change', signature);
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
		if (broadcast && !__private.broadcaster.maxRelays(transaction)) {
			const transactionJSON = transaction.toJSON();
			__private.broadcaster.enqueue(
				{},
				{
					api: 'postTransactions',
					data: {
						transaction: transactionJSON,
					},
				}
			);
			library.channel.publish('chain:transactions:change', transactionJSON);
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

		// Check if we are free to broadcast
		if (__private.broadcaster.maxRelays(block)) {
			library.logger.debug(
				'Transport->onBroadcastBlock: Aborted - max block relays exhausted'
			);
			return null;
		}
		if (modules.loader.syncing()) {
			library.logger.debug(
				'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress'
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
				transactionInstance.toJSON()
			);
		}

		const { broadhash } = library.applicationState;

		// Perform actual broadcast operation
		return __private.broadcaster.broadcast(
			{
				broadhash,
			},
			{ api: 'postBlock', data: { block } }
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
	// eslint-disable-next-line class-methods-use-this
	attachSharedMethods() {
		return {
			/**
			 * Description of blocksCommon.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			async blocksCommon(query) {
				query = query || {};
				library.schema.validate(
					query,
					definitions.WSBlocksCommonRequest,
					err => {
						if (err) {
							err = `${err[0].message}: ${err[0].path}`;
							library.logger.debug('Common block request validation failed', {
								err: err.toString(),
								req: query,
							});
							throw new Error(err);
						}

						const escapedIds = query.ids
							// Remove quotes
							.replace(/['"]+/g, '')
							// Separate by comma into an array
							.split(',')
							// Reject any non-numeric values
							.filter(id => /^[0-9]+$/.test(id));

						if (!escapedIds.length) {
							library.logger.debug('Common block request validation failed', {
								err: 'ESCAPE',
								req: query.ids,
							});

							throw new Error('Invalid block id sequence');
						}

						return library.storage.entities.Block.get({
							id: escapedIds[0],
						})
							.then(row => {
								if (!row.length > 0) {
									return {
										success: true,
										common: null,
									};
								}

								const {
									height,
									id,
									previousBlockId: previousBlock,
									timestamp,
								} = row[0];

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
							})
							.catch(getOneError => {
								library.logger.error(getOneError.stack);
								throw new Error('Failed to get common block');
							});
					}
				);
			},

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

				return modules.blocks
					.loadBlocksDataWS({
						limit: 34, // 1977100 bytes
						lastId: query.lastBlockId,
					})
					.then(data => {
						_.each(data, block => {
							if (block.tf_data) {
								try {
									block.tf_data = block.tf_data.toString('utf8');
								} catch (e) {
									library.logger.error(
										'Transport->blocks: Failed to convert data field to UTF-8',
										{
											block,
											error: e,
										}
									);
								}
							}
						});
						return { blocks: data, success: true };
					})
					.catch(err => ({
						blocks: [],
						message: err,
						success: false,
					}));
			},

			/**
			 * Description of postBlock.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			postBlock(query) {
				if (!library.config.broadcasts.active) {
					return library.logger.debug(
						'Receiving blocks disabled by user through config.json'
					);
				}
				query = query || {};
				return library.schema.validate(
					query,
					definitions.WSBlocksBroadcast,
					err => {
						if (err) {
							return library.logger.debug(
								'Received post block broadcast request in unexpected format',
								{
									err,
									module: 'transport',
									query,
								}
							);
						}
						let block;
						let success = true;
						try {
							block = blocksModule.addBlockProperties(query.block);

							// Instantiate transaction classes
							block.transactions = modules.interfaceAdapters.transactions.fromBlock(
								block
							);

							block = blocksModule.objectNormalize(block);
						} catch (e) {
							success = false;
							library.logger.debug('Block normalization failed', {
								err: e.toString(),
								module: 'transport',
								block: query.block,
							});

							// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
						}
						// TODO: endpoint should be protected before
						if (modules.loader.syncing()) {
							return library.logger.debug(
								"Client is syncing. Can't receive block at the moment.",
								block.id
							);
						}
						if (success) {
							return modules.blocks.receiveBlockFromNetwork(block);
						}
						return null;
					}
				);
			},

			/**
			 * Description of postSignature.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			async postSignature(query) {
				try {
					await promisify(library.schema.validate)(
						query.signature,
						definitions.Signature
					);
				} catch (err) {
					return {
						success: false,
						code: 400,
						errors: [new TransactionError(err[0].message)],
					};
				}
				return modules.transactionPool
					.getTransactionAndProcessSignature(query.signature)
					.then(() => ({ success: true }))
					.catch(err => ({
						success: false,
						code: 409,
						errors: err,
					}));
			},

			/**
			 * Description of postSignatures.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			postSignatures(query) {
				if (!library.config.broadcasts.active) {
					return library.logger.debug(
						'Receiving signatures disabled by user through config.json'
					);
				}
				return library.schema.validate(
					query,
					definitions.WSSignaturesList,
					err => {
						if (err) {
							return library.logger.debug('Invalid signatures body', err);
						}
						return __private.receiveSignatures(query.signatures);
					}
				);
			},

			/**
			 * Description of getSignatures.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			getSignatures(cb) {
				const transactions = modules.transactionPool.getMultisignatureTransactionList(
					true,
					MAX_SHARED_TRANSACTIONS
				);
				const signatures = [];

				async.eachSeries(
					transactions,
					(transaction, __cb) => {
						if (transaction.signatures && transaction.signatures.length) {
							signatures.push({
								transaction: transaction.id,
								signatures: transaction.signatures,
							});
						}
						return setImmediate(__cb);
					},
					() =>
						setImmediate(cb, null, {
							success: true,
							signatures,
						})
				);
			},

			/**
			 * Description of getTransactions.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			async getTransactions() {
				const transactions = modules.transactionPool.getMergedTransactionList(
					true,
					MAX_SHARED_TRANSACTIONS
				);

				return {
					success: true,
					transactions,
				};
			},

			/**
			 * Description of postTransaction.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			postTransaction(query, cb) {
				__private.receiveTransaction(query.transaction, (err, id) => {
					if (err) {
						return setImmediate(cb, null, {
							success: false,
							message: err.message || 'Transaction was rejected with errors',
							errors: err,
						});
					}

					return setImmediate(cb, null, {
						success: true,
						transactionId: id,
					});
				});
			},

			/**
			 * Description of postTransactions.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			postTransactions(query) {
				if (!library.config.broadcasts.active) {
					return library.logger.debug(
						'Receiving transactions disabled by user through config.json'
					);
				}
				return library.schema.validate(
					query,
					definitions.WSTransactionsRequest,
					err => {
						if (err) {
							return library.logger.debug('Invalid transactions body', err);
						}
						return __private.receiveTransactions(query.transactions);
					}
				);
			},
		};
	}
}

/**
 * Validates signatures body and for each signature calls receiveSignature.
 *
 * @private
 * @implements {__private.receiveSignature}
 * @param {Array} signatures - Array of signatures
 */
__private.receiveSignatures = function(signatures = []) {
	signatures.forEach(signature => {
		__private.receiveSignature(signature, err => {
			if (err) {
				library.logger.debug(err, signature);
			}
		});
	});
};

/**
 * Validates signature with schema and calls getTransactionAndProcessSignature.
 *
 * @private
 * @param {Object} query
 * @param {string} query.signature
 * @param {Object} query.transaction
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.receiveSignature = async function(signature) {
	await promisify(library.schema.validate)(signature, definitions.Signature);
	return modules.transactionPool.getTransactionAndProcessSignature(signature);
};

/**
 * Validates transactions with schema and calls receiveTransaction for each transaction.
 *
 * @private
 * @implements {library.schema.validate}
 * @implements {__private.receiveTransaction}
 * @param {Array} transactions - Array of transactions
 */
__private.receiveTransactions = function(transactions = []) {
	transactions.forEach(transaction => {
		if (transaction) {
			transaction.bundled = true;
		}
		__private.receiveTransaction(transaction, err => {
			if (err) {
				library.logger.debug(convertErrorsToString(err), transaction);
			}
		});
	});
};

/**
 * Normalizes transaction
 * Calls balancesSequence.add to receive transaction and
 * processUnconfirmedTransaction to confirm it.
 *
 * @private
 * @param {transaction} transaction
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.receiveTransaction = async function(transactionJSON, cb) {
	const id = transactionJSON ? transactionJSON.id : 'null';
	let transaction;
	try {
		transaction = modules.interfaceAdapters.transactions.fromJson(
			transactionJSON
		);

		const composedTransactionsCheck = transactionsModule.composeTransactionSteps(
			transactionsModule.checkAllowedTransactions(modules.blocks.lastBlock),
			transactionsModule.validateTransactions(exceptions)
		);

		const { transactionsResponses } = await composedTransactionsCheck([
			transaction,
		]);

		if (transactionsResponses[0].errors.length > 0) {
			throw transactionsResponses[0].errors;
		}
	} catch (errors) {
		const errString = convertErrorsToString(errors);
		library.logger.debug('Transaction normalization failed', {
			id,
			err: errString,
			module: 'transport',
		});

		// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.

		return setImmediate(cb, errors);
	}

	return library.balancesSequence.add(async balancesSequenceCb => {
		library.logger.debug(`Received transaction ${transaction.id}`);

		try {
			await modules.transactionPool.processUnconfirmedTransaction(
				transaction,
				true
			);
			return setImmediate(balancesSequenceCb, null, transaction.id);
		} catch (err) {
			library.logger.debug(`Transaction ${id}`, convertErrorsToString(err));
			if (transaction) {
				library.logger.debug('Transaction', transaction);
			}
			return setImmediate(balancesSequenceCb, err);
		}
	}, cb);
};

// Export
module.exports = Transport;
