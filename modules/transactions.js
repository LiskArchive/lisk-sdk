'use strict';

var _ = require('lodash');
var async = require('async');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var extend = require('extend');
var OrderBy = require('../helpers/orderBy.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/transactions.js');
var sql = require('../sql/transactions.js');
var TransactionPool = require('../logic/transactionPool.js');
var transactionTypes = require('../helpers/transactionTypes.js');
var Transfer = require('../logic/transfer.js');

// Private fields
var __private = {};
var shared = {};
var modules;
var library;
var self;

__private.assetTypes = {};

/**
 * Initializes library with scope content and generates a Transfer instance
 * and a TransactionPool instance.
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
		},
		genesisblock: scope.genesisblock
	};

	self = this;

	__private.transactionPool = new TransactionPool(
		scope.config.broadcasts.broadcastInterval,
		scope.config.broadcasts.releaseLimit,
		scope.logic.transaction,
		scope.bus,
		scope.logger,
		scope.balancesSequence
	);

	__private.assetTypes[transactionTypes.SEND] = library.logic.transaction.attachAssetType(
		transactionTypes.SEND, new Transfer()
	);

	setImmediate(cb, null, self);
}

// Private methods
/**
 * Counts totals and gets transaction list from `trs_list` view.
 * @private
 * @param {Object} filter
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | data: {transactions, count}
 */
