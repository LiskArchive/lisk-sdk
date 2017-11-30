'use strict';

var _ = require('lodash');
var async = require('async');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var extend = require('extend');
var apiCodes = require('../helpers/apiCodes.js');
var ApiError = require('../helpers/apiError.js');
var sortBy = require('../helpers/sort_by.js').sortBy;
var schema = require('../schema/transactions.js');
var sql = require('../sql/transactions.js');
var TransactionPool = require('../logic/transactions/pool.js');
var transactionTypes = require('../helpers/transactionTypes.js');
var Transfer = require('../logic/transfer.js');
var Promise = require('bluebird');

// Private fields
var __private = {};
var shared = {};
var modules;
var library;
var self;

__private.assetTypes = {};

/**
 * Initializes library with scope content and generates a Transfer instance.
 * Calls logic.transaction.attachAssetType().
 * @memberof module:transactions
 * @class
 * @classdesc Main transactions methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Transactions (cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		schema: scope.schema,
		ed: scope.ed,
		balancesSequence: scope.balancesSequence,
		logic: {
			transaction: scope.logic.transaction,
			transactionPool: scope.logic.transactionPool,
		},
		genesisblock: scope.genesisblock
	};

	self = this;

	__private.assetTypes[transactionTypes.SEND] = library.logic.transaction.attachAssetType(
		transactionTypes.SEND, new Transfer(library.logger, library.schema)
	);

	setImmediate(cb, null, self);
}

// Private methods
/**
 * Counts totals and gets a transaction list from the db.
 * @private
 * @param {Object} filter - Filter object.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | data: {transactions, count}
 */
