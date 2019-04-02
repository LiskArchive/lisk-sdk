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
const async = require('async');
const {
	CACHE_KEYS_TRANSACTION_COUNT,
} = require('../../../../../framework/src/components/cache');
const TransactionPool = require('../logic/transaction_pool.js');

// Private fields
const __private = {};
let components;
let modules;
let library;
let self;

__private.assetTypes = {};

/**
 * Main transactions methods. Initializes library with scope content and generates a Transfer instance
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires bluebird
 * @requires lodash
 * @requires logic/transaction_pool
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
class Transactions {
	constructor(cb, scope) {
		library = {
			logger: scope.components.logger,
			storage: scope.components.storage,
			schema: scope.schema,
			ed: scope.ed,
			balancesSequence: scope.balancesSequence,
			logic: {
				initTransaction: scope.logic.initTransaction,
			},
			genesisBlock: scope.genesisBlock,
		};

		self = this;

		__private.transactionPool = new TransactionPool(
			scope.config.broadcasts.broadcastInterval,
			scope.config.broadcasts.releaseLimit,
			scope.components.logger,
			scope.config
		);

		setImmediate(cb, null, self);
	}
}

// Private methods
/**
 * Counts totals and gets transaction list from storage component.
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
	const sortAttribute = self.sortBy(filters.sort, { quoteField: false });

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

/**
 * Validates sort options, methods and fields.
 *
 * @param {string|Object} sort
 * @param {Object} [options]
 * @param {string} options.fieldPrefix
 * @param {string} options.sortField
 * @param {string} options.sortMethod - asc / desc
 * @param {Array} options.sortFields
 * @returns {Object} {error} | {sortField, sortMethod}
 * @todo Add description for the params
 */
Transactions.prototype.sortBy = function(sort, options) {
	options = typeof options === 'object' ? options : {};
	options.sortField = options.sortField || null;
	options.sortMethod = options.sortMethod || null;
	options.sortFields = Array.isArray(options.sortFields)
		? options.sortFields
		: [];

	if (typeof options.quoteField === 'undefined') {
		options.quoteField = true;
	} else {
		options.quoteField = Boolean(options.quoteField);
	}

	let sortField;
	let sortMethod;

	if (typeof sort === 'string') {
		const [field, order] = sort.split(':');
		sortField = field.replace(/[^\w\s]/gi, '');
		sortMethod = order === 'desc' ? 'DESC' : 'ASC';
	} else if (typeof sort === 'object') {
		const keys = Object.keys(sort);

		if (keys.length === 0) {
			return self.sortBy('');
		}
		if (keys.length === 1) {
			return self.sortBy(
				`${keys[0]}:${sort[keys[0]] === -1 ? 'desc' : 'asc'}`,
				options
			);
		}
		const sortFields = [];
		const sortMethods = [];
		keys.forEach(key => {
			const sortResult = self.sortBy(
				`${key}:${sort[key] === -1 ? 'desc' : 'asc'}`,
				options
			);
			sortFields.push(sortResult.sortField);
			sortMethods.push(sortResult.sortMethod);
		});
		return { sortField: sortFields, sortMethod: sortMethods };
	}
	/**
	 * Description of the function.
	 *
	 * @private
	 * @todo Add param-tag and descriptions
	 * @todo Add @returns tag
	 * @todo Add description for the function
	 */
	function prefixField(prefixSortedField) {
		if (!prefixSortedField) {
			return prefixSortedField;
		}
		if (typeof options.fieldPrefix === 'string') {
			return options.fieldPrefix + prefixSortedField;
		}
		if (typeof options.fieldPrefix === 'function') {
			return options.fieldPrefix(prefixSortedField);
		}
		return prefixSortedField;
	}

	/**
	 * Description of the function.
	 *
	 * @private
	 * @todo Add param-tag and descriptions
	 * @todo Add @returns tag
	 * @todo Add description for the function
	 */
	function quoteField(quoteSortedField) {
		if (quoteSortedField && options.quoteField) {
			return `"${sortField}"`;
		}
		return quoteSortedField;
	}

	const emptyWhiteList = options.sortFields.length === 0;

	const inWhiteList =
		options.sortFields.length >= 1 &&
		options.sortFields.indexOf(sortField) > -1;

	if (sortField) {
		if (emptyWhiteList || inWhiteList) {
			sortField = prefixField(sortField);
		} else {
			return {
				error: 'Invalid sort field',
			};
		}
	} else {
		sortField = prefixField(options.sortField);
	}

	if (!sortMethod) {
		sortMethod = options.sortMethod;
	}

	return {
		sortField: quoteField(sortField) || '',
		sortMethod: sortField ? sortMethod : '',
	};
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
			return setImmediate(cb, new Error(`Failed to get transactions: ${err}`));
		}
		return setImmediate(cb, null, {
			transactions: data.transactions,
			count: data.count,
		});
	});
};