__private.list = function (filter, cb) {
	var params = {};
	var where = [];
	var allowedFieldsMap = {
		blockId:             '"t_blockId" = ${blockId}',
		senderPublicKey:     '"t_senderPublicKey" = DECODE (${senderPublicKey}, \'hex\')',
		recipientPublicKey:  '"m_recipientPublicKey" = DECODE (${recipientPublicKey}, \'hex\')',
		senderId:            '"t_senderId" = ${senderId}',
		recipientId:         '"t_recipientId" = ${recipientId}',
		fromHeight:          '"b_height" >= ${fromHeight}',
		toHeight:            '"b_height" <= ${toHeight}',
		fromTimestamp:       '"t_timestamp" >= ${fromTimestamp}',
		toTimestamp:         '"t_timestamp" <= ${toTimestamp}',
		senderIds:           '"t_senderId" IN (${senderIds:csv})',
		recipientIds:        '"t_recipientId" IN (${recipientIds:csv})',
		senderPublicKeys:    'ENCODE ("t_senderPublicKey", \'hex\') IN (${senderPublicKeys:csv})',
		recipientPublicKeys: 'ENCODE ("m_recipientPublicKey", \'hex\') IN (${recipientPublicKeys:csv})',
		minAmount:           '"t_amount" >= ${minAmount}',
		maxAmount:           '"t_amount" <= ${maxAmount}',
		type:                '"t_type" = ${type}',
		minConfirmations:    'confirmations >= ${minConfirmations}',
		limit: null,
		offset: null,
		orderBy: null,
		// FIXME: Backward compatibility, should be removed after transitional period
		ownerAddress: null,
		ownerPublicKey: null
	};
	var owner = '';
	var isFirstWhere = true;

	var processParams = function (value, key) {
		var field = String(key).split(':');
		if (field.length === 1) {
			// Only field identifier, so using default 'OR' condition
			field.unshift('OR');
		} else if (field.length === 2) {
			// Condition supplied, checking if correct one
			if (_.includes(['or', 'and'], field[0].toLowerCase())) {
				field[0] = field[0].toUpperCase();
			} else {
				throw new Error('Incorrect condition [' + field[0] + '] for field: ' + field[1]);
			}
		} else {
			// Invalid parameter 'x:y:z'
			throw new Error('Invalid parameter supplied: ' + key);
		}

		// Mutating parametres when unix timestamp is supplied
		if (_.includes(['fromUnixTime', 'toUnixTime'], field[1])) {
			// Lisk epoch is 1464109200 as unix timestamp
			value = value - constants.epochTime.getTime() / 1000;
			field[1] = field[1].replace('UnixTime', 'Timestamp');
		}

		if (!_.includes(_.keys(allowedFieldsMap), field[1])) {
			throw new Error('Parameter is not supported: ' + field[1]);
		}

		// Checking for empty parameters, 0 is allowed for few
		if (!value && !(value === 0 && _.includes(['fromTimestamp', 'minAmount', 'minConfirmations', 'type', 'offset'], field[1]))) {
			throw new Error('Value for parameter [' + field[1] + '] cannot be empty');
		}

		if (allowedFieldsMap[field[1]]) {
			where.push((!isFirstWhere ? (field[0] + ' ') : '') + allowedFieldsMap[field[1]]);
			params[field[1]] = value;
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

	var orderBy = OrderBy(
		filter.orderBy, {
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

	if (orderBy.error) {
		return setImmediate(cb, orderBy.error);
	}

	library.db.query(sql.countList({
		where: where,
		owner: owner
	}), params).then(function (rows) {
		var count = rows.length ? rows[0].count : 0;

		library.db.query(sql.list({
			where: where,
			owner: owner,
			sortField: orderBy.sortField,
			sortMethod: orderBy.sortMethod
		}), params).then(function (rows) {
			var transactions = [];

			for (var i = 0; i < rows.length; i++) {
				transactions.push(library.logic.transaction.dbRead(rows[i]));
			}

			var data = {
				transactions: transactions,
				count: count
			};

			return setImmediate(cb, null, data);
		}).catch(function (err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Transactions#list error');
		});
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Transactions#list error');
	});
};

/**
 * Gets transaction by id from `trs_list` view.
 * @private
 * @param {string} id
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | data: {transaction}
 */
__private.getById = function (id, cb) {
	library.db.query(sql.getById, {id: id}).then(function (rows) {
		if (!rows.length) {
			return setImmediate(cb, 'Transaction not found: ' + id);
		}

		var transacton = library.logic.transaction.dbRead(rows[0]);

		return setImmediate(cb, null, transacton);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Transactions#getById error');
	});
};

/**
 * Gets votes by transaction id from `votes` table.
 * @private
 * @param {transaction} transaction
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | data: {added, deleted}
 */
__private.getVotesById = function (transaction, cb) {
	library.db.query(sql.getVotesById, {id: transaction.id}).then(function (rows) {
		if (!rows.length) {
			return setImmediate(cb, 'Transaction not found: ' + transaction.id);
		}

		var votes = rows[0].votes.split(',');
		var added = [];
		var deleted = [];

		for (var i = 0; i < votes.length; i++) {
			if (votes[i].substring(0, 1) === '+') {
				added.push (votes[i].substring(1));
			} else if (votes[i].substring(0, 1) === '-') {
				deleted.push (votes[i].substring(1));
			}
		}

		transaction.votes = {added: added, deleted: deleted};

		return setImmediate(cb, null, transaction);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Transactions#getVotesById error');
	});
};

/**
 * Gets transaction by calling parameter method.
 * @private
 * @param {Object} method
 * @param {Object} req
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
 * Gets transactions by calling parameter method.
 * Filters by senderPublicKey or address if they are present.
 * @private
 * @param {Object} method
 * @param {Object} req
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
 * Check if transaction is in pool
 * @param {string} id
 * @return {function} Calls transactionPool.transactionInPool
 */
Transactions.prototype.transactionInPool = function (id) {
	return __private.transactionPool.transactionInPool(id);
};

/**
 * @param {string} id
 * @return {function} Calls transactionPool.getUnconfirmedTransaction
 */
Transactions.prototype.getUnconfirmedTransaction = function (id) {
	return __private.transactionPool.getUnconfirmedTransaction(id);
};

/**
 * @param {string} id
 * @return {function} Calls transactionPool.getQueuedTransaction
 */
Transactions.prototype.getQueuedTransaction = function (id) {
	return __private.transactionPool.getQueuedTransaction(id);
};

/**
 * @param {string} id
 * @return {function} Calls transactionPool.getMultisignatureTransaction
 */
Transactions.prototype.getMultisignatureTransaction = function (id) {
	return __private.transactionPool.getMultisignatureTransaction(id);
};

/**
 * Gets unconfirmed transactions based on limit and reverse option.
 * @param {boolean} reverse
 * @param {number} limit
 * @return {function} Calls transactionPool.getUnconfirmedTransactionList
 */
Transactions.prototype.getUnconfirmedTransactionList = function (reverse, limit) {
	return __private.transactionPool.getUnconfirmedTransactionList(reverse, limit);
};

/**
 * Gets queued transactions based on limit and reverse option.
 * @param {boolean} reverse
 * @param {number} limit
 * @return {function} Calls transactionPool.getQueuedTransactionList
 */
Transactions.prototype.getQueuedTransactionList = function (reverse, limit) {
	return __private.transactionPool.getQueuedTransactionList(reverse, limit);
};

/**
 * Gets multisignature transactions.
 * @param {boolean} [reverse] - If true trasactions order will be reversed
 * @param {number} [limit] - When supplied list will be cut off
 * @param {boolean} [ready] - When true get only transactions that are ready
 * @return {function} Calls transactionPool.getQueuedTransactionList
 */
Transactions.prototype.getMultisignatureTransactionList = function (reverse, limit, ready) {
	return __private.transactionPool.getMultisignatureTransactionList(reverse, limit, ready);
};

/**
 * Gets unconfirmed, multisignature and queued transactions based on limit and reverse option.
 * @param {boolean} reverse
 * @param {number} limit
 * @return {function} Calls transactionPool.getMergedTransactionList
 */
Transactions.prototype.getMergedTransactionList = function (reverse, limit) {
	return __private.transactionPool.getMergedTransactionList(reverse, limit);
};

/**
 * Removes transaction from unconfirmed, queued and multisignature.
 * @param {string} id
 * @return {function} Calls transactionPool.removeUnconfirmedTransaction
 */
Transactions.prototype.removeUnconfirmedTransaction = function (id) {
	return __private.transactionPool.removeUnconfirmedTransaction(id);
};

/**
 * Checks kind of unconfirmed transaction and process it, resets queue
 * if limit reached.
 * @param {transaction} transaction
 * @param {Object} broadcast
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.processUnconfirmedTransaction
 */
Transactions.prototype.processUnconfirmedTransaction = function (transaction, broadcast, cb) {
	return __private.transactionPool.processUnconfirmedTransaction(transaction, broadcast, cb);
};

/**
 * Undoes unconfirmed list from queue.
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.undoUnconfirmedList
 */
Transactions.prototype.undoUnconfirmedList = function (cb) {
	return __private.transactionPool.undoUnconfirmedList(cb);
};

/**
 * Applies confirmed transaction.
 * @implements {logic.transaction.apply}
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 */
Transactions.prototype.apply = function (transaction, block, sender, cb) {
	library.logger.debug('Applying confirmed transaction', transaction.id);
	library.logic.transaction.apply(transaction, block, sender, cb);
};

/**
 * Undoes confirmed transaction.
 * @implements {logic.transaction.undo}
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 */
Transactions.prototype.undo = function (transaction, block, sender, cb) {
	library.logger.debug('Undoing confirmed transaction', transaction.id);
	library.logic.transaction.undo(transaction, block, sender, cb);
};

/**
 * Gets requester if requesterPublicKey and calls applyUnconfirmed.
 * @implements {modules.accounts.getAccount}
 * @implements {logic.transaction.applyUnconfirmed}
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} for errors
 */
Transactions.prototype.applyUnconfirmed = function (transaction, sender, cb) {
	library.logger.debug('Applying unconfirmed transaction', transaction.id);

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
 * Validates account and Undoes unconfirmed transaction.
 * @implements {modules.accounts.getAccount}
 * @implements {logic.transaction.undoUnconfirmed}
 * @param {transaction} transaction
 * @param {function} cb
 * @return {setImmediateCallback} For error
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

/**
 * Receives transactions
 * @param {transaction[]} transactions
 * @param {Object} broadcast
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.receiveTransactions
 */
Transactions.prototype.receiveTransactions = function (transactions, broadcast, cb) {
	return __private.transactionPool.receiveTransactions(transactions, broadcast, cb);
};

/**
 * Fills pool.
 * @param {function} cb - Callback function.
 * @return {function} Calls transactionPool.fillPool
 */
Transactions.prototype.fillPool = function (cb) {
	return __private.transactionPool.fillPool(cb);
};

/**
 * Calls helpers.sandbox.callMethod().
 * @implements module:helpers#callMethod
 * @param {function} call - Method to call.
 * @param {*} args - List of arguments.
 * @param {function} cb - Callback function.
 */
Transactions.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
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
		transactions: scope.transactions,
	};

	__private.transactionPool.bind(
		scope.accounts,
		scope.transactions,
		scope.loader
	);
	__private.assetTypes[transactionTypes.SEND].bind(
		scope.accounts,
		scope.rounds
	);
};

// Shared API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Transactions.prototype.shared = {
	getTransactions: function (req, cb) {
		async.waterfall([
			function (waterCb) {
				var params = {};
				var pattern = /(and|or){1}:/i;

				// Filter out 'and:'/'or:' from params to perform schema validation
				_.each(req.body, function (value, key) {
					var param = String(key).replace(pattern, '');
					// Dealing with array-like parameters (csv comma separated)
					if (_.includes(['senderIds', 'recipientIds', 'senderPublicKeys', 'recipientPublicKeys'], param)) {
						value = String(value).split(',');
						req.body[key] = value;
					}
					params[param] = value;
				});

				library.schema.validate(params, schema.getTransactions, function (err) {
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
			return setImmediate(cb, err, res);
		});
	},

	getTransaction: function (req, cb) {
		library.schema.validate(req.body, schema.getTransaction, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			__private.getById(req.body.id, function (err, transaction) {
				if (!transaction || err) {
					return setImmediate(cb, 'Transaction not found');
				}

				if (transaction.type === 3) {
					__private.getVotesById(transaction, function (err, transaction) {
						return setImmediate(cb, null, {transaction: transaction});
					});
				} else {
					return setImmediate(cb, null, {transaction: transaction});
				}
			});
		});
	},

	getTransactionsCount: function (req, cb) {
		library.db.query(sql.count).then(function (transactionsCount) {
			return setImmediate(cb, null, {
				confirmed: transactionsCount[0].count,
				multisignature: __private.transactionPool.multisignature.transactions.length,
				unconfirmed: __private.transactionPool.unconfirmed.transactions.length,
				queued: __private.transactionPool.queued.transactions.length
			});
		}, function (err) {
			return setImmediate(cb, 'Unable to count transactions');
		});
	},

	getQueuedTransaction: function (req, cb) {
		return __private.getPooledTransaction('getQueuedTransaction', req, cb);
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

	getUnconfirmedTransaction: function (req, cb) {
		return __private.getPooledTransaction('getUnconfirmedTransaction', req, cb);
	},

	getUnconfirmedTransactions: function (req, cb) {
		return __private.getPooledTransactions('getUnconfirmedTransactionList', req, cb);
	},

	addTransactions: function (req, cb) {
		library.schema.validate(req.body, schema.addTransactions, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			if (req.body.multisigAccountPublicKey || req.body.requesterPublicKey) {
				return setImmediate(cb, 'Multisig request is not allowed');
			}

			var hash = crypto.createHash('sha256').update(req.body.secret, 'utf8').digest();
			var keypair = library.ed.makeKeypair(hash);

			if (req.body.publicKey) {
				if (keypair.publicKey.toString('hex') !== req.body.publicKey) {
					return setImmediate(cb, 'Invalid passphrase');
				}
			}

			var query = {address: req.body.recipientId};

			library.balancesSequence.add(function (cb) {
				modules.accounts.getAccount(query, function (err, recipient) {
					if (err) {
						return setImmediate(cb, err);
					}

					var recipientId = recipient ? recipient.address : req.body.recipientId;

					if (!recipientId) {
						return setImmediate(cb, 'Invalid recipient');
					}

					if (req.body.multisigAccountPublicKey && req.body.multisigAccountPublicKey !== keypair.publicKey.toString('hex')) {
						modules.accounts.getAccount({publicKey: req.body.multisigAccountPublicKey}, function (err, account) {
							if (err) {
								return setImmediate(cb, err);
							}

							if (!account || !account.publicKey) {
								return setImmediate(cb, 'Multisignature account not found');
							}

							if (!Array.isArray(account.multisignatures)) {
								return setImmediate(cb, 'Account does not have multisignatures enabled');
							}

							if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
								return setImmediate(cb, 'Account does not belong to multisignature group');
							}

							modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
								if (err) {
									return setImmediate(cb, err);
								}

								if (!requester || !requester.publicKey) {
									return setImmediate(cb, 'Requester not found');
								}

								if (requester.secondSignature && !req.body.secondSecret) {
									return setImmediate(cb, 'Missing requester second passphrase');
								}

								if (requester.publicKey === account.publicKey) {
									return setImmediate(cb, 'Invalid requester public key');
								}

								var secondKeypair = null;

								if (requester.secondSignature) {
									var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
									secondKeypair = library.ed.makeKeypair(secondHash);
								}

								var transaction;

								try {
									transaction = library.logic.transaction.create({
										type: transactionTypes.SEND,
										amount: req.body.amount,
										sender: account,
										recipientId: recipientId,
										keypair: keypair,
										requester: keypair,
										secondKeypair: secondKeypair
									});
								} catch (e) {
									return setImmediate(cb, e.toString());
								}

								modules.transactions.receiveTransactions([transaction], true, cb);
							});
						});
					} else {
						modules.accounts.setAccountAndGet({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
							if (err) {
								return setImmediate(cb, err);
							}

							if (!account || !account.publicKey) {
								return setImmediate(cb, 'Account not found');
							}

							if (account.secondSignature && !req.body.secondSecret) {
								return setImmediate(cb, 'Missing second passphrase');
							}

							var secondKeypair = null;

							if (account.secondSignature) {
								var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
								secondKeypair = library.ed.makeKeypair(secondHash);
							}

							var transaction;

							try {
								transaction = library.logic.transaction.create({
									type: transactionTypes.SEND,
									amount: req.body.amount,
									sender: account,
									recipientId: recipientId,
									keypair: keypair,
									secondKeypair: secondKeypair
								});
							} catch (e) {
								return setImmediate(cb, e.toString());
							}

							modules.transactions.receiveTransactions([transaction], true, cb);
						});
					}
				});
			}, function (err, transaction) {
				if (err) {
					return setImmediate(cb, err);
				}

				return setImmediate(cb, null, {transactionId: transaction[0].id});
			});
		});
	}
};

// Export
module.exports = Transactions;
