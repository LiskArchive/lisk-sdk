'use strict';

var _ = require('lodash');
var async = require('async');
var config = require('../config.json');
var constants = require('../helpers/constants.js');
var jobsQueue = require('../helpers/jobsQueue.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {};

/**
 * Initializes variables, sets bundled transaction timer and
 * transaction expiry timer.
 * @memberof module:transactions
 * @class
 * @classdesc Main transactionPool logic.
 * @implements {processBundled}
 * @implements {expireTransactions}
 * @param {number} broadcastInterval
 * @param {number} releaseLimit
 * @param {Transaction} transaction - Logic instance
 * @param {bus} bus
 * @param {Object} logger
 */
// Constructor
function TransactionPool (broadcastInterval, releaseLimit, transaction, bus, logger) {
	library = {
		logger: logger,
		bus: bus,
		logic: {
			transaction: transaction
		},
		config: {
			broadcasts: {
				broadcastInterval: broadcastInterval,
				releaseLimit: releaseLimit
			}
		}
	};
	self = this;

	// Init transactions storage pools
	self.unconfirmed    = {transactions: {}, count: 0};
	self.bundled        = {transactions: {}, count: 0};
	self.queued         = {transactions: {}, count: 0};
	self.multisignature = {transactions: {}, count: 0};

	self.expiryInterval = 30000;
	self.bundledInterval = library.config.broadcasts.broadcastInterval;
	self.bundleLimit = library.config.broadcasts.releaseLimit;

	// Bundled transaction timer
	function nextBundle (cb) {
		self.processBundled(function (err) {
			if (err) {
				library.logger.log('Bundled transaction timer', err);
			}
			return setImmediate(cb);
		});
	}

	jobsQueue.register('transactionPoolNextBundle', nextBundle, self.bundledInterval);

	// Transaction expiry timer
	function nextExpiry (cb) {
		self.expireTransactions(function (err) {
			if (err) {
				library.logger.log('Transaction expiry timer', err);
			}
			return setImmediate(cb);
		});
	}

	jobsQueue.register('transactionPoolNextExpiry', nextExpiry, self.expiryInterval);
}

// Public methods
/**
 * Bounds input parameters to private variable modules.
 * @param {Accounts} accounts
 * @param {Transactions} transactions
 * @param {Loader} loader
 */
TransactionPool.prototype.bind = function (accounts, transactions, loader) {
	modules = {
		accounts: accounts,
		transactions: transactions,
		loader: loader,
	};
};

/**
 * Returns true if transaction with requested ID is present in at least one list.
 * Pools: unconfirmed, bundled, queued, multisignature.
 * @param {string} id
 * @return {boolean}
 */
TransactionPool.prototype.transactionInPool = function (id) {
	return !!(
		self.unconfirmed.transactions[id] ||
		self.bundled.transaction[id] ||
		self.queued.transactions[id] ||
		self.multisignature.transactions[id]
	);
};

/**
 * Gets unconfirmed transaction with specified ID
 * @param {string} id
 * @return {(Object|undefined)} transaction
 */
TransactionPool.prototype.getUnconfirmedTransaction = function (id) {
	return self.unconfirmed.transactions[id];
};

/**
 * Gets queued transactions with specified ID
 * @param {string} id
 * @return {(Object|undefined)} transaction
 */
TransactionPool.prototype.getQueuedTransaction = function (id) {
	return self.queued.transactions[id];
};

/**
 * Gets multisignature transactions based on transaction id.
 * @param {string} id
 * @return {(Object|undefined)} transaction
 */
TransactionPool.prototype.getMultisignatureTransaction = function (id) {
	return self.multisignature.transactions[id];
};

/**
 * Gets unconfirmed transactions based on limit and reverse option.
 * @param {boolean} reverse
 * @param {number} [limit]
 * @return {getTransactionList} Calls getTransactionList
 */
TransactionPool.prototype.getUnconfirmedTransactionList = function (reverse, limit) {
	return __private.getTransactionList(self.unconfirmed.transactions, reverse, limit);
};

/**
 * Gets bundled transactions based on limit and reverse option.
 * @param {boolean} reverse
 * @param {number} [limit]
 * @return {getTransactionList} Calls getTransactionList
 */
__private.getBundledTransactionList  = function (reverse, limit) {
	return __private.getTransactionList(self.bundled.transactions, reverse, limit);
};

/**
 * Gets queued transactions based on limit and reverse option.
 * @param {boolean} reverse
 * @param {number} [limit]
 * @return {getTransactionList} Calls getTransactionList
 */
TransactionPool.prototype.getQueuedTransactionList  = function (reverse, limit) {
	return __private.getTransactionList(self.queued.transactions, reverse, limit);
};

/**
 * Gets multisignature transactions based on limit and reverse option.
 * @param {boolean} reverse
 * @param {number} [limit]
 * @return {getTransactionList} Calls getTransactionList
 * @todo Avoid mix sync/asyn implementations of the same function
 * @todo Change order extra parameter 'ready', move it to the end
 */
TransactionPool.prototype.getMultisignatureTransactionList = function (reverse, ready, limit) {
	if (ready) {
		return __private.getTransactionList(self.multisignature.transactions, reverse).filter(function (transaction) {
			return transaction.ready;
		});
	} else {
		return __private.getTransactionList(self.multisignature.transactions, reverse, limit);
	}
};

/**
 * Gets unconfirmed, multisignature and queued transactions based on limit and reverse option.
 * @implements {modules.transactions.getUnconfirmedTransactionList}
 * @implements {modules.transactions.getMultisignatureTransactionList}
 * @implements {modules.transactions.getQueuedTransactionList}
 * @param {boolean} reverse
 * @param {number} [limit]
 * @return {transaction[]} unconfirmed + multisignatures + queued
 * @todo limit is only implemented with queued.
 */
TransactionPool.prototype.getMergedTransactionList = function (reverse, limit) {
	var minLimit = (constants.maxTxsPerBlock + 2);

	if (limit <= minLimit || limit > constants.maxSharedTxs) {
		limit = minLimit;
	}

	var unconfirmed = modules.transactions.getUnconfirmedTransactionList(false, constants.maxTxsPerBlock);
	limit -= unconfirmed.length;

	var multisignatures = modules.transactions.getMultisignatureTransactionList(false, false, constants.maxTxsPerBlock);
	limit -= multisignatures.length;

	var queued = modules.transactions.getQueuedTransactionList(false, limit);
	limit -= queued.length;

	return unconfirmed.concat(multisignatures).concat(queued);
};

/**
 * Add transaction to specified list if not already present, increase counter for that list
 * @param {Object} list - Reference to one of supported transactions list: self.(unconfirmed|bundled|queued|multisignature)
 * @param {Object} transaction
 */
__private.addTransaction = function (list, transaction) {
	if (list.transactions[transaction.id] === undefined) {
		list.transactions[transaction.id] = transaction;
		// Increase counter for specified list
		list.count += 1;
	}
}

/**
 * Remove transaction (based on ID) from specified list if present, decrease counter for that list
 * @param {Object} list - Reference to one of supported transactions list: self.(unconfirmed|bundled|queued|multisignature)
 * @param {string} id - Transaction ID
 */
__private.removeTransactionById = function (list, id) {
	if (list.transactions[id]) {
		// Set to undefined first, then remove (memory leak prevention)
		list.transactions[id] = undefined;
		delete list.transactions[id];
		// Decrease counter for specified list
		list.count -= 1;
	}
}

/**
 * Removes transaction from multisignature or queued list and add it to unconfirmed one.
 * @param {Object} transaction
 * @implements {__private.removeTransactionById}
 * @implements {__private.addTransaction}
 */
TransactionPool.prototype.addUnconfirmedTransaction = function (transaction) {
	if (transaction.type === transactionTypes.MULTI || Array.isArray(transaction.signatures)) {
		__private.removeTransactionById(self.multisignature, transaction.id);
	} else {
		__private.removeTransactionById(self.queued, transaction.id);
	}

	__private.addTransaction(self.unconfirmed, transaction);
};
/**
 * Removes transaction with specified ID from unconfirmed, queued and multisignature lists
 * @param {string} id - Transaction ID
 * @implements {__private.removeTransactionById}
 */
TransactionPool.prototype.removeUnconfirmedTransaction = function (id) {
	__private.removeTransactionById(self.unconfirmed, id);
	__private.removeTransactionById(self.queued, id);
	__private.removeTransactionById(self.multisignature, id);
	// FIXME: Why we don't remove from bundled here?
};

/**
 * Calls processUnconfirmedTransaction for each transaction.
 * @implements {processUnconfirmedTransaction}
 * @param {transaction[]} transactions
 * @param {Object} broadcast
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} err, transactions
 */
TransactionPool.prototype.receiveTransactions = function (transactions, broadcast, cb) {
	async.eachSeries(transactions, function (transaction, cb) {
		__private.processUnconfirmedTransaction(transaction, broadcast, cb);
	}, function (err) {
		return setImmediate(cb, err, transactions);
	});
};

/**
 * Gets bundled transactions based on bundled limit.
 * Removes each transaction from bundled and process it.
 * @implements {getBundledTransactionList}
 * @implements {removeBundledTransaction}
 * @implements {processVerifyTransaction}
 * @implements {removeUnconfirmedTransaction}
 * @implements {queueTransaction}
 * @param {function} cb
 * @return {setImmediateCallback} err | cb
 */
TransactionPool.prototype.processBundled = function (cb) {
	var bundled = __private.getBundledTransactionList(true, self.bundleLimit);

	async.eachSeries(bundled, function (transaction, eachSeriesCb) {
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}

		self.removeBundledTransaction(transaction.id);
		delete transaction.bundled;

		__private.processVerifyTransaction(transaction, true, function (err, sender) {
			if (err) {
				library.logger.debug('Failed to process / verify bundled transaction: ' + transaction.id, err);
				self.removeUnconfirmedTransaction(transaction);
				return setImmediate(eachSeriesCb);
			} else {
				self.queueTransaction(transaction, function (err) {
					if (err) {
						library.logger.debug('Failed to queue bundled transaction: ' + transaction.id, err);
					}
					return setImmediate(eachSeriesCb);
				});
			}
		});
	}, function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * If transaction is not already processed and processed is greather than 1000,
 * calls reindex queues.
 * If transaction bundled, calls queue transaction.
 * Calls processVerifyTransaction.
 * @implements {transactionInPool}
 * @implements {reindexQueues}
 * @implements {queueTransaction}
 * @implements {processVerifyTransaction}
 * @param {transaction} transaction
 * @param {Object} broadcast
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback|queueTransaction} error | queueTransaction
 */
__private.processUnconfirmedTransaction = function (transaction, broadcast, cb) {
	if (self.transactionInPool(transaction.id)) {
		return setImmediate(cb, 'Transaction is already processed: ' + transaction.id);
	}

	if (transaction.bundled) {
		return self.queueTransaction(transaction, cb);
	}

	__private.processVerifyTransaction(transaction, broadcast, function (err) {
		if (!err) {
			return self.queueTransaction(transaction, cb);
		} else {
			return setImmediate(cb, err);
		}
	});
};

/**
 * Check if requested list is not out of space, then if not - add transaction to that list
 * @implements {__private.addTransaction}
 * @param {Object} list - Reference to one of supported transactions list: self.(unconfirmed|bundled|queued|multisignature)
 * @param {Object} transaction
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error | cb - Error if requested list is full
 */
__private.checkStorageAndAddTransaction = function (list, transaction, cb) {
	if (list.count >= config.transactions.maxTxsPerQueue) {
		return setImmediate(cb, 'Transaction pool is full');
	} else {
		__private.addTransaction(list, transaction);
		return setImmediate();
	}
};

/**
 * Add transaction to one of following lists depends of criteria:
 * - bundled: when transaction contains bundled property that evaluates to true
 * - multisignature: when transactions type is MULTI or transaction contains signatures
 * - queued: all other transactions
 * @param {transaction} transaction
 * @param {function} cb - Callback function.
 * @implements {__private.checkStorageAndAddTransaction}
 * @return {setImmediateCallback} error | cb - Error if there is no space in list
 */
TransactionPool.prototype.queueTransaction = function (transaction, cb) {
	var list;

	if (transaction.bundled) {
		list = self.bundled;
	} else if (transaction.type === transactionTypes.MULTI || Array.isArray(transaction.signatures)) {
		list = self.multisignature;
	} else {
		list = self.queued;
	}

	transaction.receivedAt = new Date();
	return __private.checkStorageAndAddTransaction(list, transaction, cb);
};

/**
 * Applies unconfirmed list to unconfirmed transactions list.
 * @implements {getUnconfirmedTransactionList}
 * @param {function} cb - Callback function.
 * @return {applyUnconfirmedList}
 */
TransactionPool.prototype.applyUnconfirmedList = function (cb) {
	return __private.applyUnconfirmedList(self.getUnconfirmedTransactionList(true), cb);
};

/**
 * Undoes unconfirmed transactions.
 * @implements {getUnconfirmedTransactionList}
 * @implements {modules.transactions.undoUnconfirmed}
 * @implements {removeUnconfirmedTransaction}
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | ids[]
 */
TransactionPool.prototype.undoUnconfirmedList = function (cb) {
	var ids = [];

	async.eachSeries(self.getUnconfirmedTransactionList(false), function (transaction, eachSeriesCb) {
		if (transaction) {
			ids.push(transaction.id);
			modules.transactions.undoUnconfirmed(transaction, function (err) {
				if (err) {
					library.logger.error('Failed to undo unconfirmed transaction: ' + transaction.id, err);
					self.removeUnconfirmedTransaction(transaction.id);
				}
				return setImmediate(eachSeriesCb);
			});
		} else {
			return setImmediate(eachSeriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err, ids);
	});
};

/**
 * expires transactions.
 * @implements {__private.expireTransactions}
 * @implements {getUnconfirmedTransactionList}
 * @implements {getQueuedTransactionList}
 * @implements {getMultisignatureTransactionList}
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | ids[]
 */
TransactionPool.prototype.expireTransactions = function (cb) {
	var ids = [];

	async.waterfall([
		function (seriesCb) {
			__private.expireTransactions(self.getUnconfirmedTransactionList(true), ids, seriesCb);
		},
		function (res, seriesCb) {
			__private.expireTransactions(self.getQueuedTransactionList(true), ids, seriesCb);
		},
		function (res, seriesCb) {
			__private.expireTransactions(self.getMultisignatureTransactionList(true, false), ids, seriesCb);
		}
	], function (err, ids) {
		return setImmediate(cb, err, ids);
	});
};

/**
 * Gets multisignatures and queued transactions based on pool size.
 * Adds unconfirmed transactions and returns unconfirmed list.
 * @implements {modules.loader.syncing}
 * @implements {getMultisignatureTransactionList}
 * @implements {getQueuedTransactionList}
 * @implements {addUnconfirmedTransaction}
 * @implements {__private.applyUnconfirmedList}
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback|applyUnconfirmedList} for errors | with transactions
 */
TransactionPool.prototype.fillPool = function (cb) {
	if (modules.loader.syncing()) { return setImmediate(cb); }

	library.logger.debug('Unconfirmed transaction pool size: ' + self.unconfirmed.count);

	if (self.unconfirmed.count >= constants.maxTxsPerBlock) {
		return setImmediate(cb);
	} else {
		var spare = 0, spareMulti;
		var multisignatures;
		var multisignaturesLimit = 5;
		var transactions;

		spare = (constants.maxTxsPerBlock - unconfirmedCount);
		spareMulti = (spare >= multisignaturesLimit) ? multisignaturesLimit : 0;
		multisignatures = self.getMultisignatureTransactionList(true, true, multisignaturesLimit).slice(0, spareMulti);
		spare = Math.abs(spare - multisignatures.length);
		transactions = self.getQueuedTransactionList(true, constants.maxTxsPerBlock).slice(0, spare);
		transactions = multisignatures.concat(transactions);

		transactions.forEach(function (transaction)  {
			self.addUnconfirmedTransaction(transaction);
		});

		return __private.applyUnconfirmedList(transactions, cb);
	}
};

// Private
/**
 * Gets transactions from requested list, sort them, filter and return as array
 * @private
 * @param {Object} list - Reference to one of supported transactions list: self.(unconfirmed|bundled|queued|multisignature)
 * @param {boolean} reverse - If true trasactions order will be reversed
 * @param {number} [limit] - When supplied list will be cut off
 * @return {Object[]} - transactions - Array of transactions (or empty array)
 */
__private.getTransactionList = function (list, reverse, limit) {
	// Sort order - default: asc, reverse: desc
	var order = reverse ? 'desc' : 'asc';

	// Return sorted array of transactions, limit applied if supplied
	// - sorts on receivedAt property first, then on id (for case that receivedAt is the same)
	return _.orderBy(list.transactions, ['receivedAt', 'id'], [order, order]).slice(0, limit);
};

/**
 * Gets sender account, verifies multisignatures, gets requester,
 * process transaction and verifies.
 * @private
 * @implements {accounts.setAccountAndGet}
 * @implements {accounts.getAccount}
 * @implements {logic.transaction.process}
 * @implements {logic.transaction.verify}
 * @param {transaction} transaction
 * @param {object} broadcast
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} errors | sender
 */
__private.processVerifyTransaction = function (transaction, broadcast, cb) {
	if (!transaction) {
		return setImmediate(cb, 'Missing transaction');
	}

	async.waterfall([
		function setAccountAndGet (waterCb) {
			modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, waterCb);
		},
		function getRequester (sender, waterCb) {
			var multisignatures = Array.isArray(sender.multisignatures) && sender.multisignatures.length;

			if (multisignatures) {
				transaction.signatures = transaction.signatures || [];
			}

			if (sender && transaction.requesterPublicKey && multisignatures) {
				modules.accounts.getAccount({publicKey: transaction.requesterPublicKey}, function (err, requester) {
					if (!requester) {
						return setImmediate(waterCb, 'Requester not found');
					} else {
						return setImmediate(waterCb, null, sender, requester);
					}
				});
			} else {
				return setImmediate(waterCb, null, sender, null);
			}
		},
		function processTransaction (sender, requester, waterCb) {
			library.logic.transaction.process(transaction, sender, requester, function (err) {
				if (err) {
					return setImmediate(waterCb, err);
				} else {
					return setImmediate(waterCb, null, sender);
				}
			});
		},
		function normalizeTransaction (sender, waterCb) {
			try {
				transaction = library.logic.transaction.objectNormalize(transaction);
				return setImmediate(waterCb, null, sender);
			} catch (err) {
				return setImmediate(waterCb, err);
			}
		},
		function verifyTransaction (sender, waterCb) {
			library.logic.transaction.verify(transaction, sender, function (err) {
				if (err) {
					return setImmediate(waterCb, err);
				} else {
					return setImmediate(waterCb, null, sender);
				}
			});
		}
	], function (err, sender) {
		if (!err) {
			library.bus.message('unconfirmedTransaction', transaction, broadcast);
		}

		return setImmediate(cb, err, sender);
	});
};

/**
 * Calls processVerifyTransaction for each transaction and applies
 * unconfirmed transaction.
 * @private
 * @implements {getUnconfirmedTransaction}
 * @implements {__private.processVerifyTransaction}
 * @implements {removeUnconfirmedTransaction}
 * @implements {modules.transactions.applyUnconfirmed}
 * @param {transaction[]} transactions
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error | cb
 */
__private.applyUnconfirmedList = function (transactions, cb) {
	async.eachSeries(transactions, function (transaction, eachSeriesCb) {
		if (typeof transaction === 'string') {
			transaction = self.getUnconfirmedTransaction(transaction);
		}
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}
		__private.processVerifyTransaction(transaction, false, function (err, sender) {
			if (err) {
				library.logger.error('Failed to process / verify unconfirmed transaction: ' + transaction.id, err);
				self.removeUnconfirmedTransaction(transaction.id);
				return setImmediate(eachSeriesCb);
			}
			modules.transactions.applyUnconfirmed(transaction, sender, function (err) {
				if (err) {
					library.logger.error('Failed to apply unconfirmed transaction: ' + transaction.id, err);
					self.removeUnconfirmedTransaction(transaction.id);
				}
				return setImmediate(eachSeriesCb);
			});
		});
	}, cb);
};

