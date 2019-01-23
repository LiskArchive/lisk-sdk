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

const { CACHE } = global.constants;
const _ = require('lodash');
const async = require('async');
const apiCodes = require('../helpers/api_codes.js');
const ApiError = require('../helpers/api_error.js');
const sortBy = require('../helpers/sort_by.js').sortBy;
const TransactionPool = require('../logic/transaction_pool.js');
const transactionTypes = require('../helpers/transaction_types.js');
const Transfer = require('../logic/transfer.js');

// Private fields
const __private = {};
let components;
let modules;
let library;
let self;

__private.assetTypes = {};

/**
 * Main transactions methods. Initializes library with scope content and generates a Transfer instance
 * and a TransactionPool instance. Calls logic.transaction.attachAssetType().
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires bluebird
 * @requires lodash
 * @requires helpers/api_codes
 * @requires helpers/api_error
 * @requires helpers/sort_by
 * @requires helpers/transaction_types
 * @requires logic/transaction_pool
 * @requires logic/transfer
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Transactions {
	constructor(cb, scope) {
		library = {
			logger: scope.logger,
			storage: scope.storage,
			schema: scope.schema,
			ed: scope.ed,
			balancesSequence: scope.balancesSequence,
			logic: {
				transaction: scope.logic.transaction,
			},
			genesisBlock: scope.genesisBlock,
			config: {
				version: scope.config.cacheEnabled,
			},
		};

		self = this;

		__private.transactionPool = new TransactionPool(
			scope.config.broadcasts.broadcastInterval,
			scope.config.broadcasts.releaseLimit,
			scope.logic.transaction,
			scope.bus,
			scope.logger,
			scope.balancesSequence,
			scope.config
		);

		__private.assetTypes[
			transactionTypes.SEND
		] = library.logic.transaction.attachAssetType(
			transactionTypes.SEND,
			new Transfer(library.logger, library.schema)
		);

		setImmediate(cb, null, self);
	}
}

// Private methods
/**
 * Counts totals and gets transaction list from `trs_list` view.
 *
 * @private
 * @param {Object} params
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, {transactions, count}
 * @todo Add description for the params
 */
__private.list = async function(params = {}, cb) {
	let filters = {
		id: params.id,
		blockId: params.blockId,
		recipientId: params.recipientId,
		recipientPublicKey: params.recipientPublicKey,
		senderId: params.senderId,
		senderPublicKey: params.senderPublicKey,
		type: params.type,
		height: params.height,
		height_gte: params.fromHeight,
		height_lte: params.toHeight,
		timestamp_gte: params.fromTimestamp,
		timestamp_lte: params.toTimestamp,
		amount_gte: params.minAmount,
		amount_lte: params.maxAmount,
	};

	let options = {
		sort: params.sort,
		limit: params.limit || 100,
		offset: params.offset || 0,
		extended: true,
	};

	if (params.data) {
		filters.data_like = Buffer.from(params.data, 'utf8');
	}

	// Remove filters with null values
	filters = _.pickBy(filters, v => !(v === undefined || v === null));
	options = _.pickBy(options, v => !(v === undefined || v === null));

	if (params.limit > 1000) {
		return setImmediate(cb, 'Invalid limit, maximum is 1000');
	}

	try {
		const count = await library.storage.entities.Transaction.count(filters);
		const transactions = await library.storage.entities.Transaction.get(
			filters,
			options
		);
		const data = {
			transactions,
			count,
		};

		return setImmediate(cb, null, data);
	} catch (error) {
		library.logger.error(error.stack);
		return setImmediate(cb, 'Transactions#list error');
	}
};

