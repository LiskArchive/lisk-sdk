'use strict';

var async = require('async');
var _ = require('lodash');
var crypto = require('crypto');

var constants = require('../../helpers/constants.js');
var jobsQueue = require('../../helpers/jobsQueue.js');
var transactionTypes = require('../../helpers/transactionTypes.js');
var bignum = require('../../helpers/bignum.js');
var slots = require('../../helpers/slots.js');

// Private fields
var modules; 
var library;
var self;
var __private = {};
var pool = {};

/**
 * Initializes variables, sets bundled transaction pool timer and
 * transaction pool expiry timer.
 * @memberof module:transactions
 * @class
 * @classdesc Main TransactionPool logic.
 * @implements {processPool}
 * @implements {expireTransactions}
 * @implements {resetInvalidTransactions}
 * @param {Object} logger
 * @param {bus} bus
 * @param {Object} ed
 * @param {Transaction} transaction - transaction logic instance
 * @param {Account} account - account logic instance
 */
// Constructor
function TransactionPool (bus, ed, transaction, account, logger, configPool, cbPool) {
	library = {
		logger: logger,
		bus: bus,
		ed: ed,
		logic: {
			transaction: transaction,
			account: account
		},
		config: {
			transactions: {
				pool: {
					storageLimit: configPool.storageLimit,
					processInterval: configPool.processInterval,
					expiryInterval: configPool.expiryInterval
				}
			}
		},
	};
	self = this;

	self.poolStorageTransactionsLimit = library.config.transactions.pool.storageLimit;
	self.poolProcessInterval = library.config.transactions.pool.processInterval;
	self.poolExpiryInterval = library.config.transactions.pool.expiryInterval;
	pool = {
		unverified: { transactions: {}, count: 0 },
		verified:{
			pending: { transactions: {}, count: 0 },
			ready: { transactions: {}, count: 0 }
		},
		invalid: { transactions: {}, count: 0 },
		broadcast: []
	};

	// Pool cycle timer
	function nextPoolCycle (cb) {
		self.processPool(function (err) {
			if (err) {
				library.logger.log('processPool transaction timer', err);
			}
			return setImmediate(cb);
		});
	}

	jobsQueue.register('transactionPoolNextCycle', nextPoolCycle, self.poolProcessInterval);

	// Transaction expiry timer
	function nextExpiry (cb) {
		self.expireTransactions(function (err) {
			if (err) {
				library.logger.log('Transaction expiry timer', err);
			}
			return setImmediate(cb);
		});
	}

	jobsQueue.register('transactionPoolNextExpiry', nextExpiry, self.poolExpiryInterval);

	// Invalid transactions reset timer
	function nextReset () {
		library.logger.debug(['Cleared invalid transactions:', self.resetInvalidTransactions()].join(' '));
	}

	jobsQueue.register('transactionPoolNextReset', nextReset, self.poolExpiryInterval);

	if (cbPool) {
		return setImmediate(cbPool, null, self);
	}
}


// Private
/**
 * Gets all or limited number of transactions from input object list and returns ordered array.
 * @private
 * @param {transaction{}} transactions
 * @param {boolean} reverse
 * @param {number} limit
 * @return {transaction[]}
 */
__private.getTransactionsFromPoolList = function (transactionsInPool, reverse, limit) {
	var transactions = _.orderBy(transactionsInPool, ['receivedAt'],['asc']);

	transactions = reverse ? transactions.reverse() : transactions;

	if (limit) {
		transactions.splice(limit);
	}

	return transactions;
};

/**
 * Gets transactions from all pool lists based on filter.
 * @private
 * @param {Object} filter search criteria
 * @return {Objetc} transactions by pool list
 */
__private.getAllPoolTransactionsByFilter = function (filter) {
	var transactions = {
		unverified: _.filter(pool.unverified.transactions, filter),
		pending: _.filter(pool.verified.pending.transactions, filter),
		ready: _.filter(pool.verified.ready.transactions, filter)
	};

	return transactions;
};

/**
 * Returns true if the id is present in at least one of the pool lists transactions.
 * @private
 * @param {string} id
 * @return {boolean}
 */
__private.transactionInPool = function (id) {
	return [
		pool.verified.ready.transactions[id],
		pool.unverified.transactions[id],
		pool.verified.pending.transactions[id]
	].some(function (index) {
		return typeof(index) === 'object';
	});
};

