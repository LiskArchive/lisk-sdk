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

function incrementRelays(packet) {
	if (!packet.relays) {
		packet.relays = 0;
	}
	packet.relays++;
}

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
		if (broadcast) {
			// TODO: Remove the relays property as part of the next hard fork. This needs to be set for backwards compatibility.
			incrementRelays(signature);
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
		if (broadcast) {
			// TODO: Remove the relays property as part of the next hard fork. This needs to be set for backwards compatibility.
			incrementRelays(transaction);
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

		// TODO: Remove the relays property as part of the next hard fork. This needs to be set for backwards compatibility.
		incrementRelays(block);

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

				const valid = library.schema.validate(
					query,
					definitions.WSBlocksCommonRequest
				);

				if (!valid) {
					const err = library.schema.getLastErrors();
					const error = `${err[0].message}: ${err[0].path}`;
					library.logger.debug('Common block request validation failed', {
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
					library.logger.debug('Common block request validation failed', {
						err: 'ESCAPE',
						req: query.ids,
					});

					throw new Error('Invalid block id sequence');
				}

				try {
					const row = await library.storage.entities.Block.get({
						id: escapedIds[0],
					});

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
				} catch (error) {
					library.logger.error(error.stack);
					throw new Error('Failed to get common block');
				}
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

				try {
					const data = await modules.blocks.loadBlocksDataWS({
						limit: 34, // 1977100 bytes
						lastId: query.lastBlockId,
					});

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
				} catch (err) {
					return {
						blocks: [],
						message: err,
						success: false,
					};
				}
			},

			/**
			 * Description of postBlock.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			async postBlock(query) {
				if (!library.config.broadcasts.active) {
					return library.logger.debug(
						'Receiving blocks disabled by user through config.json'
					);
				}
				query = query || {};

				const valid = library.schema.validate(
					query,
					definitions.WSBlocksBroadcast
				);

				if (!valid) {
					const err = library.schema.getLastErrors();
					library.logger.debug(
						'Received post block broadcast request in unexpected format',
						{
							err,
							module: 'transport',
							query,
						}
					);
					throw new Error(err);
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
			},

			/**
			 * Description of postSignature.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			async postSignature(query) {
				const valid = library.schema.validate(
					query.signature,
					definitions.Signature
				);

				if (!valid) {
					const err = library.schema.getLastErrors();
					const error = new TransactionError(err[0].message);
					return {
						success: false,
						code: 400,
						errors: [error],
					};
				}

				try {
					await modules.transactionPool.getTransactionAndProcessSignature(
						query.signature
					);
					return { success: true };
				} catch (err) {
					return {
						success: false,
						code: 409,
						errors: err,
					};
				}
			},

			/**
			 * Description of postSignatures.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			async postSignatures(query) {
				if (!library.config.broadcasts.active) {
					return library.logger.debug(
						'Receiving signatures disabled by user through config.json'
					);
				}

				const valid = library.schema.validate(
					query,
					definitions.WSSignaturesList
				);

				if (!valid) {
					const err = library.schema.getLastErrors();
					library.logger.debug('Invalid signatures body', err);
					throw err;
				}

				return __private.receiveSignatures(query.signatures);
			},

			/**
			 * Description of getSignatures.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			async getSignatures() {
				const transactions = modules.transactionPool.getMultisignatureTransactionList(
					true,
					MAX_SHARED_TRANSACTIONS
				);

				const signatures = transactions
					.filter(
						transaction =>
							transaction.signatures && transaction.signatures.length
					)
					.map(transaction => ({
						transaction: transaction.id,
						signatures: transaction.signatures,
					}));

				return {
					success: true,
					signatures,
				};
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
			async postTransaction(query) {
				try {
					const id = await __private.receiveTransaction(query.transaction);
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
			},

			/**
			 * Description of postTransactions.
			 *
			 * @todo Add @param tags
			 * @todo Add @returns tag
			 * @todo Add description of the function
			 */
			async postTransactions(query) {
				if (!library.config.broadcasts.active) {
					return library.logger.debug(
						'Receiving transactions disabled by user through config.json'
					);
				}

				const valid = library.schema.validate(
					query,
					definitions.WSTransactionsRequest
				);

				if (!valid) {
					const err = library.schema.getLastErrors();
					library.logger.debug('Invalid transactions body', err);
					throw err;
				}

				return __private.receiveTransactions(query.transactions);
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
__private.receiveSignatures = async (signatures = []) => {
	// eslint-disable-next-line no-restricted-syntax
	for (const signature of signatures) {
		try {
			// eslint-disable-next-line no-await-in-loop
			await __private.receiveSignature(signature);
		} catch (err) {
			library.logger.debug(err, signature);
		}
	}
};

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
__private.receiveSignature = async signature => {
	const valid = library.schema.validate(signature, definitions.Signature);

	if (!valid) {
		const err = library.schema.getLastErrors();
		throw err;
	}

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
__private.receiveTransactions = async (transactions = []) => {
	// eslint-disable-next-line no-restricted-syntax
	for (const transaction of transactions) {
		try {
			if (transaction) {
				transaction.bundled = true;
			}
			// eslint-disable-next-line no-await-in-loop
			await __private.receiveTransaction(transaction);
		} catch (err) {
			library.logger.debug(convertErrorsToString(err), transaction);
		}
	}
};

/**
 * Normalizes transaction
 * Calls balancesSequence.add to receive transaction and
 * processUnconfirmedTransaction to confirm it.
 *
 * @private
 * @param {transaction} transaction
 * @returns {Promise.<boolean, Error>}
 * @todo Add description for the params
 */
__private.receiveTransaction = async transactionJSON => {
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
		throw errors;
	}

	const balancesSequenceAdd = promisify(
		library.balancesSequence.add.bind(library.balancesSequence)
	);

	return balancesSequenceAdd(async addSequenceCb => {
		library.logger.debug(`Received transaction ${transaction.id}`);

		try {
			await modules.transactionPool.processUnconfirmedTransaction(
				transaction,
				true
			);
			return setImmediate(addSequenceCb, null, transaction.id);
		} catch (err) {
			library.logger.debug(`Transaction ${id}`, convertErrorsToString(err));
			if (transaction) {
				library.logger.debug('Transaction', transaction);
			}
			return setImmediate(addSequenceCb, err);
		}
	});
};

// Export
module.exports = Transport;