/**
 * Gets transactions by calling parameter method.
 * Filters by senderPublicKey or address if they are present.
 *
 * @private
 * @param {Object} method - Transaction pool method
 * @param {Object} filters - Filters applied to results
 * @param {string} filters.id - Transaction id
 * @param {string} filters.recipientId - Recipient id
 * @param {string} filters.recipientPublicKey - Recipient public key
 * @param {string} filters.senderId - Sender id
 * @param {string} filters.senderPublicKey - Sender public key
 * @param {int} filters.type - Transaction type
 * @param {string} filters.sort - Field to sort results by (amount, fee, type, timestamp)
 * @param {int} filters.limit - Limit applied to results
 * @param {int} filters.offset - Offset value for results
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, {transactions, count}
 */
__private.getPooledTransactions = function(method, filters, cb) {
	const transactions = self[method](true);
	let toSend = [];

	if (filters.recipientPublicKey) {
		filters.recipientId = modules.accounts.generateAddressByPublicKey(
			filters.recipientPublicKey
		);
		delete filters.recipientPublicKey;
	}

	// Filter transactions
	if (
		filters.id ||
		filters.recipientId ||
		filters.recipientPublicKey ||
		filters.senderId ||
		filters.senderPublicKey ||
		Object.prototype.hasOwnProperty.call(filters, 'type')
	) {
		toSend = _.filter(
			transactions,
			_.omit(filters, ['limit', 'offset', 'sort'])
		);
	} else {
		toSend = _.cloneDeep(transactions);
	}

	// Sort the results
	const sortAttribute = sortBy(filters.sort, { quoteField: false });

	if (
		sortAttribute.sortField === 'fee' ||
		sortAttribute.sortField === 'amount'
	) {
		/**
		 * sortOrder - Sorting by asc or desc, -1 desc order, 1 is asc order
		 * amount and fee are bignumber here, so in order to sort
		 * we need to use bignumber functions here specific to amount, fee
		 */
		const sortOrder =
			sortAttribute.sortMethod.toLowerCase() === 'desc' ? -1 : 1;
		toSend = toSend.sort((a, b) => {
			if (sortAttribute.sortField === 'fee') {
				return a.fee.minus(b.fee) * sortOrder;
			}
			return a.amount.minus(b.amount) * sortOrder;
		});
	} else {
		toSend = _.orderBy(
			toSend,
			[sortAttribute.sortField],
			[sortAttribute.sortMethod.toLowerCase()]
		);
	}

	// Paginate filtered transactions
	toSend = toSend.slice(filters.offset, filters.offset + filters.limit);

	return setImmediate(cb, null, {
		transactions: toSend,
		count: transactions.length,
	});
};

// Public methods
/**
 * Check if transaction is in pool.
 *
 * @param {string} id - Transaction id
 * @returns {function} Calls transactionPool.transactionInPool
 * @todo Add description for the params
 */
Transactions.prototype.transactionInPool = function(id) {
	return __private.transactionPool.transactionInPool(id);
};

/**
 * Gets unconfirmed transaction from pool.
 *
 * @param {string} id - Transaction id
 * @returns {function} Calls transactionPool.getUnconfirmedTransaction
 * @todo Add description for the function and the params
 */
Transactions.prototype.getUnconfirmedTransaction = function(id) {
	return __private.transactionPool.getUnconfirmedTransaction(id);
};

/**
 * Gets queued transaction from pool.
 *
 * @param {string} id - Transaction id
 * @returns {function} Calls transactionPool.getQueuedTransaction
 * @todo Add description for the function and the params
 */
Transactions.prototype.getQueuedTransaction = function(id) {
	return __private.transactionPool.getQueuedTransaction(id);
};

/**
 * Gets multisignature transaction from pool.
 *
 * @param {string} id - Transaction id
 * @returns {function} Calls transactionPool.getMultisignatureTransaction
 * @todo Add description for the function and the params
 */
Transactions.prototype.getMultisignatureTransaction = function(id) {
	return __private.transactionPool.getMultisignatureTransaction(id);
};

/**
 * Gets unconfirmed transactions based on limit and reverse option.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @returns {function} Calls transactionPool.getUnconfirmedTransactionList
 * @todo Add description for the params
 */