/**
 * Calculates timeout based on transaction.
 * @private
 * @param {transaction} transaction
 * @return {number} timeOut
 */
__private.transactionTimeOut = function (transaction) {
	if (transaction.type === transactionTypes.MULTI) {
		return (transaction.asset.multisignature.lifetime * 3600);
	} else if (Array.isArray(transaction.signatures)) {
		return (constants.unconfirmedTransactionTimeOut * 8);
	} else {
		return (constants.unconfirmedTransactionTimeOut);
	}
};

/**
 * Removes unconfirmed transactions if expired.
 * @private
 * @implements {__private.transactionTimeOut}
 * @implements {removeUnconfirmedTransaction}
 * @param {transaction[]} transactions
 * @param {string[]} parentIds
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error | ids[]
 */
__private.expireTransactions = function (transactions, parentIds, cb) {
	var ids = [];

	async.eachSeries(transactions, function (transaction, eachSeriesCb) {
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}

		var timeNow = Math.floor(Date.now() / 1000);
		var timeOut = __private.transactionTimeOut(transaction);
		// transaction.receivedAt is instance of Date
		var seconds = timeNow - Math.floor(transaction.receivedAt.getTime() / 1000);

		if (seconds > timeOut) {
			ids.push(transaction.id);
			self.removeUnconfirmedTransaction(transaction.id);
			library.logger.info('Expired transaction: ' + transaction.id + ' received at: ' + transaction.receivedAt.toUTCString());
			return setImmediate(eachSeriesCb);
		} else {
			return setImmediate(eachSeriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err, ids.concat(parentIds));
	});
};

// Export
module.exports = TransactionPool;
