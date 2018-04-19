'use strict';

var async = require('async');
var config = require('../config.json');
var constants = require('../helpers/constants.js');
var jobsQueue = require('../helpers/jobsQueue.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {};

/**
 * Initializes variables, sets bundled transaction timer and transaction expiry timer.
 * @memberof module:transactions
 * @class
 * @classdesc Transaction pool logic.
 * @implements {processBundled}
 * @implements {expireTransactions}
 * @param {number} broadcastInterval - Broadcast interval in seconds, used for bundling.
 * @param {number} releaseLimit - Release limit for transactions broadcasts, used for bundling.
 * @param {Transaction} transaction - Transaction logic instance.
 * @param {bus} bus - Bus instance.
 * @param {Object} logger - Logger instance.
 * @param {Sequence} balancesSequence - Balances sequence.
 */
// Constructor
function TransactionPool (broadcastInterval, releaseLimit, transaction, bus, logger, balancesSequence) {
	library = {
		logger: logger,
		balancesSequence: balancesSequence,
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
 * @param {Accounts} accounts - Accounts module instance.
 * @param {Transactions} transactions - Transactions module instance.
 * @param {Loader} loader - Loader module instance.
 */
TransactionPool.prototype.bind = function (accounts, transactions, loader) {
	modules = {
		accounts: accounts,
		transactions: transactions,
		loader: loader,
	};
};

/**
 * Determines whether a transaction is in the pool based on transaction id.
 * Checks unconfirmed, bundled, queued and multisignature lists.
 * @param {string} id - Transaction id.
 * @return {boolean} true If transaction id exists in at least one of indexes.
 */
TransactionPool.prototype.transactionInPool = function (id) {
	return [
		self.unconfirmed.index[id],
		self.bundled.index[id],
		self.queued.index[id],
		self.multisignature.index[id]
	].some(function (index) {
		return typeof(index) === 'number';
	});
};

/**
 * Gets an unconfirmed transaction based on transaction id.
 * @param {string} id - Transaction id.
 * @return {(Object|undefined)} - Transaction or undefined.
 */
TransactionPool.prototype.getUnconfirmedTransaction = function (id) {
	var index = self.unconfirmed.index[id];
	return self.unconfirmed.transactions[index];
};

/**
 * Gets a bundled transaction based on transaction id.
 * @param {string} id - Transaction id.
 * @return {(Object|undefined)} - Transaction or undefined.
 */
TransactionPool.prototype.getBundledTransaction = function (id) {
	var index = self.bundled.index[id];
	return self.bundled.transactions[index];
};

/**
 * Gets a queued transaction based on transaction id.
 * @param {string} id - Transaction id.
 * @return {(Object|undefined)} - Transaction or undefined.
 */
TransactionPool.prototype.getQueuedTransaction = function (id) {
	var index = self.queued.index[id];
	return self.queued.transactions[index];
};

/**
 * Gets a multisignature transaction based on transaction id.
 * @param {string} id - Transaction id.
 * @return {(Object|undefined)} - Transaction or undefined.
 */
TransactionPool.prototype.getMultisignatureTransaction = function (id) {
	var index = self.multisignature.index[id];
	return self.multisignature.transactions[index];
};

/**
 * Gets unconfirmed transactions based on limit and reverse option.
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @return {array} - Of unconfirmed transactions.
 */
TransactionPool.prototype.getUnconfirmedTransactionList = function (reverse, limit) {
	return __private.getTransactionList(self.unconfirmed.transactions, reverse, limit);
};

/**
 * Gets bundled transactions based on limit and reverse option.
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @return {array} - Of bundled transactions.
 */
TransactionPool.prototype.getBundledTransactionList  = function (reverse, limit) {
	return __private.getTransactionList(self.bundled.transactions, reverse, limit);
};

/**
 * Gets queued transactions based on limit and reverse option.
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @return {array} - Of queued transactions.
 */
TransactionPool.prototype.getQueuedTransactionList  = function (reverse, limit) {
	return __private.getTransactionList(self.queued.transactions, reverse, limit);
};

/**
 * Gets multisignature transactions based on reverse, limit and ready options.
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @param {boolean} ready - Limits results to transactions deemed "ready".
 * @implements {__private.getTransactionList}
 * @return {array} - Of multisignature transactions.
 */
TransactionPool.prototype.getMultisignatureTransactionList = function (reverse, limit, ready) {
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
 * @implements {getUnconfirmedTransactionList}
 * @implements {getMultisignatureTransactionList}
 * @implements {getQueuedTransactionList}
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @return {array} Of unconfirmed, multisignatures, queued transactions.
 * @todo Limit is only implemented with queued transactions.
 */
TransactionPool.prototype.getMergedTransactionList = function (reverse, limit) {
	var minLimit = (constants.maxTxsPerBlock + 2);

	if (limit <= minLimit || limit > constants.maxSharedTxs) {
		limit = minLimit;
	}

	var unconfirmed = self.getUnconfirmedTransactionList(false, constants.maxTxsPerBlock);
	limit -= unconfirmed.length;

	var multisignatures = self.getMultisignatureTransactionList(false, constants.maxTxsPerBlock);
	limit -= multisignatures.length;

	var queued = self.getQueuedTransactionList(false, limit);
	limit -= queued.length;

	return unconfirmed.concat(multisignatures).concat(queued);
};

/**
 * Adds a transaction to the unconfirmed index, removing it from the multisignature or queued indexes.
 * @param {Object} transaction - Transaction object.
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
		self.unconfirmed.transactions.push(transaction);
		var index = self.unconfirmed.transactions.indexOf(transaction);
		self.unconfirmed.index[transaction.id] = index;
	}
};

/**
 * Removes a transaction from the unconfirmed index, also removing it from the multisignature or queued indexes.
 * @implements {removeQueuedTransaction}
 * @implements {removeMultisignatureTransaction}
 * @param {string} id - Transaction id.
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
 * Counts the number of transactions in the unconfirmed index.
 * @return {number} - Of transactions in the unconfirmed index.
 */
TransactionPool.prototype.countUnconfirmed = function () {
	return Object.keys(self.unconfirmed.index).length;
};

/**
 * Adds a transaction to the bundled index.
 * @param {Object} transaction - Transaction object.
 */
TransactionPool.prototype.addBundledTransaction = function (transaction) {
	if (self.bundled.index[transaction.id] === undefined) {
		self.bundled.transactions.push(transaction);
		var index = self.bundled.transactions.indexOf(transaction);
		self.bundled.index[transaction.id] = index;
	}
};

/**
 * Removes a transaction from the bundled index.
 * @param {string} id - Transaction id.
 */
TransactionPool.prototype.removeBundledTransaction = function (id) {
	var index = self.bundled.index[id];

	if (index !== undefined) {
		self.bundled.transactions[index] = false;
		delete self.bundled.index[id];
	}
};

/**
 * Counts the number of transactions in the bundled index.
 * @return {number} - Of transactions in the bundled index.
 */
TransactionPool.prototype.countBundled = function () {
	return Object.keys(self.bundled.index).length;
};

/**
 * Adds a transaction to the queued index.
 * @param {Object} transaction - Transaction object.
 */
TransactionPool.prototype.addQueuedTransaction = function (transaction) {
	if (self.queued.index[transaction.id] === undefined) {
		self.queued.transactions.push(transaction);
		var index = self.queued.transactions.indexOf(transaction);
		self.queued.index[transaction.id] = index;
	}
};

/**
 * Removes a transaction from the queued index.
 * @param {string} id - Transaction id.
 */
TransactionPool.prototype.removeQueuedTransaction = function (id) {
	var index = self.queued.index[id];

	if (index !== undefined) {
		self.queued.transactions[index] = false;
		delete self.queued.index[id];
	}
};

/**
 * Counts the number of transactions in the queued index.
 * @return {number} - Of transactions in the queued index.
 */
TransactionPool.prototype.countQueued = function () {
	return Object.keys(self.queued.index).length;
};

/**
 * Adds a transaction to the multisignature index.
 * @param {Object} transaction - Transaction object.
 */
TransactionPool.prototype.addMultisignatureTransaction = function (transaction) {
	if (self.multisignature.index[transaction.id] === undefined) {
		self.multisignature.transactions.push(transaction);
		var index = self.multisignature.transactions.indexOf(transaction);
		self.multisignature.index[transaction.id] = index;
	}
};

/**
 * Removes a transaction from the multisignature index.
 * @param {string} id - Transaction id.
 */
TransactionPool.prototype.removeMultisignatureTransaction = function (id) {
	var index = self.multisignature.index[id];

	if (index !== undefined) {
		self.multisignature.transactions[index] = false;
		delete self.multisignature.index[id];
	}
};

/**
* Counts the number of transactions in the multisignature index.
* @return {number} - Of transactions in the multisignature index.
 */
TransactionPool.prototype.countMultisignature = function () {
	return Object.keys(self.multisignature.index).length;
};

/**
 * Receives transactions into the pool and add them to a queue.
 * @implements {processUnconfirmedTransaction}
 * @param {array} transactions - Array of received transactions.
 * @param {boolean} broadcast - Broadcast flag.
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
 * Reindexes all transaction queues, accounting for previously removed/falsified entries.
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
 * Processes the next bundle of transactions and add them to the queued index.
 * @implements {getBundledTransactionList}
 * @implements {removeBundledTransaction}
 * @implements {processVerifyTransaction}
 * @implements {removeUnconfirmedTransaction}
 * @implements {queueTransaction}
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} err | cb
 */
TransactionPool.prototype.processBundled = function (cb) {
	var bundled = self.getBundledTransactionList(true, self.bundleLimit);

	async.eachSeries(bundled, function (transaction, eachSeriesCb) {
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}
		library.balancesSequence.add(function (balancesSequenceCb) {
			__private.processVerifyTransaction(transaction, true, function (err, sender) {
				// Remove bundled transaction after asynchronous processVerifyTransaction to avoid race conditions
				self.removeBundledTransaction(transaction.id);
				// Delete bundled flag from transaction
				// so it is qualified as "queued" in queueTransaction
				delete transaction.bundled;

				if (err) {
					library.logger.debug('Failed to process / verify bundled transaction: ' + transaction.id, err);
					return setImmediate(balancesSequenceCb);
				} else {
					self.queueTransaction(transaction, function (err) {
						if (err) {
							library.logger.debug('Failed to queue bundled transaction: ' + transaction.id, err);
						}
						return setImmediate(balancesSequenceCb);
					});
				}
			});
		}, eachSeriesCb);
	}, function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Processes an unconfirmed transaction.
 * If transaction is not already processed, and processed count is greather than 1000, it reindexes the queues.
 * If transaction was bundled, it queues the transaction for later processing.
 * Else it immediately processes and verifies the transaction.
 * @implements {transactionInPool}
 * @implements {reindexQueues}
 * @implements {queueTransaction}
 * @implements {processVerifyTransaction}
 * @param {Object} transaction - Transaction object.
 * @param {Object} broadcast - Broadcast flag.
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
 * Places a transaction onto the bundled, multisignature, or queued index.
 * @implements {countBundled}
 * @implements {addBundledTransaction}
 * @implements {countMultisignature}
 * @implements {addMultisignatureTransaction}
 * @implements {countQueued}
 * @implements {addQueuedTransaction}
 * @param {Object} transaction - Transaction object.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
TransactionPool.prototype.queueTransaction = function (transaction, cb) {
	transaction.receivedAt = new Date();

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
 * Undoes the unconfirmed queue, reverting the unconfirmed state of each transaction.
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
				// Remove transaction from unconfirmed, queued and multisignature lists
				self.removeUnconfirmedTransaction(transaction.id);

				if (err) {
					library.logger.error('Failed to undo unconfirmed transaction: ' + transaction.id, err);
					return setImmediate(eachSeriesCb);
				}
				// Transaction successfully undone from unconfirmed states, try move it to queued list
				library.balancesSequence.add(function (balancesSequenceCb) {
					self.processUnconfirmedTransaction(transaction, false, function (err) {
						if (err) {
							library.logger.debug('Failed to queue transaction back after successful undo unconfirmed: ' + transaction.id, err);
						}
						return setImmediate(balancesSequenceCb);
					});
				}, eachSeriesCb);
			});
		} else {
			return setImmediate(eachSeriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err, ids);
	});
};

/**
 * Expires unconfirmed, queued and multisignature transactions.
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
			__private.expireTransactions(self.getMultisignatureTransactionList(true), ids, seriesCb);
		}
	], function (err, ids) {
		return setImmediate(cb, err, ids);
	});
};

/**
 * Applies the next block of unconfirmed transactions.
 * Including up to 5 multisignature transactions when there is spare capacity.
 * @implements {modules.loader.syncing}
 * @implements {countUnconfirmed}
 * @implements {getMultisignatureTransactionList}
 * @implements {getQueuedTransactionList}
 * @implements {applyUnconfirmedList}
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback|applyUnconfirmedList}
 */
TransactionPool.prototype.fillPool = function (cb) {
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
		multisignatures = self.getMultisignatureTransactionList(true, multisignaturesLimit, true).slice(0, spareMulti);
		spare = Math.abs(spare - multisignatures.length);
		transactions = self.getQueuedTransactionList(true, constants.maxTxsPerBlock).slice(0, spare);
		transactions = multisignatures.concat(transactions);

		return __private.applyUnconfirmedList(transactions, cb);
	}
};