Transactions.prototype.getUnconfirmedTransactionList = function(
	reverse,
	limit
) {
	return __private.transactionPool.getUnconfirmedTransactionList(
		reverse,
		limit
	);
};

/**
 * Gets queued transactions based on limit and reverse option.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @returns {function} Calls transactionPool.getQueuedTransactionList
 * @todo Add description for the params
 */
Transactions.prototype.getQueuedTransactionList = function(reverse, limit) {
	return __private.transactionPool.getQueuedTransactionList(reverse, limit);
};

/**
 * Gets multisignature transactions.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @param {boolean} ready - Limits results to transactions deemed "ready"
 * @returns {function} Calls transactionPool.getQueuedTransactionList
 */
Transactions.prototype.getMultisignatureTransactionList = function(
	reverse,
	limit,
	ready
) {
	return __private.transactionPool.getMultisignatureTransactionList(
		reverse,
		limit,
		ready
	);
};

/**
 * Gets unconfirmed, multisignature and queued transactions based on limit and reverse option.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @returns {function} Calls transactionPool.getMergedTransactionList
 * @todo Add description for the params
 */
Transactions.prototype.getMergedTransactionList = function(reverse, limit) {
	return __private.transactionPool.getMergedTransactionList(reverse, limit);
};

/**
 * Search transactions based on the query parameter passed.
 *
 * @param {Object} filters - Filters applied to results
 * @param {string} filters.id - Transaction id
 * @param {string} filters.blockId - Block id
 * @param {string} filters.recipientId - Recipient id
 * @param {string} filters.recipientPublicKey - Recipient public key
 * @param {string} filters.senderId - Sender id
 * @param {string} filters.senderPublicKey - Sender public key
 * @param {int} filters.transactionType - Transaction type
 * @param {int} filters.fromHeight - From block height
 * @param {int} filters.toHeight - To block height
 * @param {string} filters.minAmount - Minimum amount
 * @param {string} filters.maxAmount - Maximum amount
 * @param {int} filters.fromTimestamp - From transaction timestamp
 * @param {int} filters.toTimestamp - To transaction timestamp
 * @param {string} filters.sort - Field to sort results by
 * @param {int} filters.limit - Limit applied to results
 * @param {int} filters.offset - Offset value for results
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 * @todo Add description for the return value
 */
Transactions.prototype.getTransactions = function(filters, cb) {
	__private.list(filters, (err, data) => {
		if (err) {
			return setImmediate(cb, `Failed to get transactions: ${err}`);
		}
		return setImmediate(cb, null, {
			transactions: data.transactions,
			count: data.count,
		});
	});
};

/**
 * Removes transaction from unconfirmed, queued and multisignature queues.
 *
 * @param {string} id - Transaction id
 * @returns {function} Calls transactionPool.removeUnconfirmedTransaction
 * @todo Add description for the params
 */
Transactions.prototype.removeUnconfirmedTransaction = function(id) {
	return __private.transactionPool.removeUnconfirmedTransaction(id);
};

/**
 * Checks kind of unconfirmed transaction and process it, resets queue if limit reached.
 *
 * @param {transaction} transaction
 * @param {Object} broadcast - Broadcast flag
 * @param {function} cb - Callback function
 * @returns {function} Calls transactionPool.processUnconfirmedTransaction
 * @todo Add description for the params
 */
Transactions.prototype.processUnconfirmedTransaction = function(
	transaction,
	broadcast,
	cb
) {
	return __private.transactionPool.processUnconfirmedTransaction(
		transaction,
		broadcast,
		cb
	);
};

/**
 * Undoes unconfirmed list from queue.
 *
 * @param {function} cb - Callback function
 * @returns {function} Calls transactionPool.undoUnconfirmedList
 */
Transactions.prototype.undoUnconfirmedList = function(cb, tx) {
	return __private.transactionPool.undoUnconfirmedList(cb, tx);
};

