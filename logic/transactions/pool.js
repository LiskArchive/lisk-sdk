'use strict';

var async = require('async');
var _ = require('lodash');
var config = require('../../config.json');
var constants = require('../../helpers/constants.js');
var jobsQueue = require('../../helpers/jobsQueue.js');
var transactionTypes = require('../../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, pool = {};

/**
 * Initializes variables, sets bundled transaction timer and
 * transaction expiry timer.
 * @memberof module:transactions
 * @class
 * @classdesc Main TxPool logic.
 * @implements {processPool}
 * @param {number} broadcastInterval
 * @param {number} releaseLimit
 * @param {Transaction} transaction - Logic instance
 * @param {bus} bus
 * @param {Object} logger
 */
// Constructor
function TxPool (broadcastInterval, releaseLimit, poolLimit, poolInterval, transaction, bus, logger) {
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
			transactions: {
				poolStorageTxsLimit: poolLimit,
				poolProcessInterval: poolInterval
			}
		},
	};
	self = this;

	self.processed = 0;
	self.poolStorageTxsLimit = library.config.transactions.poolStorageTxsLimit;
	self.poolProcessInterval = library.config.transactions.poolProcessInterval;
	self.bundledInterval = library.config.broadcasts.broadcastInterval;
	pool = {
		unverified: { transactions: [], index: {} },
		verified:{
			pending: { transactions: [], index: {} },
			ready: { transactions: [], index: {} }
		}
	};

	// Bundled transaction timer
	function nextBundle (cb) {
		self.processPool(function (err) {
			if (err) {
				library.logger.log('processPool transaction timer', err);
			}
			return setImmediate(cb);
		});
	}

	jobsQueue.register('txPoolNextBundle', nextBundle, self.bundledInterval);

}

// Public methods
/**
 * Bounds input parameters to private variable modules.
 * @param {Accounts} accounts
 * @param {Transactions} transactions
 * @param {Loader} loader
 */
TxPool.prototype.bind = function (accounts, transactions, loader) {
	modules = {
		accounts: accounts,
		transactions: transactions,
		loader: loader,
	};
};

/**
 * Gets unverified, verified.pending and verified.ready indexes and transactions length.
 * @return {Object} unverified, pending, ready
 */
TxPool.prototype.getUsage = function () {
	return {
		unverified: {
			indexes: Object.keys(pool.unverified.index).length,
			txs: pool.unverified.transactions.length
		},
		pending: {
			indexes: Object.keys(pool.verified.pending.index).length,
			txs: pool.verified.pending.transactions.length
		},
		ready: {
			indexes: Object.keys(pool.verified.ready.index).length,
			txs: pool.verified.ready.transactions.length
		}
	};
};

/**
 * Gets transaction based on transaction id.
 * Checks all pool lists: unverified, pending, ready.
 * @param {string} id
 * @return {Object} tx, status
 */
TxPool.prototype.get = function (id) {
	var index = pool.unverified.index[id];
	if (index !== undefined) {
		return {
			tx: pool.unverified.transactions[index],
			status: 'unverified'
		};
	}

	index = pool.verified.pending.index[id];
	if (index !== undefined) {
		return {
			tx: pool.verified.pending.transactions[index],
			status: 'pending'
		};
	}
	
	index = pool.verified.ready.index[id];
	if (index !== undefined) {
		return {
			tx: pool.verified.ready.transactions[index],
			status: 'ready'
		};
	}
	return {
		tx: undefined,
		status: 'Not in pool'
	};
};

/**
 * Gets ready transactions ordered by fee and received time.
 * @param {number} limit
 * @return {transaction[]}
 */
TxPool.prototype.getReady = function (limit) {
	var r = _.orderBy(pool.verified.ready.transactions, ['fee', 'receivedAt'],['desc', 'desc']);
	if (limit && limit < r.length) {
		r.splice(limit);
	}
	return r;
};

/**
 * Gets transactions based on limit and pool list.
 * @implements {__private.getTxsFromPoolList}
 * @param {string} poolList unverified, pending, ready
 * @param {boolean} reverse
 * @param {number} limit
 * @return {[transactins]} transactions in pool list filter by limit.
 */