/**
 * Adds the transactions in the transaction pool which were part of the blockchain but the block got deleted
 * @param {transactions} transactions
 */
Transactions.prototype.onDeletedTransactions = function(transactions) {
	__private.transactionPool.onDeletedTransactions(transactions);
};

/**
 * Removes the transactions from the transaction pool which were included in block
 * @param {transactions} transactions
 */
Transactions.prototype.onConfirmedTransactions = function(transactions) {
	__private.transactionPool.onConfirmedTransactions(transactions);
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
		cache: scope.components ? scope.components.cache : undefined,
	};

	modules = {
		accounts: scope.modules.accounts,
		transport: scope.modules.transport,
	};

	__private.transactionPool.bind(
		scope.modules.processTransactions,
		scope.modules.loader
	);
};

// Shared API
/**
 * Public methods, accessible via API.
 *
 * @property {function} getTransactions - Search transactions based on the query parameter passed
 * @property {function} getTransactionsCount
 * @property {function} getTransactionsFromPool
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
					if (components.cache) {
						return components.cache
							.getJsonForKey(CACHE_KEYS_TRANSACTION_COUNT)
							.then(data => {
								setImmediate(waterCb, null, data ? data.confirmed : null);
							})
							.catch(err => {
								library.logger.warn("Transaction count wasn't cached", err);
								setImmediate(waterCb, null, null);
							});
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
					if (components.cache) {
						return components.cache
							.setJsonForKey(CACHE_KEYS_TRANSACTION_COUNT, {
								confirmed: dbCount,
							})
							.then(() => setImmediate(waterCb, null, dbCount))
							.catch(err => {
								library.logger.warn("Transaction count wasn't cached", err);
								return setImmediate(waterCb, null, dbCount);
							});
					}

					return setImmediate(waterCb, null, null);
				},

				function getAllCount(confirmedTransactionCount, waterCb) {
					setImmediate(waterCb, null, {
						confirmed: confirmedTransactionCount,
						unconfirmed: __private.transactionPool.getCountByQueue('ready'),
						unprocessed: __private.transactionPool.getCountByQueue('verified'),
						unsigned: __private.transactionPool.getCountByQueue('pending'),
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
	 * Retrieve specific type of transactions from transaction pool.
	 *
	 * @param {string} type Type of transaction retrieved from transaction pool
	 * @param {object} filters
	 * @param {function} cb
	 */
	getTransactionsFromPool(type, filters, cb) {
		const typeMap = {
			unprocessed: 'getQueuedTransactionList',
			unconfirmed: 'getUnconfirmedTransactionList',
			unsigned: 'getMultisignatureTransactionList',
		};

		return __private.getPooledTransactions(typeMap[type], filters, cb);
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
			(err, res) => setImmediate(cb, err, res)
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
			(err, res) => setImmediate(cb, err, res)
		);
	},
};

// Export
module.exports = Transactions;