__private.list = function (filter, cb) {
	var params = {};
	var where = [];
	var allowedFieldsMap = {
		id:                  '"t_id" = ${id}',
		blockId:             '"t_blockId" = ${blockId}',
		fromHeight:          '"b_height" >= ${fromHeight}',
		toHeight:            '"b_height" <= ${toHeight}',
		fromTimestamp:       '"t_timestamp" >= ${fromTimestamp}',
		toTimestamp:         '"t_timestamp" <= ${toTimestamp}',
		senderId:            '"t_senderId" IN (${senderId:csv})',
		recipientId:         '"t_recipientId" IN (${recipientId:csv})',
		senderPublicKey:     'ENCODE ("t_senderPublicKey", \'hex\') IN (${senderPublicKey:csv})',
		recipientPublicKey:  'ENCODE ("m_recipientPublicKey", \'hex\') IN (${recipientPublicKey:csv})',
		minAmount:           '"t_amount" >= ${minAmount}',
		maxAmount:           '"t_amount" <= ${maxAmount}',
		type:                '"t_type" = ${type}',
		minConfirmations:    'confirmations >= ${minConfirmations}',
		limit: null,
		offset: null,
		sort: null,
		// FIXME: Backward compatibility, should be removed after transitional period
		ownerAddress: null,
		ownerPublicKey: null
	};
	var owner = '';
	var isFirstWhere = true;

	var processParams = function (value, field) {
		// Mutating parametres when unix timestamp is supplied
		if (_.includes(['fromUnixTime', 'toUnixTime'], field)) {
			// Lisk epoch is 1464109200 as unix timestamp
			value = value - constants.epochTime.getTime() / 1000;
			field = field.replace('UnixTime', 'Timestamp');
		}

		if (!_.includes(_.keys(allowedFieldsMap), field)) {
			throw new Error('Parameter is not supported: ' + field);
		}

		// Checking for empty parameters, 0 is allowed for few
		if (!value && !(value === 0 && _.includes(['fromTimestamp', 'minAmount', 'minConfirmations', 'type', 'offset'], field))) {
			throw new Error('Value for parameter [' + field + '] cannot be empty');
		}

		if (allowedFieldsMap[field]) {
			where.push((!isFirstWhere ? ('AND ') : '') + allowedFieldsMap[field]);
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
		owner = '("t_senderPublicKey" = DECODE (${ownerPublicKey}, \'hex\') OR "t_recipientId" = ${ownerAddress})';
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

	var sort = sortBy(
		filter.sort, {
			sortFields: sql.sortFields,
			fieldPrefix: function (sortField) {
				if (['height'].indexOf(sortField) > -1) {
					return 'b_' + sortField;
				} else if (['confirmations'].indexOf(sortField) > -1) {
					return sortField;
				} else {
					return 't_' + sortField;
				}
			}
		}
	);

	if (sort.error) {
		return setImmediate(cb, sort.error);
	}

	var rawTransactionRows;
	var count;

	library.db.query(sql.countList({
		where: where,
		owner: owner
	}), params).then(function (rows) {
		count = rows.length ? rows[0].count : 0;
		return library.db.query(sql.list({
			where: where,
			owner: owner,
			sortField: sort.sortField,
			sortMethod: sort.sortMethod
		}), params);
	}).then(function (rows) {
		rawTransactionRows = rows;
		return __private.getAssetForIds(groupTransactionIdsByType(rows));
	}).then(function (rows) {
		var assetRowsByTransactionId = {};
		_.each(rows, function (row) {
			assetRowsByTransactionId[row.transaction_id] = row;
		});

		var transactions = rawTransactionRows.map(function (rawTransactionRow) {
			return library.logic.transaction.dbRead(_.merge(rawTransactionRow, assetRowsByTransactionId[rawTransactionRow.t_id]));
		});

		var data = {
			transactions: transactions,
			count: count
		};

		return setImmediate(cb, null, data);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Transactions#list error');
	});
};

function groupTransactionIdsByType (rawTransactions) {
	var groupedTransactions = _.groupBy(rawTransactions, 't_type');
	var transactionIdsByType = _.map(_.keys(groupedTransactions), function (type) {
		var groupedTransactionsId = {};
		groupedTransactionsId[type] = _.map(groupedTransactions[type], 't_id');
		return groupedTransactionsId;
	});

	return _.assign.apply(null, transactionIdsByType);
}

__private.getAssetForIds = function (idsByType) {
	var assetRawRows = _.values(_.mapValues(idsByType, __private.getAssetForIdsBasedOnType));
	return Promise.all(assetRawRows).then(_.flatMap);
};

__private.getQueryNameByType = function (type) {
	var queryNames = {};
	queryNames[transactionTypes.SEND] = 'getTransferByIds';
	queryNames[transactionTypes.SIGNATURE] = 'getSignatureByIds';
	queryNames[transactionTypes.DELEGATE] = 'getDelegateByIds';
	queryNames[transactionTypes.VOTE] = 'getVotesByIds';
	queryNames[transactionTypes.MULTI] = 'getMultiByIds';
	queryNames[transactionTypes.DAPP] = 'getDappByIds';
	queryNames[transactionTypes.IN_TRANSFER] = 'getInTransferByIds';
	queryNames[transactionTypes.OUT_TRANSFER] = 'getOutTransferByIds';

	var queryName = queryNames[type];
	return queryName;
};

__private.getAssetForIdsBasedOnType = function (ids, type) {
	var queryName = __private.getQueryNameByType(type);

	return library.db.query(sql[queryName], {id: ids});
};

/**
 * Gets a transaction from the pool.
 * @private
 * @param {Object} method - Pool list method.
 * @param {Object} req - Request object.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | data: {transaction}
 */
__private.getPooledTransaction = function (method, req, cb) {
	library.schema.validate(req.body, schema.getPooledTransaction, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var transaction = self[method](req.body.id);

		if (!transaction) {
			return setImmediate(cb, 'Transaction not found');
		}

		return setImmediate(cb, null, {transaction: transaction});
	});
};

/**
 * Gets pooled transactions.
 * Filters by senderPublicKey or address if they are present.
 * @private
 * @param {Object} method - Pool list method.
 * @param {Object} req - Request object.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | data: {transactions, count}
 */
__private.getPooledTransactions = function (method, req, cb) {
	library.schema.validate(req.body, schema.getPooledTransactions, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var transactions = self[method](true);
		var i, toSend = [];

		if (req.body.senderPublicKey || req.body.address) {
			for (i = 0; i < transactions.length; i++) {
				if (transactions[i].senderPublicKey === req.body.senderPublicKey || transactions[i].recipientId === req.body.address) {
					toSend.push(transactions[i]);
				}
			}
		} else {
			for (i = 0; i < transactions.length; i++) {
				toSend.push(transactions[i]);
			}
		}

		return setImmediate(cb, null, {transactions: toSend, count: transactions.length});
	});
};