TxPool.prototype.getByPoolList  = function (poolList, reverse, limit) {
	switch (poolList) {
		case 'unverified':
			return __private.getTxsFromPoolList(pool.unverified.transactions, reverse, limit);
		case 'pending':
			return __private.getTxsFromPoolList(pool.verified.pending.transactions, reverse, limit);
		case 'ready':
			return __private.getTxsFromPoolList(pool.verified.ready.transactions, reverse, limit);
		default:
			return 'Invalid pool list';
	}
};

/**
 * Gets transactions from pool based on account address and entity: sender, recipient.
 * @implements {__private.getAllPoolTxsByFilter}
 * @param {account} id valid account address
 * @param {string} entity sender, recipient
 * @return {getTransactionList} Calls getTransactionList
 */
TxPool.prototype.getByAccountId  = function (id, entity) {
	var err = __private.checkAddress(id);
	if (err) {
		return err;
	}
	switch (entity) {
		case 'sender':
			return __private.getAllPoolTxsByFilter({'senderId': id});
		case 'recipient':
			return __private.getAllPoolTxsByFilter({'recipientId': id});
		default:
			return 'Invalid entity account address';
	}
};

/**
 * Gets transactions from pool based on publicKey and entity: sender, recipient.
 * @implements {__private.getAllPoolTxsByFilter}
 * @param {string} publicKey
 * @param {string} entity sender, requester
 * @return {getTransactionList} Calls getTransactionList
 */
TxPool.prototype.getByAccountPublicKey  = function (publicKey, entity) {
	var err = __private.checkPublicKey(publicKey);
	if (err) {
		return err;
	}
	switch (entity) {
		case 'sender':
			return __private.getAllPoolTxsByFilter({'senderPublicKey': publicKey});
		case 'requester':
			return __private.getAllPoolTxsByFilter({'requesterPublicKey': publicKey});
		default:
			return 'Invalid entity for public key';
	}
};



/**
 * Checks sender has enough credit to apply transaction.
 * @param {transaction} transaction
 * @param {address} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} err, transactions
 */
TxPool.prototype.checkBalance  = function (transaction, sender, cb) {
	var balance;
	return setImmediate(cb, balance);
};

/**
 * Adds transactions to pool.
 * @implements {__private.add}
 * @param {transaction[]} transactions
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} err, transactions
 */
TxPool.prototype.receiveTransactions = function (transactions, cb) {
	async.eachSeries(transactions, function (transaction, cb) {
		__private.add(transaction, pool.unverified, cb);
	}, function (err) {
		return setImmediate(cb, err, transactions.length);
	});
};

/**
 * Adds transactions to unverified pool list.
 * @implements {__private.add}
 * @param {transaction} transaction
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
TxPool.prototype.add = function (transactions, cb) {
	if (!Array.isArray(transactions)) {
		transactions = [transactions];
	}
	async.eachSeries(transactions, function (transaction, eachSeriesCb) {
		__private.add(transaction, pool.unverified, eachSeriesCb);
	}, function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Adds transactions to verified.ready pool list.
 * @implements {__private.addReady}
 * @param {transaction} transaction
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
TxPool.prototype.addReady = function (transactions, cb) {
	if (!Array.isArray(transactions)) {
		transactions = [transactions];
	}
	var resetReceivedAt = new Date();
	async.eachSeries(transactions, function (transaction, eachSeriesCb) {
		transaction.receivedAt = resetReceivedAt;
		__private.addReady(transaction, pool.verified.ready, eachSeriesCb);
	}, function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Deletes transaction from pool list.
 * @implements {__private.delete}
 * @param {transaction} transaction
 * @return {Array} names of cleared lists
 */
TxPool.prototype.delete = function (transaction) {
	var clearedList = [];
	var poolList = ['unverified','pending','ready'];

	[pool.unverified, pool.verified.pending, pool.verified.ready].forEach(function (list, index) {
		if (__private.delete(transaction.id, list)) {
			clearedList.push(poolList[index]);
		}
	});
	if (clearedList.length > 0) {
		if (clearedList.length > 1) {
			library.logger.debug(['Cleared duplicated tx in pool list:', clearedList, 'txid:', transaction.id].join(' '));
		}
	}
	return clearedList;	
};

/**
 * Pulls transactions from unverified, perform verifications and if successful
 * push to either verified.pending (when tx is multisign or timestamp is in 
 * future) or verified.ready otherwise.
 * @implements {__private.delete}
 * @implements {processVerifyTransaction}
 * @implements {removeUnconfirmedTransaction}
 * @param {function} cb
 * @return {setImmediateCallback} err | cb
 */