/**
 * Applies confirmed transaction.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Transactions.prototype.applyConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	library.logger.debug('Applying confirmed transaction', transaction.id);
	library.logic.transaction.applyConfirmed(transaction, block, sender, cb, tx);
};

/**
 * Undoes confirmed transaction.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Transactions.prototype.undoConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	library.logger.debug('Undoing confirmed transaction', transaction.id);
	library.logic.transaction.undoConfirmed(transaction, block, sender, cb, tx);
};

/**
 * Gets requester if requesterPublicKey and calls applyUnconfirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params and the return value
 */
Transactions.prototype.applyUnconfirmed = function(
	transaction,
	sender,
	cb,
	tx
) {
	library.logger.debug('Applying unconfirmed transaction', transaction.id);

	if (!sender && transaction.blockId !== library.genesisBlock.block.id) {
		return setImmediate(cb, 'Invalid block id');
	}
	if (transaction.requesterPublicKey) {
		return modules.accounts.getAccount(
			{ publicKey: transaction.requesterPublicKey },
			(err, requester) => {
				if (err) {
					return setImmediate(cb, err);
				}

				if (!requester) {
					return setImmediate(cb, 'Requester not found');
				}

				return library.logic.transaction.applyUnconfirmed(
					transaction,
					sender,
					requester,
					cb,
					tx
				);
			},
			tx
		);
	}
	return library.logic.transaction.applyUnconfirmed(
		transaction,
		sender,
		cb,
		tx
	);
};

/**
 * Validates account and undoes unconfirmed transaction.
 *
 * @param {transaction} transaction
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params and the return value
 */
Transactions.prototype.undoUnconfirmed = function(transaction, cb, tx) {
	library.logger.debug('Undoing unconfirmed transaction', transaction.id);

	modules.accounts.getAccount(
		{ publicKey: transaction.senderPublicKey },
		(err, sender) => {
			if (err) {
				return setImmediate(cb, err);
			}
			return library.logic.transaction.undoUnconfirmed(
				transaction,
				sender,
				cb,
				tx
			);
		},
		tx
	);
};

/**
 * Receives transactions.
 *
 * @param {transaction[]} transactions - Array of transactions
 * @param {Object} broadcast - Broadcast flag
 * @param {function} cb - Callback function
 * @returns {function} Calls transactionPool.receiveTransactions
 * @todo Add description for the params
 */
Transactions.prototype.receiveTransactions = function(
	transactions,
	broadcast,
	cb
) {
	return __private.transactionPool.receiveTransactions(
		transactions,
		broadcast,
		cb
	);
};

/**
 * Fills pool.
 *
 * @param {function} cb - Callback function
 * @returns {function} Calls transactionPool.fillPool
 * @todo Add description for the params
 */
