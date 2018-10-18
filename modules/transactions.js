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

const Promise = require('bluebird');
const _ = require('lodash');
const async = require('async');
const apiCodes = require('../helpers/api_codes.js');
const ApiError = require('../helpers/api_error.js');
const sortBy = require('../helpers/sort_by.js').sortBy;
const TransactionPool = require('../logic/transaction_pool.js');
const transactionTypes = require('../helpers/transaction_types.js');
const Transfer = require('../logic/transfer.js');

// Private fields
const { EPOCH_TIME } = global.constants;
const __private = {};
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
			db: scope.db,
			schema: scope.schema,
			ed: scope.ed,
			balancesSequence: scope.balancesSequence,
			logic: {
				transaction: scope.logic.transaction,
			},
			genesisBlock: scope.genesisBlock,
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
 * @param {Object} filter
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, {transactions, count}
 * @todo Add description for the params
 */
__private.list = function(filter, cb) {
	const params = {};
	const where = [];

	if (filter.data) {
		params.additionalData = Buffer.from(filter.data, 'utf8');
	}

	const allowedFieldsMap = {
		senderIdOrRecipientId:
			'("t_senderId" = ${senderIdOrRecipientId} OR "t_recipientId" = ${senderIdOrRecipientId})',
		id: '"t_id" = ${id}',
		blockId: '"t_blockId" = ${blockId}',
		fromHeight: '"b_height" >= ${fromHeight}',
		toHeight: '"b_height" <= ${toHeight}',
		fromTimestamp: '"t_timestamp" >= ${fromTimestamp}',
		toTimestamp: '"t_timestamp" <= ${toTimestamp}',
		senderId: '"t_senderId" IN (${senderId:csv})',
		recipientId: '"t_recipientId" IN (${recipientId:csv})',
		senderPublicKey:
			'ENCODE ("t_senderPublicKey", \'hex\') IN (${senderPublicKey:csv})',
		recipientPublicKey:
			'ENCODE ("m_recipientPublicKey", \'hex\') IN (${recipientPublicKey:csv})',
		minAmount: '"t_amount" >= ${minAmount}',
		maxAmount: '"t_amount" <= ${maxAmount}',
		type: '"t_type" = ${type}',
		minConfirmations: 'confirmations >= ${minConfirmations}',
		data:
			't_id IN (SELECT transfer."transactionId" FROM transfer WHERE transfer.data = ${additionalData})',
		limit: null,
		offset: null,
		sort: null,
		// FIXME: Backward compatibility, should be removed after transitional period
		ownerAddress: null,
		ownerPublicKey: null,
	};
	let owner = '';
	let isFirstWhere = true;

	/**
	 * Description of processParams.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	const processParams = function(value, field) {
		// Mutating parametres when unix timestamp is supplied
		if (_.includes(['fromUnixTime', 'toUnixTime'], field)) {
			// Lisk epoch is 1464109200 as unix timestamp
			value -= EPOCH_TIME.getTime() / 1000;
			field = field.replace('UnixTime', 'Timestamp');
		}

		if (!_.includes(_.keys(allowedFieldsMap), field)) {
			throw new Error(`Parameter is not supported: ${field}`);
		}

		// Checking for empty parameters, 0 is allowed for few
		if (
			!value &&
			!(
				value === 0 &&
				_.includes(
					['fromTimestamp', 'minAmount', 'minConfirmations', 'type', 'offset'],
					field
				)
			)
		) {
			throw new Error(`Value for parameter [${field}] cannot be empty`);
		}

		if (allowedFieldsMap[field]) {
			where.push((!isFirstWhere ? 'AND ' : '') + allowedFieldsMap[field]);
			params[field] = value;
			isFirstWhere = false;
		}
	};

	// Generate list of fields with conditions
	try {
		_.each(filter, processParams);
	} catch (err) {
		return setImmediate(cb, err.message);
	}

	// FIXME: Backward compatibility, should be removed after transitional period
	if (filter.ownerAddress && filter.ownerPublicKey) {
		owner =
			'("t_senderPublicKey" = DECODE (${ownerPublicKey}, \'hex\') OR "t_recipientId" = ${ownerAddress})';
		params.ownerPublicKey = filter.ownerPublicKey;
		params.ownerAddress = filter.ownerAddress;
	}

	if (!filter.limit) {
		params.limit = 100;
	} else {
		params.limit = Math.abs(filter.limit);
	}

	if (!filter.offset) {
		params.offset = 0;
	} else {
		params.offset = Math.abs(filter.offset);
	}

	if (params.limit > 1000) {
		return setImmediate(cb, 'Invalid limit, maximum is 1000');
	}

	const sort = sortBy(filter.sort, {
		sortFields: library.db.transactions.sortFields,
		fieldPrefix(sortField) {
			if (['height'].indexOf(sortField) > -1) {
				return `b_${sortField}`;
			} else if (['confirmations'].indexOf(sortField) > -1) {
				return sortField;
			}
			return `t_${sortField}`;
		},
	});

	if (sort.error) {
		return setImmediate(cb, sort.error);
	}

	let rawTransactionRows;
	let count;

	library.db.transactions
		.countList(
			Object.assign(
				{},
				{
					where,
					owner,
				},
				params
			)
		)
		.then(data => {
			count = data;
			return library.db.transactions.list(
				Object.assign(
					{},
					{
						where,
						owner,
						sortField: sort.sortField,
						sortMethod: sort.sortMethod,
					},
					params
				)
			);
		})
		.then(rows => {
			rawTransactionRows = rows;
			return __private.getAssetForIds(groupTransactionIdsByType(rows));
		})
		.then(rows => {
			const assetRowsByTransactionId = {};
			_.each(rows, row => {
				assetRowsByTransactionId[row.transaction_id] = row;
			});

			const transactions = rawTransactionRows.map(rawTransactionRow =>
				library.logic.transaction.dbRead(
					_.merge(
						rawTransactionRow,
						assetRowsByTransactionId[rawTransactionRow.t_id]
					)
				)
			);

			const data = {
				transactions,
				count,
			};

			return setImmediate(cb, null, data);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Transactions#list error');
		});
};

/**
 * Description of groupTransactionIdsByType.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
function groupTransactionIdsByType(rawTransactions) {
	const groupedTransactions = _.groupBy(rawTransactions, 't_type');
	const transactionIdsByType = _.map(_.keys(groupedTransactions), type => {
		const groupedTransactionsId = {};
		groupedTransactionsId[type] = _.map(groupedTransactions[type], 't_id');
		return groupedTransactionsId;
	});

	return _.assign.apply(null, transactionIdsByType);
}

/**
 * Description of getAssetForIds.
 *
 * @private
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
__private.getAssetForIds = function(idsByType) {
	const assetRawRows = _.values(
		_.mapValues(idsByType, __private.getAssetForIdsBasedOnType)
	);
	return Promise.all(assetRawRows).then(_.flatMap);
};

/**
 * Description of getQueryNameByType.
 *
 * @private
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
__private.getQueryNameByType = function(type) {
	const queryNames = {};
	queryNames[transactionTypes.SEND] = 'getTransferByIds';
	queryNames[transactionTypes.SIGNATURE] = 'getSignatureByIds';
	queryNames[transactionTypes.DELEGATE] = 'getDelegateByIds';
	queryNames[transactionTypes.VOTE] = 'getVotesByIds';
	queryNames[transactionTypes.MULTI] = 'getMultiByIds';
	queryNames[transactionTypes.DAPP] = 'getDappByIds';
	queryNames[transactionTypes.IN_TRANSFER] = 'getInTransferByIds';
	queryNames[transactionTypes.OUT_TRANSFER] = 'getOutTransferByIds';

	const queryName = queryNames[type];
	return queryName;
};

/**
 * Description of getAssetForIdsBasedOnType.
 *
 * @private
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
__private.getAssetForIdsBasedOnType = function(ids, type) {
	const queryName = __private.getQueryNameByType(type);

	return library.db.transactions[queryName](ids);
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
		filters.hasOwnProperty('type')
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
	} else if (transaction.requesterPublicKey) {
		modules.accounts.getAccount(
			{ publicKey: transaction.requesterPublicKey },
			(err, requester) => {
				if (err) {
					return setImmediate(cb, err);
				}

				if (!requester) {
					return setImmediate(cb, 'Requester not found');
				}

				library.logic.transaction.applyUnconfirmed(
					transaction,
					sender,
					requester,
					cb,
					tx
				);
			},
			tx
		);
	} else {
		library.logic.transaction.applyUnconfirmed(transaction, sender, cb, tx);
	}
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
			library.logic.transaction.undoUnconfirmed(transaction, sender, cb, tx);
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
	modules = {
		accounts: scope.accounts,
		transport: scope.transport,
		cache: scope.cache,
	};

	__private.transactionPool.bind(
		scope.accounts,
		scope.transactions,
		scope.loader
	);
	__private.assetTypes[transactionTypes.SEND].bind(scope.accounts);
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
	getTransactions(filters, cb) {
		__private.list(filters, (err, data) => {
			if (err) {
				return setImmediate(cb, `Failed to get transactions: ${err}`);
			}
			return setImmediate(cb, null, {
				transactions: data.transactions,
				count: data.count,
			});
		});
	},

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
					modules.cache.getJsonForKey(
						modules.cache.KEYS.transactionCount,
						(err, data) => {
							if (err) {
								// If some issue in cache we will fallback to database
								return setImmediate(waterCb, null, null);
							}

							return setImmediate(waterCb, null, data ? data.confirmed : null);
						}
					);
				},

				function getConfirmedCountFromDb(cachedCount, waterCb) {
					if (cachedCount) {
						return setImmediate(waterCb, null, cachedCount, null);
					}

					library.db.transactions
						.count()
						.then(transactionsCount =>
							setImmediate(waterCb, null, null, transactionsCount)
						);
				},

				function updateConfirmedCountToCache(cachedCount, dbCount, waterCb) {
					if (cachedCount) {
						// Cache already persisted, no need to set cache again
						return setImmediate(waterCb, null, cachedCount);
					}

					modules.cache.setJsonForKey(
						modules.cache.KEYS.transactionCount,
						{
							confirmed: dbCount,
						},
						err => {
							if (err) {
								library.logger.error(
									'Error writing cache count for transactions',
									err
								);
							}

							return setImmediate(waterCb, null, dbCount);
						}
					);
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