TxPool.prototype.processPool = function (cb) {
	async.series({
		expireTransactions: function (seriesCb) {
			__private.expireTransactions(function (err) {
				if (err) {
					library.logger.log('Transaction expiry timer', err);
				}
				return setImmediate(seriesCb);
			});
		},
		processUnverified: function (seriesCb) {
			async.eachSeries(pool.unverified.transactions, function (transaction, eachSeriesCb) {
				__private.delete(transaction.id, pool.unverified);
				__private.processUnverifiedTransaction(transaction, true, function (err, sender) {
					if (err) {
						library.logger.error('Failed to process unverified transaction: ' + transaction.id, err);
						return setImmediate(eachSeriesCb);
					}
					self.checkBalance(transaction, sender, function (err) {
						if (err) {
							library.logger.error('Failed to check balance transaction: ' + transaction.id, err);
						}
						transaction.receivedAt = new Date();
						if (transaction.type === transactionTypes.MULTI || Array.isArray(transaction.signatures || transaction.receivedAt < transaction.timestamp)) {
							__private.add(transaction, pool.verified.pending, eachSeriesCb);
						} else {
							// check transaction and if ok add to verified.ready
							__private.add(transaction, pool.verified.ready, eachSeriesCb);
						}
					});
				});
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		},
		processPending: function (seriesCb) {
			// process pool.verified.pending (multisig txs signs), and take care 
			// about moving transactions from `verified.pending` to `verified.ready`
			async.eachSeries(pool.verified.pending.transactions, function (transaction, eachSeriesCb) {
				__private.delete(transaction.id, pool.verified.pending);
				__private.add(transaction, pool.verified.ready, eachSeriesCb);
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		},
		reindexQueues: function (seriesCb) {
			if (self.processed > 1000) {
				__private.reindexQueues();
				self.processed = 0;
			}
		}
	}, function (err) {
		return setImmediate(cb, err);
	});
};

// Private
/**
 * Gets reversed or limited transactions from input parameter.
 * @private
 * @param {transaction[]} transactions
 * @param {boolean} reverse
 * @param {number} limit
 * @return {transaction[]}
 */
__private.getTxsFromPoolList = function (transactions, reverse, limit) {
	var txs = transactions.filter(Boolean);

	if (reverse) {
		txs = txs.reverse();
	}
	if (limit) {
		txs.splice(limit);
	}

	return txs;
};

/**
 * Gets transactions from pool list based on filter.
 * @private
 * @param {Object} filter search criteria
 * @return {Objetc} transactions by pool list
 */
__private.getAllPoolTxsByFilter = function (filter) {
	var txs = {
		unverified: _.filter(pool.unverified, filter),
		pending: _.filter(pool.verified.pending, filter),
		ready: _.filter(pool.verified.ready, filter)
	};

	return txs;
};

/**
 * Returns true if the id is present in at least one of the index values.
 * Index values: unverified, verified.pending, verified.ready.
 * @param {string} id
 * @return {boolean}
 */
__private.transactionInPool = function (id) {
	return [
		pool.unverified.index[id],
		pool.verified.pending.index[id],
		pool.verified.ready.index[id]
	].filter(function (inList) {
		return inList !== undefined;
	}).length > 0;
};

/**
 * Validates address.
 * @param {string} address
 * @return {null|err}
 * @todo check address against mem_accounts
 */
__private.checkAddress = function (address) {
	if (address.charAt(address.length-1) !== 'L') {
		return 'Invalid address, last char must be "L"';
	} 
	if (address.slice(0,address.length-1).match(/^[0-9]+$/) === null) {
		return 'Invalid address, must be numbers';
	}
	return null;
};

/**
 * Validates publicKey.
 * @param {string} publicKey
 * @return {null|err}
 * @todo check publicKey against mem_accounts
 */
__private.checkPublicKey = function (publicKey) {
	if (typeof publicKey !== 'string') {
		return 'Invalid public key, must be a string';
	}
	if (publicKey.length !== 64) {
		return 'Invalid public key, must be 64 characters long';
	}
	if (publicKey.match(/^[0-9A-Fa-f]+$/) === null) {
		return 'Invalid public key, must be a hex string';
	}
	return null;
};

/**
 * Adds transactions to pool list.
 * Checks if tx is in pool. Checks pool limit.
 * @implements {__private.transactionInPool}
 * @param {transaction} transaction
 * @param {Object} poolList
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.add = function (transaction, poolList, cb) {
	if (__private.countTxsPool() >= self.poolStorageTxsLimit) {
		return setImmediate(cb, 'Transaction pool is full');
	}
	if (__private.transactionInPool(transaction.id)) {
		return setImmediate(cb, 'Transaction is already in pool: ' + transaction.id);
	} else {
		poolList.transactions.push(transaction);
		var index = poolList.transactions.indexOf(transaction);
		poolList.index[transaction.id] = index;
		self.processed++;
		return setImmediate(cb);
	}
};

/**
 * Adds transactions to pool list.
 * Clear transaction if is in pool.
 * @implements {__private.transactionInPool}
 * @param {transaction} transaction
 * @param {Object} poolList
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.addReady = function (transaction, poolList, cb) {
	self.delete(transaction);
	poolList.transactions.push(transaction);
	var index = poolList.transactions.indexOf(transaction);
	poolList.index[transaction.id] = index;
	self.processed++;
	return setImmediate(cb);
};

/**
 * Deletes id from pool list index.
 * @param {string} id
 * @param {Object} poolList
 * @return {boolean} true if transaction id is on the list and was deleted
 */
__private.delete = function (id, poolList) {
	var index = poolList.index[id];

	if (index !== undefined) {
		poolList.transactions[index] = false;
		delete poolList.index[id];
		return true;
	}
	return false;
};

/**
 * Sums unverified, verified.pending and verified.ready indexes length.
 * @return {Number} unverified, pending, ready
 */
__private.countTxsPool = function () {
	var totalPool = self.getUsage();

	return totalPool.unverified.indexes + totalPool.pending.indexes + totalPool.ready.indexes;
};

/**
 * Expires transactions.
 * @implements {__private.expireTxsFromList}
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | ids[]
 */
__private.expireTransactions = function (cb) {
	var ids = [];

	async.waterfall([
		function (seriesCb) {
			__private.expireTxsFromList(pool.unverified, ids, seriesCb);
		},
		function (res, seriesCb) {
			__private.expireTxsFromList(pool.verified.pending, ids, seriesCb);
		},
		function (res, seriesCb) {
			__private.expireTxsFromList(pool.verified.ready, ids, seriesCb);
		}
	], function (err, ids) {
		return setImmediate(cb, err, ids);
	});
};

/**
 * Regenerates pool lists indexes and clears deleted transactions.
 */
__private.reindexQueues = function () {
	[pool.unverified, pool.verified.pending, pool.verified.ready].forEach(function (list) {
		list.index = {};
		list.transactions = list.transactions.filter(Boolean);
		list.transactions.forEach(function (transaction) {
			var index = list.transactions.indexOf(transaction);
			list.index[transaction.id] = index;
		});
	});
};

/**
 * Removes transactions if expired from pool list.
 * @private
 * @implements {__private.transactionTimeOut}
 * @implements {__private.delete}
 * @param {Object[]} poolList
 * @param {string[]} parentIds
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error | ids[]
 */
__private.expireTxsFromList = function (poolList, parentIds, cb) {
	var ids = [];

	async.eachSeries(poolList.transactions, function (transaction, eachSeriesCb) {
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}

		var timeNow = Math.floor(Date.now() / 1000);
		var timeOut = __private.transactionTimeOut(transaction);
		// transaction.receivedAt is instance of Date
		console.log('expireTransactions - transaction.receivedAt',transaction.receivedAt);
		var seconds = timeNow - Math.floor(transaction.receivedAt.getTime() / 1000);

		if (seconds > timeOut) {
			ids.push(transaction.id);
			__private.delete(poolList, transaction.id);
			library.logger.info('Expired transaction: ' + transaction.id + ' received at: ' + transaction.receivedAt.toUTCString());
			return setImmediate(eachSeriesCb);
		} else {
			return setImmediate(eachSeriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err, ids.concat(parentIds));
	});
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
__private.processUnverifiedTransaction = function (transaction, broadcast, cb) {
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

// Export
module.exports = TxPool;