// Public methods
/**
 * Checks if a transaction is in the pool.
 * @implements {transactionPool.get}
 * @param {string} id - Transaction id.
 * @return {boolean} False if transaction not in pool.
 */
Transactions.prototype.transactionInPool = function (id) {
	var transaction = library.logic.transactionPool.get(id);
	return transaction.status === 'Transaction not in pool' ? false : true;
};

/**
 * Gets a transaction from the pool, and checks if it's pending signatures.
 * @implements {transactionPool.get}
 * @param {string} id - Transaction id.
 * @return {transaction|undefined} Transaction object or undefined.
 */
Transactions.prototype.getMultisignatureTransaction = function (id) {
	var transaction = library.logic.transactionPool.get(id);
	return transaction.status === 'pending' ? transaction.transaction : undefined;
};

/**
 * Gets unconfirmed transactions, with a limit option.
 * @implements {transactionPool.getReady}
 * @param {number} limit - Limit applied to results.
 * @return {transaction[]} Calls transactionPool.getReady
 */
Transactions.prototype.getUnconfirmedTransactionList = function (limit) {
	return library.logic.transactionPool.getReady(limit);
};

/**
 * Gets queued transactions, with limit and reverse options.
 * @implements {transactionPool.getAll}
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @return {transaction[]} Calls transactionPool.getAll
 */
Transactions.prototype.getQueuedTransactionList = function (reverse, limit) {
	return library.logic.transactionPool.getAll('unverified', {reverse: reverse, limit: limit});
};

/**
 * Gets multisignature transactions, with a limit option.
 * @implements {transactionPool.getAll}
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @return {transaction[]} Calls transactionPool.getQueuedTransactionList
 */
Transactions.prototype.getMultisignatureTransactionList = function (reverse, limit) {
	return library.logic.transactionPool.getAll('pending', {reverse: reverse, limit: limit});
};

/**
 * Gets ready, pending and unverified transactions, with limit and reverse options.
 * @implements {transactionPool.getMergedTransactionList}
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @return {transaction[]} Calls transactionPool.getMergedTransactionList
 */
Transactions.prototype.getMergedTransactionList = function (reverse, limit) {
	return library.logic.transactionPool.getMergedTransactionList(reverse, limit);
};

/**
 * Removes an unconfirmed transaction from the pool.
 * @implements {transactionPool.delete}
 * @param {string} id - Transaction id.
 * @return {boolean} Calls transactionPool.delete
 */
Transactions.prototype.removeUnconfirmedTransaction = function (id) {
	return library.logic.transactionPool.delete(id);
};

/**
 * Removes transactions from the pool if they are present, and rechecks pool balance for sender.
 * @implements {transactionPool.sanitazeTransactions}
 * @param {[transaction]} transactions - Array of transactions.
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.sanitizeTransactions
 */
Transactions.prototype.sanitizeTransactionPool = function (transactions, cb) {
	return library.logic.transactionPool.sanitizeTransactions(transactions, cb);
};

/**
 * Adds a transaction to the pool if it passes all validations.
 * @implements {transactionPool.addFromPublic}
 * @param {string} caller - Name of caller: 'peer' or 'public'.
 * @param {object} transaction - Transaction object.
 * @param {boolean} broadcast - Broadcast flag.
 * @param {function} cb - Callback function.
 */
Transactions.prototype.processUnconfirmedTransaction = function (caller, transaction, broadcast, cb) {
	if (caller === 'public') {
		return library.logic.transactionPool.addFromPublic(transaction, broadcast, cb);
	}
	return library.logic.transactionPool.addFromPeer(transaction, broadcast, cb);
};