/**
 * Checks if pool is ready to receive a new transaction and the incoming
 * transaction was not already processed by pool.
 * @private
 * @implements {__private.countTransactionsPool}
 * @implements {__private.transactionInPool}
 * @param {Object} transaction
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb, transaction
 */
__private.checkPoolAvailability = function (transaction, waterCb) {
	if (__private.countTransactionsPool() >= self.poolStorageTransactionsLimit) {
		return setImmediate(waterCb, 'Transaction pool is full');
	}
	if (pool.invalid.transactions[transaction.id] !== undefined) {
		return setImmediate(waterCb, 'Transaction is already processed as invalid: ' + transaction.id);
	}
	if (__private.transactionInPool(transaction.id)) {
		return setImmediate(waterCb, 'Transaction is already in pool: ' + transaction.id);
	}
	return setImmediate(waterCb, null, transaction);
};

/**
 * Obtains sender from accounts table, if address does not exists,
 * returns a default account object.
 * @private
 * @implements {modules.accounts.setAccountAndGet}
 * @param {Object} transaction
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb, transaction, sender
 */
__private.setAccountAndGet = function (transaction, waterCb) {
	modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, cb) {
		return setImmediate(waterCb, err, transaction, cb);
	});
};

/**
 * Obtains requester from accounts table
 * @private
 * @implements {modules.accounts.getAccount}
 * @param {Object} transaction
 * @param {Object} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb, transaction, sender, requester
 */
__private.getRequester = function (transaction, sender, waterCb) {
	var multisignatures = Array.isArray(sender.multisignatures) && sender.multisignatures.length;

	if (multisignatures) {
		transaction.signatures = transaction.signatures || [];
	}

	if (sender && transaction.requesterPublicKey && multisignatures) {
		modules.accounts.getAccount({publicKey: transaction.requesterPublicKey}, function (err, requester) {
			if (!requester) {
				return setImmediate(waterCb, 'Requester not found');
			} else {
				return setImmediate(waterCb, null, transaction, sender, requester);
			}
		});
	} else {
		return setImmediate(waterCb, null, transaction, sender, null);
	}
};

/**
 * Process transaction.
 * @private
 * @implements {library.logic.transaction.process}
 * @implements {__private.addInvalid}
 * @param {Object} transaction
 * @param {Object} sender
 * @param {Object} requester
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb, transaction, sender
 */
__private.processTransaction = function (transaction, sender, requester, waterCb) {
	library.logic.transaction.process(transaction, sender, requester, function (err) {
		if (err) {
			__private.addInvalid(transaction.id);
			return setImmediate(waterCb, err);
		} 
		return setImmediate(waterCb, null, transaction, sender);
	});
};

/**
 * Verifyes transaction.
 * @private
 * @implements {library.logic.transaction.verify}
 * @implements {__private.addInvalid}
 * @param {Object} transaction
 * @param {Object} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb, transaction, sender
 */
__private.verifyTransaction = function (transaction, sender, waterCb) {
	library.logic.transaction.verify(transaction, sender, function (err) {
		if (err) {
			__private.addInvalid(transaction.id);
			return setImmediate(waterCb, err);
		} else {
			return setImmediate(waterCb, null, transaction, sender);
		}
	});
};

/**
 * Verifies if transaction type is repeated into pool from same sender.
 * @private
 * @implements {library.logic.transaction.verify}
 * @implements {__private.addInvalid}
 * @param {Object} transaction
 * @param {Object} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb, transaction, sender
 */
__private.verifyTransactionTypeInPool = function (transaction, sender, waterCb) {
	var senderTransactions = _.filter(pool.verified.ready.transactions, {'senderPublicKey': transaction.senderPublicKey});

	if (senderTransactions.length > 0 && transaction.type !== transactionTypes.SEND) {
		return setImmediate(waterCb, 'Transaction type already in pool for sender', transaction, sender);
	}

	return setImmediate(waterCb, null, transaction, sender);
};

