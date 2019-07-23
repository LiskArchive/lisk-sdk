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
const async = require('async');
const _ = require('lodash');
const { convertErrorsToString } = require('../helpers/error_handlers');
// eslint-disable-next-line prefer-const
let Broadcaster = require('../logic/broadcaster');
const definitions = require('../schema/definitions');
const processTransactionLogic = require('../logic/process_transaction');

const { MAX_SHARED_TRANSACTIONS } = global.constants;

// Private fields
let modules;
let library;
let self;
// eslint-disable-next-line prefer-const
let __private = {};

__private.loaded = false;
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
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Transport {
	constructor(cb, scope) {
		library = {
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			bus: scope.bus,
			schema: scope.schema,
			balancesSequence: scope.balancesSequence,
			logic: {
				block: scope.logic.block,
				initTransaction: scope.logic.initTransaction,
			},
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
		self = this;

		__private.broadcaster = new Broadcaster(
			scope.config.nonce,
			scope.config.broadcasts,
			scope.config.forging.force,
			scope.logic.initTransaction,
			scope.components.logger,
			scope.channel,
			scope.components.storage
		);

		setImmediate(cb, null, self);
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
__private.receiveSignature = function(signature, cb) {
	library.schema.validate(signature, definitions.Signature, err => {
		if (err) {
			return setImmediate(cb, [new TransactionError(err[0].message)], 400);
		}
		library.logger.debug(
			`Received signature for transaction ${signature.transactionId}`
		);

		return modules.multisignatures.getTransactionAndProcessSignature(
			signature,
			errors => {
				if (errors) {
					return setImmediate(cb, errors, 409);
				}
				return setImmediate(cb);
			}
		);
	});
};

/**
 * Validates transactions with schema and calls receiveTransaction for each transaction.
 *
 * @private
 * @implements {library.schema.validate}
 * @implements {__private.receiveTransaction}
 * @param {Array} transactions - Array of transactions
 * @param {string} extraLogMessage - Extra log message
 */
__private.receiveTransactions = function(transactions = [], extraLogMessage) {
	transactions.forEach(transaction => {
		if (transaction) {
			transaction.bundled = true;
		}
		__private.receiveTransaction(transaction, extraLogMessage, err => {
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
 * @param {string} extraLogMessage - Extra log message
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.receiveTransaction = async function(
	transactionJSON,
	extraLogMessage,
	cb
) {
	const id = transactionJSON ? transactionJSON.id : 'null';
	let transaction;
	try {
		transaction = library.logic.initTransaction.fromJson(transactionJSON);

		const composedTransactionsCheck = processTransactionLogic.composeTransactionSteps(
			modules.processTransactions.checkAllowedTransactions,
			modules.processTransactions.validateTransactions
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
	library.logger.debug(`Received transaction ${transaction.id}`);

	return modules.transactions.processUnconfirmedTransaction(
		transaction,
		true,
		err => {
			if (err) {
				library.logger.debug(`Transaction ${id}`, convertErrorsToString(err));
				if (transaction) {
					library.logger.debug('Transaction', transaction);
				}
				return setImmediate(cb, err);
			}

			return setImmediate(cb, null, transaction.id);
		}
	);
};

// Events
/**
 * Bounds scope to private broadcaster amd initialize modules.
 *
 * @param {modules} scope - Exposed modules
 */
Transport.prototype.onBind = function(scope) {
	modules = {
		blocks: scope.modules.blocks,
		dapps: scope.modules.dapps,
		loader: scope.modules.loader,
		multisignatures: scope.modules.multisignatures,
		peers: scope.modules.peers,
		transactions: scope.modules.transactions,
		processTransactions: scope.modules.processTransactions,
	};

	__private.broadcaster.bind(
		scope.modules.transport,
		scope.modules.transactions
	);
};

/**
 * Sets private variable loaded to true.
 */
Transport.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Calls enqueue signatures and emits a 'signature/change' socket message.
 *
 * @param {signature} signature
 * @param {Object} broadcast
 * @emits signature/change
 * @todo Add description for the params
 */
Transport.prototype.onSignature = function(signature, broadcast) {
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
};

/**
 * Calls enqueue transactions and emits a 'transactions/change' socket message.
 *
 * @param {transaction} transaction
 * @param {Object} broadcast
 * @emits transactions/change
 * @todo Add description for the params
 */
Transport.prototype.onUnconfirmedTransaction = function(
	transaction,
	broadcast
) {
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
};

/**
 * Calls broadcast blocks and emits a 'blocks/change' socket message.
 *
 * @param {Object} block - Reduced block object
 * @param {boolean} broadcast - Signal flag for broadcast
 * @emits blocks/change
 */
Transport.prototype.onBroadcastBlock = function(block, broadcast) {
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
};

/**
 * Sets loaded to false.
 *
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Transport.prototype.cleanup = function() {
	__private.loaded = false;
};

/**
 * Returns true if modules are loaded and private variable loaded is true.
 *
 * @returns {boolean}
 * @todo Add description for the return value
 */
Transport.prototype.isLoaded = function() {
	return modules && __private.loaded;
};

// Internal API
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
Transport.prototype.shared = {
	/**
	 * Description of blocksCommon.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	blocksCommon(query, cb) {
		query = query || {};
		return library.schema.validate(
			query,
			definitions.WSBlocksCommonRequest,
			err => {
				if (err) {
					err = `${err[0].message}: ${err[0].path}`;
					library.logger.debug('Common block request validation failed', {
						err: err.toString(),
						req: query,
					});
					return setImmediate(cb, err);
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

					return setImmediate(cb, 'Invalid block id sequence');
				}

				return library.storage.entities.Block.get({
					id: escapedIds[0],
				})
					.then(row => {
						if (!row.length > 0) {
							return setImmediate(cb, null, {
								success: true,
								common: null,
							});
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

						return setImmediate(cb, null, {
							success: true,
							common: parsedRow,
						});
					})
					.catch(getOneError => {
						library.logger.error(getOneError.stack);
						return setImmediate(cb, 'Failed to get common block');
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
	blocks(query, cb) {
		// Get 34 blocks with all data (joins) from provided block id
		// According to maxium payload of 58150 bytes per block with every transaction being a vote
		// Discounting maxium compression setting used in middleware
		// Maximum transport payload = 2000000 bytes
		if (!query || !query.lastBlockId) {
			return setImmediate(cb, null, {
				success: false,
				message: 'Invalid lastBlockId requested',
			});
		}

		modules.blocks.utils.loadBlocksDataWS(
			{
				limit: 34, // 1977100 bytes
				lastId: query.lastBlockId,
			},
			(err, data) => {
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
				if (err) {
					return setImmediate(cb, null, {
						blocks: [],
						message: err,
						success: false,
					});
				}

				return setImmediate(cb, null, { blocks: data, success: true });
			}
		);
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
					block = modules.blocks.verify.addBlockProperties(query.block);

					// Instantiate transaction classes
					block.transactions = library.logic.initTransaction.fromBlock(block);

					block = library.logic.block.objectNormalize(block);
				} catch (e) {
					success = false;
					library.logger.debug('Block normalization failed', {
						err: e.toString(),
						module: 'transport',
						block: query.block,
					});

					// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
				}

				if (success) {
					library.bus.message('receiveBlock', block);
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
	postSignature(query, cb) {
		__private.receiveSignature(query.signature, (err, code) => {
			if (err) {
				return setImmediate(cb, null, {
					success: false,
					code,
					errors: err,
				});
			}
			return setImmediate(cb, null, {
				success: true,
			});
		});
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
		return library.schema.validate(query, definitions.WSSignaturesList, err => {
			if (err) {
				return library.logger.debug('Invalid signatures body', err);
			}
			return __private.receiveSignatures(query.signatures);
		});
	},

	/**
	 * Description of getSignatures.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	getSignatures(cb) {
		const transactions = modules.transactions.getMultisignatureTransactionList(
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
	getTransactions(cb) {
		const transactions = modules.transactions.getMergedTransactionList(
			true,
			MAX_SHARED_TRANSACTIONS
		);
		return setImmediate(cb, null, {
			success: true,
			transactions,
		});
	},

	/**
	 * Description of postTransaction.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	postTransaction(query, cb) {
		__private.receiveTransaction(
			query.transaction,
			query.extraLogMessage,
			(err, id) => {
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
			}
		);
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
				return __private.receiveTransactions(
					query.transactions,
					query.extraLogMessage
				);
			}
		);
	},
};

// Export
module.exports = Transport;