/**
 * Adds a transaction to pool list for later processing by processPool worker.
 * @implements {transactionPool.addFromPeer}
 * @param {array} transactions - Transactions received from peer.
 * @param {boolean} broadcast - Broadcast flag.
 * @param {function} cb - Callback function.
 */
Transactions.prototype.processPeerTransactions = function (transactions, broadcast, cb) {
	return library.logic.transactionPool.addFromPeer(transactions, broadcast, cb);
};

// TODO: Remove this function
/**
 * Gets unconfirmed transactions list and applies unconfirmed transactions.
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.applyUnconfirmedList
 */
Transactions.prototype.applyUnconfirmedList = function (cb) {
	return __private.transactionPool.applyUnconfirmedList(cb);
};

// TODO: Remove this function
/**
 * Applies unconfirmed list to unconfirmed Ids.
 * @param {string[]} ids - Transaction IDs.
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.applyUnconfirmedIds
 */
Transactions.prototype.applyUnconfirmedIds = function (ids, cb) {
	cb();
};

// TODO: Remove this function
/**
 * Undoes unconfirmed list from queue.
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.undoUnconfirmedList
 */
Transactions.prototype.undoUnconfirmedList = function (cb) {
	cb();
};

/**
 * Applies confirmed transaction.
 * @implements {logic.transaction.apply}
 * @param {transaction} transaction - Transaction being applied.
 * @param {object} block - Block that transaction is being applied within.
 * @param {object} sender - Sender account.
 * @param {function} cb - Callback function.
 */
Transactions.prototype.apply = function (transaction, block, sender, cb) {
	library.logger.debug('Applying confirmed transaction', transaction.id);
	library.logic.transaction.apply(transaction, block, sender, cb);
};

/**
 * Undoes confirmed transaction.
 * @implements {logic.transaction.undo}
 * @param {transaction} transaction - Transaction being undone.
 * @param {object} block - Block that transaction is being undone within.
 * @param {object} sender - Sender account.
 * @param {function} cb - Callback function.
 */
Transactions.prototype.undo = function (transaction, block, sender, cb) {
	library.logger.debug('Undoing confirmed transaction', transaction.id);
	library.logic.transaction.undo(transaction, block, sender, cb);
};

/**
 * Gets requester if requesterPublicKey and calls applyUnconfirmed.
 * @implements {modules.accounts.getAccount}
 * @implements {logic.transaction.applyUnconfirmed}
 * @param {object} transaction - Transaction object.
 * @param {object} sender - Sender account.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} For error.
 */
Transactions.prototype.applyUnconfirmed = function (transaction, sender, cb) {
	library.logger.debug('Applying unconfirmed transaction', transaction.id);

	// TODO: Remove applyUnconfirmed entirely
	return setImmediate(cb);

	if (!sender && transaction.blockId !== library.genesisblock.block.id) {
		return setImmediate(cb, 'Invalid block id');
	} else {
		if (transaction.requesterPublicKey) {
			modules.accounts.getAccount({publicKey: transaction.requesterPublicKey}, function (err, requester) {
				if (err) {
					return setImmediate(cb, err);
				}

				if (!requester) {
					return setImmediate(cb, 'Requester not found');
				}

				library.logic.transaction.applyUnconfirmed(transaction, sender, requester, cb);
			});
		} else {
			library.logic.transaction.applyUnconfirmed(transaction, sender, cb);
		}
	}
};

/**
 * Validates account and undoes unconfirmed transaction.
 * @implements {modules.accounts.getAccount}
 * @implements {logic.transaction.undoUnconfirmed}
 * @param {object} transaction - Transaction object.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} For error.
 */
Transactions.prototype.undoUnconfirmed = function (transaction, cb) {
	library.logger.debug('Undoing unconfirmed transaction', transaction.id);

	modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
		if (err) {
			return setImmediate(cb, err);
		}
		library.logic.transaction.undoUnconfirmed(transaction, sender, cb);
	});
};

// TODO: Remove this function
/**
 * Receives transactions.
 * @param {array} transactions - Received transactions.
 * @param {boolean} broadcast - Broadcast flag.
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.receiveTransactions
 */