/**
 * Adds transaction to verify pending or ready.
 * @private
 * @implements {__private.addToPoolList}
 * @implements {__private.addReadyCheckBroadcast}
 * @param {Object} transaction
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.moveToVerified = function (transaction, cb) {
	var receiveAtToTime = transaction.receivedAt.getTime();
	var timestampToTime = slots.getRealTime(transaction.timestamp);
	if (transaction.type === transactionTypes.MULTI || Array.isArray(transaction.signatures) || receiveAtToTime < timestampToTime) {
		__private.addToPoolList(transaction, pool.verified.pending, cb);
	} else {
		__private.addReadyCheckBroadcast(transaction, cb);
	}
};

/**
 * Adds transactions to verified pool list.
 * Checks if transaction is in pool, pool limit, performs basic transaction validations
 * and advanced transaction validations: verify and check balance.
 * @private
 * @implements {__private.checkPoolAvailability}
 * @implements {__private.setAccountAndGet}
 * @implements {__private.getAccount}
 * @implements {__private.processTransaction}
 * @implements {__private.verifyTransaction}
 * @implements {__private.moveToVerified}
 * @param {Transaction} transaction
 * @param {boolean} broadcast
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.addToVerified = function (transaction, broadcast, cb) {
	transaction.receivedAt = new Date();
	async.waterfall([
		async.apply(__private.checkPoolAvailability, transaction),
		__private.setAccountAndGet,
		__private.getRequester,
		__private.processTransaction,
		__private.verifyTransaction,
		__private.verifyTransactionTypeInPool,
		function checkBalance (transaction, sender, waterCb) {
			self.checkBalance(transaction, sender, function (err, balance) {
				if (err) {
					return setImmediate(waterCb, err);
				}
				return __private.moveToVerified(transaction, waterCb);
			});
		}
	], function (err) {
		return setImmediate(cb, err);
	});

};

/**
 * Adds transactions to unverified pool list.
 * Checks if transaction is in pool, pool limit and performs basic transaction validations.
 * @private
 * @implements {__private.checkPoolAvailability}
 * @implements {__private.setAccountAndGet}
 * @implements {__private.getAccount}
 * @implements {__private.processTransaction}
 * @param {Transaction} transaction
 * @param {boolean} broadcast
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.addToUnverified = function (transaction, broadcast, cb) {
	async.waterfall([
		async.apply(__private.checkPoolAvailability, transaction),
		__private.setAccountAndGet,
		__private.getRequester,
		__private.processTransaction
	], function (err, transaction, sender) {
		if (!err) {
			if (broadcast) {
				transaction.broadcast = true;
			}
			transaction.receivedAt = new Date();
			pool.unverified.transactions[transaction.id] = transaction;
			pool.unverified.count++;
		}
		return setImmediate(cb, err, transaction);
	});

};

/**
 * Adds transactions to pool list without checks.
 * @private
 * @param {transaction} transaction
 * @param {Object} poolList
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.addToPoolList = function (transaction, poolList, cb) {
	if (poolList.transactions[transaction.id] === undefined) {
		poolList.count++;
	}
	poolList.transactions[transaction.id] = transaction;
	return setImmediate(cb);
};

/**
 * Adds transactions to pool list without checks.
 * @private
 * @param {transaction} transaction
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.addReadyCheckBroadcast = function (transaction, cb) {
	if (transaction.broadcast) {
		delete transaction.broadcast;
		pool.broadcast.push(transaction);
	}
	__private.addToPoolList(transaction, pool.verified.ready, cb);
};

/**
 * Creates signature based on multisignature transaction and secret.
 * @private
 * @param {transaction} transaction
 * @param {String} secret
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
__private.createSignature = function (transaction, secret, cb) {
	var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
	var keypair = library.ed.makeKeypair(hash);
	var publicKey = keypair.publicKey.toString('hex');
	
	if (transaction.asset.multisignature.keysgroup.indexOf('+' + publicKey) === -1) {
		return setImmediate(cb, 'Permission to sign transaction denied');
	}
	var signature = library.logic.transaction.multisign(keypair, transaction);
	return setImmediate(cb, null, signature);
};

/**
 * Adds transaction id to invalid pool list.
 * @private
 * @param {string} id
 */
__private.addInvalid = function (id) {
	pool.invalid.transactions[id] = true;
	pool.invalid.count++;
};

/**
 * Deletes id from pool list.
 * @private
 * @param {string} id
 * @param {Object} poolList
 * @return {boolean} true if transaction id is on the list and was deleted
 */
__private.delete = function (id, poolList) {
	var transaction = poolList.transactions[id];

	if (transaction !== undefined) {
		delete poolList.transactions[id];
		poolList.count--;
		return true;
	}
	return false;
};

/**
 * Sums unverified, verified.pending and verified.ready counters.
 * @private
 * @return {Number} Total = unverified + pending + ready
 */
__private.countTransactionsPool = function () {
	return pool.unverified.count + pool.verified.pending.count + pool.verified.ready.count;
};