// Private
/**
 * Returns a given list of transactions, reversed and/or limited.
 * @private
 * @param {array} transactions - Array of trasactions.
 * @param {boolean} reverse - Reverse order of results.
 * @param {number} limit - Limit applied to results.
 * @return {array} Of transactions, reversed and/or limited.
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
 * Check if transaction exists in unconfirmed queue.
 * @private
 * @param {Object} transaction - Transaction object.
 * @returns {Boolean}
 */
__private.isTransactionInUnconfirmedQueue = function (transaction) {
	return typeof(self.unconfirmed.index[transaction.id]) === 'number';
};

/**
 * Processes and verifies a transaction.
 * @private
 * @implements {accounts.setAccountAndGet}
 * @implements {accounts.getAccount}
 * @implements {logic.transaction.process}
 * @implements {logic.transaction.verify}
 * @param {Object} transaction - Transaction object.
 * @param {Object} broadcast - Broadcast flag.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} errors | sender
 */
__private.processVerifyTransaction = function (transaction, broadcast, cb) {
	if (!transaction) {
		return setImmediate(cb, 'Missing transaction');
	}

	// At this point, transaction should not be in unconfirmed state, but this is a final barrier to stop us from
	// making unconfirmed state dirty.
	if (__private.isTransactionInUnconfirmedQueue(transaction)) {
		return setImmediate(cb, 'Transaction is already in unconfirmed state');
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
			library.logic.transaction.verify(transaction, sender, null, true, function (err) {
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
 * Processes and verifies transactions, applying each one as unconfirmed if deemed valid.
 * @private
 * @implements {getUnconfirmedTransaction}
 * @implements {__private.processVerifyTransaction}
 * @implements {removeUnconfirmedTransaction}
 * @implements {addUnconfirmedTransaction}
 * @implements {modules.transactions.applyUnconfirmed}
 * @param {array} transactions - Array of transactions to be applied.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.applyUnconfirmedList = function (transactions, cb) {
	async.eachSeries(transactions, function (transaction, eachSeriesCb) {
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}
		library.balancesSequence.add(function (balancesSequenceCb) {
			__private.processVerifyTransaction(transaction, false, function (err, sender) {
				if (err) {
					library.logger.error('Failed to process / verify unconfirmed transaction: ' + transaction.id, err);
					self.removeQueuedTransaction(transaction.id);
					return setImmediate(balancesSequenceCb);
				}
				modules.transactions.applyUnconfirmed(transaction, sender, function (err) {
					if (err) {
						library.logger.error('Failed to apply unconfirmed transaction: ' + transaction.id, err);
						self.removeQueuedTransaction(transaction.id);
					} else {
						// Transaction successfully applied to unconfirmed states, move it to unconfirmed list
						self.addUnconfirmedTransaction(transaction);
					}
					return setImmediate(balancesSequenceCb);
				});
			});
		}, eachSeriesCb);
	}, cb);
};

/**
 * Calculates the timeout in seconds for expiry based on the given transaction type.
 * @private
 * @param {Object} transaction - Transaction object.
 * @return {number} Timeout in seconds for expiry.
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
 * Removes transactions from the pool if they have expired.
 * @private
 * @implements {__private.transactionTimeOut}
 * @implements {removeUnconfirmedTransaction}
 * @param {array} transactions - Array of transactions to be expired.
 * @param {string[]} parentIds - Array of transaction ids concatenated from parent caller.
 * @param {function} cb - Callback function.
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