Transactions.prototype.receiveTransactions = function (transactions, broadcast, cb) {
	return library.logic.transactionPool.receiveTransactions(transactions, broadcast, cb);
};

/**
 * Fills pool.
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.processPool
 */
Transactions.prototype.processPool = function (cb) {
	return library.logic.transactionPool.processPool(cb);
};

/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
Transactions.prototype.isLoaded = function () {
	return !!modules;
};

// Events
/**
 * Bounds scope to private transactionPool and modules
 * to private Transfer instance.
 * @implements module:transactions#Transfer~bind
 * @param {scope} scope - Loaded modules.
 */
Transactions.prototype.onBind = function (scope) {
	modules = {
		accounts: scope.accounts,
		transport: scope.transport
	};

	library.logic.transactionPool.bind(
		scope.accounts
	);
	__private.assetTypes[transactionTypes.SEND].bind(
		scope.accounts
	);
};

// Shared API
/**
 * @todo Implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Transactions.prototype.shared = {
	getTransactions: function (req, cb) {
		async.waterfall([
			function (waterCb) {
				// Query parameters which can have 1 or multiple values are parsed as strings when the have 1 value. We need to convert string into an array of length 1
				_.each(req.body, function (value, key) {
					// Deal with parameters which must be array to array if they are string
					if (_.includes(['senderId', 'recipientId', 'senderPublicKey', 'recipientPublicKey'], key) && typeof value === 'string') {
						req.body[key] = [value];
					}
				});

				library.schema.validate(req.body, schema.getTransactions, function (err) {
					if (err) {
						return setImmediate(waterCb, err[0].message);
					} else {
						return setImmediate(waterCb, null);
					}
				});
			},
			function (waterCb) {
				__private.list(req.body, function (err, data) {
					if (err) {
						return setImmediate(waterCb, 'Failed to get transactions: ' + err);
					} else {
						return setImmediate(waterCb, null, {transactions: data.transactions, count: data.count});
					}
				});
			}
		], function (err, res) {
			function mapOldResponseStructureToNew (err, res, cb) {
				var error = null;
				var response = null;

				if (err) {
					error = new ApiError(err, apiCodes.BAD_REQUEST);
				}

				if (res) {
					response = res;
				}

				return setImmediate(cb, error, response);
			}

			return mapOldResponseStructureToNew(err, res, cb);
		});
	},

	getTransactionsCount: function (req, cb) {
		library.db.query(sql.count).then(function (transactionsCount) {
			return setImmediate(cb, null, {
				confirmed: transactionsCount[0].count,
				unconfirmed: library.logic.transactionPool.verified.ready.count,
				unprocessed: library.logic.transactionPool.unverified.count,
				unsigned: library.logic.transactionPool.verified.pending.count,
				total: transactionsCount[0].count + library.logic.transactionPool.verified.ready.count + library.logic.transactionPool.unverified.count + library.logic.transactionPool.verified.pending.count
			});
		}, function (err) {
			return setImmediate(cb, 'Unable to count transactions');
		});
	},

	getQueuedTransactions: function (req, cb) {
		return __private.getPooledTransactions('getQueuedTransactionList', req, cb);
	},

	getMultisignatureTransaction: function (req, cb) {
		return __private.getPooledTransaction('getMultisignatureTransaction', req, cb);
	},

	getMultisignatureTransactions: function (req, cb) {
		return __private.getPooledTransactions('getMultisignatureTransactionList', req, cb);
	},

	getUnconfirmedTransactions: function (req, cb) {
		return __private.getPooledTransactions('getUnconfirmedTransactionList', req, cb);
	},

	postTransactions: function (req, cb) {
		return modules.transport.shared.postTransactions(req.body, function (err, res) {
			function mapOldResponseStructureToNew (res, cb) {
				var error = null;
				var response = null;

				if (res.success == false) {
					error = new ApiError(res.message, apiCodes.BAD_REQUEST);
				}

				if (res.success == true) {
					response = {
						status: 'Transaction(s) accepted'
					};
				}

				return setImmediate(cb, error, response);
			}

			mapOldResponseStructureToNew(res, cb);
		});
	}
};

// Export
module.exports = Transactions;