Transactions.prototype.fillPool = function(cb) {
	return __private.transactionPool.fillPool(cb);
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded
 */
Transactions.prototype.isLoaded = function() {
	return !!modules;
};

// Events
/**
 * Bounds scope to private transactionPool and modules to private Transfer instance.
 *
 * @param {scope} scope - Loaded modules
 */
Transactions.prototype.onBind = function(scope) {
	components = {
		cache: scope.components,
	};

	modules = {
		accounts: scope.modules.accounts,
		transport: scope.modules.transport,
	};

	__private.transactionPool.bind(
		scope.modules.accounts,
		scope.modules.transactions,
		scope.modules.loader
	);

	__private.assetTypes[transactionTypes.SEND].bind(scope.modules.accounts);
};

/**
 * Processes posted transaction result object.
 *
 * @param {Error} err - Error object
 * @param {Object} res - Result object
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, error, response
 */
__private.processPostResult = function(err, res, cb) {
	let error = null;
	let response = null;

	if (err) {
		error = new ApiError(err, apiCodes.PROCESSING_ERROR);
	} else if (res.success) {
		response = 'Transaction(s) accepted';
	} else {
		error = new ApiError(res.message, apiCodes.PROCESSING_ERROR);
	}

	setImmediate(cb, error, response);
};

// Shared API
/**
 * Public methods, accessible via API.
 *
 * @property {function} getTransactions - Search transactions based on the query parameter passed
 * @property {function} getTransactionsCount
 * @property {function} getUnProcessedTransactions
 * @property {function} getMultisignatureTransactions
 * @property {function} getUnconfirmedTransactions
 * @property {function} postTransactions
 * @todo Add description for the functions
 */
Transactions.prototype.shared = {
	/**
	 * Description of getTransactionsCount.
	 *
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 */
	getTransactionsCount(cb) {
		async.waterfall(
			[
				function getConfirmedCountFromCache(waterCb) {
					if (library.config.cacheEnabled) {
						components.cache.getJsonForKey(
							CACHE.KEYS.transactionCount,
							(err, data) => {
								if (err) {
									// If some issue in cache we will fallback to database
									return setImmediate(waterCb, null, null);
								}

								return setImmediate(waterCb, null, data ? data.confirmed : null);
							}
						);
					}

					return setImmediate(waterCb, null, null);
				},

				function getConfirmedCountFromDb(cachedCount, waterCb) {
					if (cachedCount) {
						return setImmediate(waterCb, null, cachedCount, null);
					}

					return library.storage.entities.Transaction.count().then(
						transactionsCount =>
							setImmediate(waterCb, null, null, transactionsCount)
					);
				},

				function updateConfirmedCountToCache(cachedCount, dbCount, waterCb) {
					if (cachedCount) {
						// Cache already persisted, no need to set cache again
						return setImmediate(waterCb, null, cachedCount);
					}
					if (library.config.cacheEnabled) {
						return components.cache.setJsonForKey(
							CACHE.KEYS.transactionCount,
							{
								confirmed: dbCount,
							},
							err => {
								if (err) {
									library.logger.warn("Transaction count wasn't cached", err);
								}

								return setImmediate(waterCb, null, dbCount);
							}
						);
					}

					return setImmediate(waterCb, null, null);
				},

				function getAllCount(confirmedTransactionCount, waterCb) {
					setImmediate(waterCb, null, {
						confirmed: confirmedTransactionCount,
						unconfirmed: Object.keys(
							__private.transactionPool.unconfirmed.index
						).length,
						unprocessed: Object.keys(__private.transactionPool.queued.index)
							.length,
						unsigned: Object.keys(
							__private.transactionPool.multisignature.index
						).length,
					});
				},
			],
			(err, result) => {
				if (err) {
					library.logger.error('Error in getTransactionsCount', err, result);
					return setImmediate(cb, 'Failed to count transactions');
				}

				result.total =
					result.confirmed +
					result.unconfirmed +
					result.unprocessed +
					result.unsigned;

				return setImmediate(cb, null, result);
			}
		);
	},

	/**
	 * Description of getUnProcessedTransactions.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	getUnProcessedTransactions(filters, cb) {
		return __private.getPooledTransactions(
			'getQueuedTransactionList',
			filters,
			cb
		);
	},

	/**
	 * Description of getMultisignatureTransactions.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	getMultisignatureTransactions(req, cb) {
		return __private.getPooledTransactions(
			'getMultisignatureTransactionList',
			req,
			cb
		);
	},

	/**
	 * Description of getUnconfirmedTransactions.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	getUnconfirmedTransactions(req, cb) {
		return __private.getPooledTransactions(
			'getUnconfirmedTransactionList',
			req,
			cb
		);
	},

	/**
	 * Description of postTransaction.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	postTransaction(transaction, cb) {
		return modules.transport.shared.postTransaction(
			{ transaction },
			(err, res) => {
				__private.processPostResult(err, res, cb);
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
	postTransactions(transactions, cb) {
		return modules.transport.shared.postTransactions(
			{ transactions },
			(err, res) => {
				__private.processPostResult(err, res, cb);
			}
		);
	},
};

// Export
module.exports = Transactions;
