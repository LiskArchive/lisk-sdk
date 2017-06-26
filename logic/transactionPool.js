'use strict';

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
			transaction: transaction,
		},
		config: {
			broadcasts: {
				broadcastInterval: broadcastInterval,
				releaseLimit: releaseLimit,
			},
		},
	};
	self = this;

	self.unconfirmed = { transactions: [], index: {} };
	self.bundled = { transactions: [], index: {} };
	self.queued = { transactions: [], index: {} };
	self.multisignature = { transactions: [], index: {} };
	self.expiryInterval = 30000;
	self.bundledInterval = library.config.broadcasts.broadcastInterval;
	self.bundleLimit = library.config.broadcasts.releaseLimit;
	self.processed = 0;

	// Bundled transaction timer
	function nextBundle () {
		self.processBundled(function (err) {
			if (err) {
				library.logger.log('Bundled transaction timer', err);
			}
		});
	}

	jobsQueue.register('transactionPoolNextBundle', nextBundle, self.bundledInterval);

	// Transaction expiry timer
	function nextExpiry () {
		self.expireTransactions(function (err) {
			if (err) {
				library.logger.log('Transaction expiry timer', err);
			}
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
 * Returns true if at least one of the index values are grather than 0.
 * Index values: unconfirmed, bundled, queued, multisignature.
 * @param {string} id
 * @return {boolean}
 */
TransactionPool.prototype.transactionInPool = function (id) {
	return [
		self.unconfirmed.index[id],
		self.bundled.index[id],
		self.queued.index[id],
		self.multisignature.index[id]
	].filter(Boolean).length > 0;
};

/**
 * Gets unconfirmed transactions based on transaction id.
 * @param {string} id
 * @return {transaction[]}
 */
TransactionPool.prototype.getUnconfirmedTransaction = function (id) {
	var index = self.unconfirmed.index[id];
	return self.unconfirmed.transactions[index];
};

/**
 * Gets bundled transactions based on transaction id.
 * @param {string} id
 * @return {transaction[]}
 * @todo This function is never called
 */
TransactionPool.prototype.getBundledTransaction = function (id) {
	var index = self.bundled.index[id];
	return self.bundled.transactions[index];
};

/**
 * Gets queued transactions based on transaction id.
 * @param {string} id
 * @return {transaction[]}
 */
TransactionPool.prototype.getQueuedTransaction = function (id) {
	var index = self.queued.index[id];
	return self.queued.transactions[index];
};

/**
 * Gets multisignature transactions based on transaction id.
 * @param {string} id
 * @return {transaction[]}
 */
TransactionPool.prototype.getMultisignatureTransaction = function (id) {
	var index = self.multisignature.index[id];
	return self.multisignature.transactions[index];
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
TransactionPool.prototype.getBundledTransactionList  = function (reverse, limit) {
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
 * Removes transaction from multisignature or queued.
 * Sets receivedAt date and adds transaction to unconfirmed transactions.
 * @param {transaction} transaction
 * @implements {removeMultisignatureTransaction}
 * @implements {removeQueuedTransaction}
 */
TransactionPool.prototype.addUnconfirmedTransaction = function (transaction) {
	if (transaction.type === transactionTypes.MULTI || Array.isArray(transaction.signatures)) {
		self.removeMultisignatureTransaction(transaction.id);
	} else {
		self.removeQueuedTransaction(transaction.id);
	}

	if (self.unconfirmed.index[transaction.id] === undefined) {
		if (!transaction.receivedAt) {
			transaction.receivedAt = new Date();
		}

		self.unconfirmed.transactions.push(transaction);
		var index = self.unconfirmed.transactions.indexOf(transaction);
		self.unconfirmed.index[transaction.id] = index;
	}
};
/**
 * Removes id from unconfirmed index and transactions.
 * Also removes id from queued and multisignature.
 * @implements {removeQueuedTransaction}
 * @implements {removeMultisignatureTransaction}
 * @param {string} id
 */
TransactionPool.prototype.removeUnconfirmedTransaction = function (id) {
	var index = self.unconfirmed.index[id];

	if (index !== undefined) {
		self.unconfirmed.transactions[index] = false;
		delete self.unconfirmed.index[id];
	}

	self.removeQueuedTransaction(id);
	self.removeMultisignatureTransaction(id);
};

/**
 * Counts unconfirmed list index.
 * @return {number} unconfirmed lenght
 */
TransactionPool.prototype.countUnconfirmed = function () {
	return Object.keys(self.unconfirmed.index).length;
};

/**
 * Adds transaction to bundled list (index + transactions).
 * @param {transaction} transaction
 */
TransactionPool.prototype.addBundledTransaction = function (transaction) {
	self.bundled.transactions.push(transaction);
	var index = self.bundled.transactions.indexOf(transaction);
	self.bundled.index[transaction.id] = index;
};

/**
 * Deletes id from bundled list index.
 * @param {string} id
 */
TransactionPool.prototype.removeBundledTransaction = function (id) {
	var index = self.bundled.index[id];

	if (index !== undefined) {
		self.bundled.transactions[index] = false;
		delete self.bundled.index[id];
	}
};

/**
 * Counts bundled index list.
 * @return {number} total bundled index
 */
TransactionPool.prototype.countBundled = function () {
	return Object.keys(self.bundled.index).length;
};

/**
 * Adds transaction to queued list (index + transactions).
 * Sets receivedAt with current date.
 * @param {transaction} transaction
 */
TransactionPool.prototype.addQueuedTransaction = function (transaction) {
	if (self.queued.index[transaction.id] === undefined) {
		if (!transaction.receivedAt) {
			transaction.receivedAt = new Date();
		}

		self.queued.transactions.push(transaction);
		var index = self.queued.transactions.indexOf(transaction);
		self.queued.index[transaction.id] = index;
	}
};

/**
 * Removes id from queued index and transactions. 
 * @param {string} id
 */
TransactionPool.prototype.removeQueuedTransaction = function (id) {
	var index = self.queued.index[id];

	if (index !== undefined) {
		self.queued.transactions[index] = false;
		delete self.queued.index[id];
	}
};

/**
 * Counts queued index list.
 * @return {number} total queued index
 */
TransactionPool.prototype.countQueued = function () {
	return Object.keys(self.queued.index).length;
};

/**
 * Adds transaction to multisignature list (index + transactions).
 * Sets receivedAt with current date.
 * @param {transaction} transaction
 */
TransactionPool.prototype.addMultisignatureTransaction = function (transaction) {
	if (self.multisignature.index[transaction.id] === undefined) {
		if (!transaction.receivedAt) {
			transaction.receivedAt = new Date();
		}

		self.multisignature.transactions.push(transaction);
		var index = self.multisignature.transactions.indexOf(transaction);
		self.multisignature.index[transaction.id] = index;
	}
};

/**
 * Removes id from multisignature index and transactions. 
 * @param {string} id
 */
TransactionPool.prototype.removeMultisignatureTransaction = function (id) {
	var index = self.multisignature.index[id];

	if (index !== undefined) {
		self.multisignature.transactions[index] = false;
		delete self.multisignature.index[id];
	}
};

/**
 * Counts multisignature index list.
 * @return {number} total multisignature index
 */
TransactionPool.prototype.countMultisignature = function () {
	return Object.keys(self.multisignature.index).length;
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
		self.processUnconfirmedTransaction(transaction, broadcast, cb);
	}, function (err) {
		return setImmediate(cb, err, transactions);
	});
};

/**
 * Regenerates indexes for all queues: bundled, queued,
 * multisignature and unconfirmed.
 */
TransactionPool.prototype.reindexQueues = function () {
	['bundled', 'queued', 'multisignature', 'unconfirmed'].forEach(function (queue) {
		self[queue].index = {};
		self[queue].transactions = self[queue].transactions.filter(Boolean);
		self[queue].transactions.forEach(function (transaction) {
			var index = self[queue].transactions.indexOf(transaction);
			self[queue].index[transaction.id] = index;
		});
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
	var bundled = self.getBundledTransactionList(true, self.bundleLimit);

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
TransactionPool.prototype.processUnconfirmedTransaction = function (transaction, broadcast, cb) {
	if (self.transactionInPool(transaction.id)) {
		return setImmediate(cb, 'Transaction is already processed: ' + transaction.id);
	} else {
		self.processed++;
		if (self.processed > 1000) {
			self.reindexQueues();
			self.processed = 1;
		}
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
 * Based on transaction bundled, type and signatures queues transaction into:
 * bundle, multisignature or queue.
 * @implements {countBundled}
 * @implements {addBundledTransaction}
 * @implements {countMultisignature}
 * @implements {addMultisignatureTransaction}
 * @implements {countQueued}
 * @implements {addQueuedTransaction}
 * @param {transaction} transaction
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
TransactionPool.prototype.queueTransaction = function (transaction, cb) {
	delete transaction.receivedAt;

	if (transaction.bundled) {
		if (self.countBundled() >= config.transactions.maxTxsPerQueue) {
			return setImmediate(cb, 'Transaction pool is full');
		} else {
			self.addBundledTransaction(transaction);
		}
	} else if (transaction.type === transactionTypes.MULTI || Array.isArray(transaction.signatures)) {
		if (self.countMultisignature() >= config.transactions.maxTxsPerQueue) {
			return setImmediate(cb, 'Transaction pool is full');
		} else {
			self.addMultisignatureTransaction(transaction);
		}
	} else {
		if (self.countQueued() >= config.transactions.maxTxsPerQueue) {
			return setImmediate(cb, 'Transaction pool is full');
		} else {
			self.addQueuedTransaction(transaction);
		}
	}

	return setImmediate(cb);
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
 * Applies unconfirmed list to unconfirmed Ids.
 * @param {string[]} ids
 * @param {function} cb - Callback function.
 * @return {applyUnconfirmedList}
 */
TransactionPool.prototype.applyUnconfirmedIds = function (ids, cb) {
	return __private.applyUnconfirmedList(ids, cb);
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
 * @implements {countUnconfirmed}
 * @implements {getMultisignatureTransactionList}
 * @implements {getQueuedTransactionList}
 * @implements {addUnconfirmedTransaction}
 * @implements {applyUnconfirmedList}
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback|applyUnconfirmedList} for errors | with transactions
 */
TransactionPool.prototype.fillPool = function (cb) {
	if (modules.loader.syncing()) { return setImmediate(cb); }

	var unconfirmedCount = self.countUnconfirmed();
	library.logger.debug('Transaction pool size: ' + unconfirmedCount);

	if (unconfirmedCount >= constants.maxTxsPerBlock) {
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
 * Gets reversed or limited transactions from input parameter.
 * @private
 * @param {transaction[]} transactions
 * @param {boolean} reverse
 * @param {number} [limit]
 * @return {transaction[]}
 */
__private.getTransactionList = function (transactions, reverse, limit) {
	var a = [];

	for (var i = 0; i < transactions.length; i++) {
		var transaction = transactions[i];

		if (transaction !== false)	{
			a.push(transaction);
		}
	}

	a = reverse ? a.reverse() : a;

	if (limit) {
		a.splice(limit);
	}

	return a;
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