/**
 * Removes transactions if expired from pool list.
 * @private
 * @implements {__private.transactionTimeOut}
 * @implements {__private.delete}
 * @param {Object[]} poolList
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} cb|error
 */
__private.expireTransactionsFromList = function (poolList, cb) {
	async.eachSeries(poolList.transactions, function (transaction, eachSeriesCb) {
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}

		var timeNow = Math.floor(Date.now() / 1000);
		var timeOut = __private.transactionTimeOut(transaction);
		// transaction.receivedAt is instance of Date
		var seconds = timeNow - Math.floor(transaction.receivedAt.getTime() / 1000);

		if (seconds > timeOut) {
			__private.delete(transaction.id, poolList);
			library.logger.info('Expired transaction: ' + transaction.id + ' received at: ' + transaction.receivedAt.toUTCString());
			return setImmediate(eachSeriesCb);
		} else {
			return setImmediate(eachSeriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err, null);
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
		return (transaction.asset.multisignature.lifetime * constants.secondsPerHour);
	} else if (Array.isArray(transaction.signatures)) {
		return (constants.unconfirmedTransactionTimeOut * constants.signatureTransactionTimeOutMultiplier);
	} else {
		return (constants.unconfirmedTransactionTimeOut);
	}
};

/**
 * Gets sender account, and verifies transaction.
 * @private
 * @implements {__private.setAccountAndGet}
 * @implements {__private.verifyTransaction}
 * @param {transaction} transaction
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} errors | sender
 */
__private.processUnverifiedTransaction = function (transaction, cb) {
	async.waterfall([
		async.apply(__private.setAccountAndGet, transaction),
		__private.verifyTransaction
	], function (err, transaction, sender) {
		return setImmediate(cb, err, sender);
	});
};

// Public methods
/**
 * Bounds input parameters to private variable modules.
 * @param {Accounts} accounts
 */
TransactionPool.prototype.bind = function (accounts) {
	modules = {
		accounts: accounts,
	};
};

/**
 * Gets invalid, unverified, verified.pending and verified.ready counters.
 * @return {Object} unverified, pending, ready
 */
TransactionPool.prototype.getUsage = function () {
	return {
		unverified: pool.unverified.count,
		pending: pool.verified.pending.count,
		ready: pool.verified.ready.count,
		invalid: pool.invalid.count
	};
};

/**
 * Gets transaction based on transaction id.
 * Checks all pool lists: unverified, pending, ready.
 * @param {string} id
 * @return {Object} transaction, status
 */
TransactionPool.prototype.get = function (id) {
	var transaction = pool.unverified.transactions[id];
	if (transaction !== undefined) {
		return {
			transaction: transaction,
			status: 'unverified'
		};
	}

	transaction = pool.verified.pending.transactions[id];
	if (transaction !== undefined) {
		return {
			transaction: transaction,
			status: 'pending'
		};
	}
	
	transaction = pool.verified.ready.transactions[id];
	if (transaction !== undefined) {
		return {
			transaction: transaction,
			status: 'ready'
		};
	}
	return {
		transaction: undefined,
		status: 'Transaction not in pool'
	};
};

/**
 * Gets all transactions based on limited filters.
 * @implements {__private.getTransactionsFromPoolList}
 * @implements {__private.getAllPoolTransactionsByFilter}
 * @param {string} filter
 * @param {Object} params
 * @return {[transaction]} transaction list based on filter.
 */
TransactionPool.prototype.getAll  = function (filter, params) {
	switch (filter) {
		case 'unverified':
			return __private.getTransactionsFromPoolList(pool.unverified.transactions, params.reverse, params.limit);
		case 'pending':
			return __private.getTransactionsFromPoolList(pool.verified.pending.transactions, params.reverse, params.limit);
		case 'ready':
			return __private.getTransactionsFromPoolList(pool.verified.ready.transactions, params.reverse, params.limit);
		case 'sender_id':
			return __private.getAllPoolTransactionsByFilter({'senderId': params.id});
		case 'sender_pk':
			return __private.getAllPoolTransactionsByFilter({'senderPublicKey': params.publicKey});
		case 'recipient_id':
			return __private.getAllPoolTransactionsByFilter({'recipientId': params.id});
		case 'recipient_pk':
			return __private.getAllPoolTransactionsByFilter({'requesterPublicKey': params.publicKey});
		default:
			return 'Invalid filter';
	}
};

/**
 * Gets ready transactions ordered by fee and received time.
 * @param {number} limit
 * @return {transaction[]}
 */
TransactionPool.prototype.getReady = function (limit) {
	var r = _.orderBy(pool.verified.ready.transactions, ['fee', 'receivedAt'],['desc', 'asc']);
	if (limit && limit < r.length) {
		r.splice(limit);
	}
	return r;
};

/**
 * Checks sender has enough credit to apply transaction.
 * @param {transaction} transaction
 * @param {address} sender
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} err, transactions
 */
TransactionPool.prototype.checkBalance  = function (transaction, sender, cb) {
	var poolBalance = new bignum('0');
	var paymentTransactions;
	var receiptTransactions;

	library.logic.account.get({ address: sender.address }, 'balance', function (err, account) {
		if (err) {
			return setImmediate(cb, err);
		}
		if (account === null) {
			account = {};
			account.balance = 0;
		}
		// total payments
		paymentTransactions = self.getAll('sender_id', { id: sender.address });
		if (paymentTransactions.ready.length > 0) {
			paymentTransactions.ready.forEach(function (paymentTransaction) {
				if (paymentTransaction.amount) {
					poolBalance = poolBalance.minus(paymentTransaction.amount.toString());
				}
				poolBalance = poolBalance.minus(paymentTransaction.fee.toString());
			});
		}
		
		// total receipts
		receiptTransactions = self.getAll('recipient_id', { id: sender.address });
		if (receiptTransactions.ready.length > 0) {
			receiptTransactions.ready.forEach(function (receiptTransaction) {
				if (receiptTransaction.type === transactionTypes.SEND) {
					poolBalance = poolBalance.plus(receiptTransaction.amount.toString());
				}
			});
		}

		// total balance
		var balance = new bignum(account.balance.toString());
		balance = balance.plus(poolBalance);

		// Check confirmed sender balance
		var amount = new bignum(transaction.amount.toString()).plus(transaction.fee.toString());
		var exceeded = balance.lessThan(amount);

		if (exceeded) {
			return setImmediate(cb, [
				'Account does not have enough LSK:', sender.address,
				'balance:', balance.div(Math.pow(10,8))
			].join(' '));
		}

		return setImmediate(cb, null, [
			'balance:', balance.div(Math.pow(10,8))
		].join(' '));
	});
};

/**
 * Validates a transaction and adds it to the verified pool list.
 * @implements {__private.addToVerified}
 * @param {transaction} transaction
 * @param {boolean} broadcast
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
TransactionPool.prototype.addFromPublic = function (transaction, broadcast, cb) {
	__private.addToVerified(transaction, broadcast, cb);
};

/**
 * Adds transactions to unverified pool list.
 * @implements {__private.addToUnverified}
 * @param {transaction} transactions
 * @param {boolean} broadcast
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
TransactionPool.prototype.addFromPeer = function (transactions, broadcast, cb) {
	if (!Array.isArray(transactions)) {
		transactions = [transactions];
	}
	async.eachSeries(transactions, function (transaction, cb) {
		__private.addToUnverified(transaction, broadcast, cb);
	}, function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Adds transactions to verified.ready pool list.
 * @implements {__private.addToPoolList}
 * @implements {delete}
 * @param {transaction} transactions
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
TransactionPool.prototype.addReady = function (transactions, cb) {
	if (!Array.isArray(transactions)) {
		transactions = [transactions];
	}
	var resetReceivedAt = new Date();
	async.eachSeries(transactions, function (transaction, eachSeriesCb) {
		self.delete(transaction);
		transaction.receivedAt = resetReceivedAt;
		__private.addToPoolList(transaction, pool.verified.ready, eachSeriesCb);
	}, function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Creates and adds signature to multisignature transaction.
 * @implements {__private.createSignature}
 * @param {String} transactionId transaction id
 * @param {String} secret secret
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error | cb
 */
TransactionPool.prototype.addSignature = function (transactionId, secret, cb) {
	var multisignatureTransaction = pool.verified.pending.transactions[transactionId];

	if (multisignatureTransaction === undefined) {
		library.logger.error(['Failed to add signature to multisignature. Transaction', transactionId, 'not in pool'].join(' '));
		return setImmediate(cb, 'Transaction not in pool');
	}

	// TODO: replace with checkSignature to reflect API 1.0.18 functionality
	__private.createSignature(multisignatureTransaction, secret, function (err, signature) {
		if (err) {
			return setImmediate(cb, err);
		}
		if (multisignatureTransaction.signatures.indexOf(signature) !== -1) {
			library.logger.error(['Transaction already signed:', transactionId].join(' '));
			return setImmediate(cb, 'Transaction already signed');
		}
	
		multisignatureTransaction.signatures.push(signature);
		return setImmediate(cb);
	});
};

/**
 * Deletes transaction from pool list.
 * @implements {__private.delete}
 * @param {string} id transaction id
 * @return {Array} names of cleared lists
 */
TransactionPool.prototype.delete = function (id) {
	var clearedList = [];
	var poolList = ['unverified','pending','ready'];

	[pool.unverified, pool.verified.pending, pool.verified.ready].forEach(function (list, index) {
		if (__private.delete(id, list)) {
			clearedList.push(poolList[index]);
		}
	});
	if (clearedList.length > 0) {
		if (clearedList.length > 1) {
			library.logger.debug(['Cleared duplicated transaction in pool list:', clearedList, 'transaction id:', id].join(' '));
		}
	}
	return clearedList;	
};

/**
 * Deletes transactions from pool lists and rechecks balance for ready transactions
 * @implements {__private.delete}
 * @param {string} id transaction id
 * @return {Array} names of cleared lists
 */
TransactionPool.prototype.sanitizeTransactions = function (transactions) {
	transactions.forEach(function (transaction) {
		self.delete(transaction.id);
	});
};

/**
 * Pulls transactions from unverified, perform verifications and if successful
 * push to either verified.pending (when transaction is multisign or timestamp is in 
 * future) or verified.ready otherwise.
 * @implements {__private.delete}
 * @implements {__private.processUnverifiedTransaction}
 * @implements {self.checkBalance}
 * @implements {__private.moveToVerified}
 * @implements {__private.addReadyCheckBroadcast}
 * @param {function} cb
 * @return {setImmediateCallback} err | cb
 */
TransactionPool.prototype.processPool = function (cb) {
	async.series({
		processUnverified: function (seriesCb) {
			if (pool.unverified.count === 0) {
				return setImmediate(seriesCb);
			}

			async.eachSeries(pool.unverified.transactions, function (transaction, eachSeriesCb) {
				__private.delete(transaction.id, pool.unverified);
				__private.processUnverifiedTransaction(transaction, function (err, sender) {
					if (err) {
						library.logger.error('Failed to process unverified transaction: ' + transaction.id, err);
						return setImmediate(eachSeriesCb);
					}
					self.checkBalance(transaction, sender, function (err, balance) {
						if (err) {
							library.logger.error('Failed to check balance transaction: ' + transaction.id, err);
							return setImmediate(eachSeriesCb);
						}
						return __private.moveToVerified(transaction, eachSeriesCb);
					});
				});
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		},
		processPending: function (seriesCb) {
			if (pool.verified.pending.count === 0) {
				return setImmediate(seriesCb);
			}

			// process pool.verified.pending (multisig transactions signs), and take care 
			// about moving transactions from `verified.pending` to `verified.ready`
			async.eachSeries(pool.verified.pending.transactions, function (transaction, eachSeriesCb) {
				// Check multisignatures
				if (transaction.type === transactionTypes.MULTI && 
					Array.isArray(transaction.signatures) && 
					transaction.signatures.length >= transaction.asset.multisignature.min
				) {
					__private.delete(transaction.id, pool.verified.pending);
					__private.addReadyCheckBroadcast(transaction, eachSeriesCb);
				} else {
					return setImmediate(eachSeriesCb);
				}
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		}
	}, function (err) {
		library.bus.message('unverifiedTransaction', pool.broadcast);
		pool.broadcast = [];
		return setImmediate(cb, err);
	});
};

/**
 * Expires transactions.
 * @implements {__private.expireTransactionsFromList}
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} error, cb
 */
TransactionPool.prototype.expireTransactions = function (cb) {

	async.series([
		function (seriesCb) {
			__private.expireTransactionsFromList(pool.unverified, seriesCb);
		},
		function (seriesCb) {
			__private.expireTransactionsFromList(pool.verified.pending, seriesCb);
		},
		function (seriesCb) {
			__private.expireTransactionsFromList(pool.verified.ready, seriesCb);
		}
	], function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Reset invalid transactions.
 */
TransactionPool.prototype.resetInvalidTransactions = function () {
	var counter = 0;

	for (var transaction in pool.invalid.transactions) {
		delete pool.invalid.transactions[transaction];
		counter++;
	}
	pool.invalid.count = 0;
	return counter;
};

// Export
module.exports = TransactionPool;
