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

const async = require('async');
// eslint-disable-next-line  prefer-const
let jobsQueue = require('../helpers/jobs_queue.js');
const transactionTypes = require('../helpers/transaction_types.js');

let modules;
let library;
let self;
const {
	EXPIRY_INTERVAL,
	MAX_TRANSACTIONS_PER_BLOCK,
	MAX_SHARED_TRANSACTIONS,
	UNCONFIRMED_TRANSACTION_TIMEOUT,
} = global.constants;
const __private = {};

/**
 * Transaction pool logic. Initializes variables, sets bundled transaction timer and
 * transaction expiry timer.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires async
 * @requires helpers/jobs_queue
 * @requires helpers/transaction_types
 * @param {number} broadcastInterval - Broadcast interval in seconds, used for bundling
 * @param {number} releaseLimit - Release limit for transactions broadcasts, used for bundling
 * @param {Transaction} transaction - Transaction logic instance
 * @param {bus} bus - Bus instance
 * @param {Object} logger - Logger instance
 * @param {Sequence} balancesSequence - Balances sequence
 */
class TransactionPool {
	constructor(
		broadcastInterval,
		releaseLimit,
		transaction,
		bus,
		logger,
		balancesSequence,
		config
	) {
		const { maxTransactionsPerQueue } = config.transactions;

		library = {
			logger,
			bus,
			logic: {
				transaction,
			},
			config: {
				broadcasts: {
					broadcastInterval,
					releaseLimit,
				},
				transactions: {
					maxTransactionsPerQueue,
				},
			},
			balancesSequence,
		};
		self = this;
		self.unconfirmed = { transactions: [], index: {} };
		self.bundled = { transactions: [], index: {} };
		self.queued = { transactions: [], index: {} };
		self.multisignature = { transactions: [], index: {} };
		self.expiryInterval = EXPIRY_INTERVAL;
		self.bundledInterval = library.config.broadcasts.broadcastInterval;
		self.bundleLimit = library.config.broadcasts.releaseLimit;
		self.processed = 0;
		self.hourInSeconds = 3600;

		jobsQueue.register(
			'transactionPoolNextBundle',
			nextBundle,
			self.bundledInterval
		);

		jobsQueue.register(
			'transactionPoolNextExpiry',
			nextExpiry,
			self.expiryInterval
		);
	}
}

// Bundled transaction timer
function nextBundle(cb) {
	self.processBundled(err => {
		if (err) {
			library.logger.log('Bundled transaction timer', err);
		}
		return setImmediate(cb);
	});
}

// Transaction expiry timer
function nextExpiry(cb) {
	self.expireTransactions(err => {
		if (err) {
			library.logger.log(
				'Error while processing the expired transactions',
				err
			);
		}
		return setImmediate(cb);
	});
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Bounds input parameters to private variable modules.
 *
 * @param {Accounts} accounts - Accounts module instance
 * @param {Transactions} transactions - Transactions module instance
 * @param {Loader} loader - Loader module instance
 */
TransactionPool.prototype.bind = function(accounts, transactions, loader) {
	modules = {
		accounts,
		transactions,
		loader,
	};
};

/**
 * Returns true if index exists in at least one lists of indexes.
 * Lists: unconfirmed, bundled, queued, multisignature.
 *
 * @param {string} id - Transaction id
 * @returns {boolean}
 */
TransactionPool.prototype.transactionInPool = function(id) {
	return [
		self.unconfirmed.index[id],
		self.bundled.index[id],
		self.queued.index[id],
		self.multisignature.index[id],
	].some(index => typeof index === 'number');
};

/**
 * Gets an unconfirmed transaction based on transaction id.
 *
 * @param {string} id - Transaction id
 * @returns {Object|undefined} Transaction or undefined
 */
TransactionPool.prototype.getUnconfirmedTransaction = function(id) {
	const index = self.unconfirmed.index[id];
	return self.unconfirmed.transactions[index];
};

/**
 * Gets a bundled transaction based on transaction id.
 *
 * @param {string} id - Transaction id
 * @returns {Object|undefined} Transaction or undefined
 * @todo This function is never called
 */
TransactionPool.prototype.getBundledTransaction = function(id) {
	const index = self.bundled.index[id];
	return self.bundled.transactions[index];
};

/**
 * Gets a queued transaction based on transaction id.
 *
 * @param {string} id - Transaction id
 * @returns {Object|undefined} Transaction or undefined
 */
TransactionPool.prototype.getQueuedTransaction = function(id) {
	const index = self.queued.index[id];
	return self.queued.transactions[index];
};

/**
 * Gets multisignature transactions based on transaction id.
 *
 * @param {string} id - Transaction id
 * @returns {Object[]} Array of multisignature transactions
 */
TransactionPool.prototype.getMultisignatureTransaction = function(id) {
	const index = self.multisignature.index[id];
	return self.multisignature.transactions[index];
};

/**
 * Gets unconfirmed transactions based on limit and reverse option.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @returns {Object[]} Of bundled transactions
 */
TransactionPool.prototype.getUnconfirmedTransactionList = function(
	reverse,
	limit
) {
	return __private.getTransactionList(
		self.unconfirmed.transactions,
		reverse,
		limit
	);
};

/**
 * Gets bundled transactions based on limit and reverse option.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @returns {Object[]} Of bundled transactions
 */
TransactionPool.prototype.getBundledTransactionList = function(reverse, limit) {
	return __private.getTransactionList(
		self.bundled.transactions,
		reverse,
		limit
	);
};

/**
 * Gets queued transactions based on limit and reverse option.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @returns {Object[]} Of bundled transactions
 */
TransactionPool.prototype.getQueuedTransactionList = function(reverse, limit) {
	return __private.getTransactionList(self.queued.transactions, reverse, limit);
};

/**
 * Gets multisignature transactions based on limit and reverse option.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @param {boolean} ready - Limits results to transactions deemed "ready"
 * @returns {Object[]} Of multisignature transactions
 */
TransactionPool.prototype.getMultisignatureTransactionList = function(
	reverse,
	limit,
	ready
) {
	if (ready) {
		return __private
			.getTransactionList(self.multisignature.transactions, reverse)
			.filter(transaction => transaction.ready);
	}
	return __private.getTransactionList(
		self.multisignature.transactions,
		reverse,
		limit
	);
};

/**
 * Gets unconfirmed, multisignature and queued transactions based on limit and reverse option.
 *
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @returns {Object[]} Of unconfirmed, multisignatures, queued transactions
 * @todo Limit is only implemented with queued transactions, reverse param is unused
 */
TransactionPool.prototype.getMergedTransactionList = function(reverse, limit) {
	const minLimit = MAX_TRANSACTIONS_PER_BLOCK + 2;

	if (limit <= minLimit || limit > MAX_SHARED_TRANSACTIONS) {
		limit = minLimit;
	}

	const unconfirmed = self.getUnconfirmedTransactionList(
		false,
		MAX_TRANSACTIONS_PER_BLOCK
	);
	limit -= unconfirmed.length;

	const multisignatures = self.getMultisignatureTransactionList(
		false,
		MAX_TRANSACTIONS_PER_BLOCK
	);
	limit -= multisignatures.length;

	const queued = self.getQueuedTransactionList(false, limit);
	limit -= queued.length;

	return [...unconfirmed, ...multisignatures, ...queued];
};

/**
 * Adds a transaction to the unconfirmed index, removing it from the multisignature or queued indexes.
 *
 * @param {Object} transaction - Transaction object
 * @param {Object} sender - Sender object
 */
TransactionPool.prototype.addUnconfirmedTransaction = function(
	transaction,
	sender
) {
	const isMultisignature =
		transaction.type === transactionTypes.MULTI ||
		(sender &&
			Array.isArray(sender.multisignatures) &&
			sender.multisignatures.length);
	if (isMultisignature) {
		self.removeMultisignatureTransaction(transaction.id);
	} else {
		self.removeQueuedTransaction(transaction.id);
	}

	if (self.unconfirmed.index[transaction.id] === undefined) {
		self.unconfirmed.transactions.push(transaction);
		const index = self.unconfirmed.transactions.indexOf(transaction);
		self.unconfirmed.index[transaction.id] = index;
	}
};

/**
 * Removes a transaction from the unconfirmed index, also removing it from the multisignature or queued indexes.
 * Also removes id from queued and multisignature.
 *
 * @param {string} id - Transaction id
 */
TransactionPool.prototype.removeUnconfirmedTransaction = function(id) {
	const index = self.unconfirmed.index[id];

	if (index !== undefined) {
		self.unconfirmed.transactions[index] = false;
		delete self.unconfirmed.index[id];
	}

	self.removeQueuedTransaction(id);
	self.removeMultisignatureTransaction(id);
};

/**
 * Counts the number of transactions in the unconfirmed index.
 *
 * @returns {number} Of transactions in the unconfirmed index
 */
TransactionPool.prototype.countUnconfirmed = function() {
	return Object.keys(self.unconfirmed.index).length;
};

/**
 * Adds a transaction to the bundled index.
 *
 * @param {Object} transaction - Transaction object
 */
TransactionPool.prototype.addBundledTransaction = function(transaction) {
	if (self.bundled.index[transaction.id] === undefined) {
		self.bundled.transactions.push(transaction);
		const index = self.bundled.transactions.indexOf(transaction);
		self.bundled.index[transaction.id] = index;
	}
};

/**
 Removes a transaction from the bundled index.

 * @param {string} id - Transaction id
 */
TransactionPool.prototype.removeBundledTransaction = function(id) {
	const index = self.bundled.index[id];

	if (index !== undefined) {
		self.bundled.transactions[index] = false;
		delete self.bundled.index[id];
	}
};

/**
 * Counts the number of transactions in the bundled index.
 *
 * @returns {number} Of transactions in the bundled index
 */
TransactionPool.prototype.countBundled = function() {
	return Object.keys(self.bundled.index).length;
};

/**
 * Adds a transaction to the queued index.
 *
 * @param {Object} transaction - Transaction object
 */
TransactionPool.prototype.addQueuedTransaction = function(transaction) {
	if (self.queued.index[transaction.id] === undefined) {
		self.queued.transactions.push(transaction);
		const index = self.queued.transactions.indexOf(transaction);
		self.queued.index[transaction.id] = index;
	}
};

/**
 * Removes a transaction from the queued index.
 *
 * @param {string} id - Transaction id
 */
TransactionPool.prototype.removeQueuedTransaction = function(id) {
	const index = self.queued.index[id];

	if (index !== undefined) {
		self.queued.transactions[index] = false;
		delete self.queued.index[id];
	}
};

/**
 * Counts the number of transactions in the queued index.
 *
 * @returns {number} Of transactions in the queued index
 */
TransactionPool.prototype.countQueued = function() {
	return Object.keys(self.queued.index).length;
};

/**
 * Adds a transaction to the multisignature index.
 *
 * @param {Object} transaction - Transaction object
 */
TransactionPool.prototype.addMultisignatureTransaction = function(transaction) {
	if (self.multisignature.index[transaction.id] === undefined) {
		self.multisignature.transactions.push(transaction);
		const index = self.multisignature.transactions.indexOf(transaction);
		self.multisignature.index[transaction.id] = index;
	}
};

/**
 * Removes a transaction from the multisignature index.
 *
 * @param {string} id - Transaction id
 */
TransactionPool.prototype.removeMultisignatureTransaction = function(id) {
	const index = self.multisignature.index[id];

	if (index !== undefined) {
		self.multisignature.transactions[index] = false;
		delete self.multisignature.index[id];
	}
};

/**
 * Counts the number of transactions in the multisignature index.
 *
 * @returns {number} Of transactions in the multisignature index
 */
TransactionPool.prototype.countMultisignature = function() {
	return Object.keys(self.multisignature.index).length;
};

/**
 * Receives transactions into the pool and add them to a queue.
 *
 * @param {Object[]} transactions - Array of received transactions
 * @param {boolean} broadcast - Broadcast flag
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, transactions
 */
TransactionPool.prototype.receiveTransactions = function(
	transactions,
	broadcast,
	cb
) {
	async.eachSeries(
		transactions,
		(transaction, cb) => {
			self.processUnconfirmedTransaction(transaction, broadcast, cb);
		},
		err => setImmediate(cb, err, transactions)
	);
};

/**
 * Reindexes all transaction queues, accounting for previously removed/falsified entries.
 */
TransactionPool.prototype.reindexQueues = function() {
	['bundled', 'queued', 'multisignature', 'unconfirmed'].forEach(queue => {
		self[queue].index = {};
		self[queue].transactions = self[queue].transactions.filter(Boolean);
		self[queue].transactions.forEach(transaction => {
			const index = self[queue].transactions.indexOf(transaction);
			self[queue].index[transaction.id] = index;
		});
	});
};

/**
 * Processes the next bundle of transactions and add them to the queued index.
 *
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Compare / standardize the returns-description
 */
TransactionPool.prototype.processBundled = function(cb) {
	const bundled = self.getBundledTransactionList(true, self.bundleLimit);

	library.balancesSequence.add(
		balancesSequenceCb => {
			async.eachSeries(
				bundled,
				(transaction, eachSeriesCb) => {
					if (!transaction) {
						return setImmediate(eachSeriesCb);
					}
					__private.processVerifyTransaction(
						transaction,
						true,
						(processVerifyErr, sender) => {
							// Remove bundled transaction after asynchronous processVerifyTransaction to avoid race conditions
							self.removeBundledTransaction(transaction.id);
							// Delete bundled flag from transaction so it is qualified as "queued" in queueTransaction
							delete transaction.bundled;

							if (processVerifyErr) {
								library.logger.debug(
									`Failed to process / verify bundled transaction: ${
										transaction.id
									}`,
									processVerifyErr
								);
								return setImmediate(eachSeriesCb);
							}
							self.queueTransaction(transaction, sender, queueErr => {
								if (queueErr) {
									library.logger.debug(
										`Failed to queue bundled transaction: ${transaction.id}`,
										queueErr
									);
								}
								return setImmediate(eachSeriesCb);
							});
						}
					);
				},
				balancesSequenceCb
			);
		},
		balancesSequenceErr => setImmediate(cb, balancesSequenceErr)
	);
};

/**
 * Processes an unconfirmed transaction.
 * If transaction is not already processed, and processed count is greather than 1000, it reindexes thequeues.
 * If transaction was bundled, it queues the transaction for later processing.
 * Else it immediately processes and verifies the transaction.
 *
 * @param {Object} transaction - Transaction object
 * @param {Object} broadcast - Broadcast flag
 * @param {function} cb - Callback function
 * @returns {SetImmediate|queueTransaction}
 */
TransactionPool.prototype.processUnconfirmedTransaction = function(
	transaction,
	broadcast,
	cb,
	tx
) {
	if (self.transactionInPool(transaction.id)) {
		return setImmediate(
			cb,
			`Transaction is already processed: ${transaction.id}`
		);
	}
	self.processed++;
	if (self.processed > 1000) {
		self.reindexQueues();
		self.processed = 1;
	}

	if (transaction.bundled) {
		return self.queueTransaction(transaction, null, cb);
	}

	__private.processVerifyTransaction(
		transaction,
		broadcast,
		(err, sender) => {
			if (!err) {
				return self.queueTransaction(transaction, sender, cb);
			}
			return setImmediate(cb, err);
		},
		tx
	);
};

/**
 * Places a transaction onto the bundled, multisignature, or queued index.
 *
 * @param {Object} transaction - Transaction object
 * @param {Object} sender - Sender object
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 */
TransactionPool.prototype.queueTransaction = function(transaction, sender, cb) {
	transaction.receivedAt = new Date();

	if (transaction.bundled) {
		if (
			self.countBundled() >= library.config.transactions.maxTransactionsPerQueue
		) {
			return setImmediate(cb, 'Transaction pool is full');
		}
		self.addBundledTransaction(transaction);
		return setImmediate(cb);
	}
	const isMultisignature =
		transaction.type === transactionTypes.MULTI ||
		(sender &&
			Array.isArray(sender.multisignatures) &&
			sender.multisignatures.length);
	if (isMultisignature) {
		if (
			self.countMultisignature() >=
			library.config.transactions.maxTransactionsPerQueue
		) {
			return setImmediate(cb, 'Transaction pool is full');
		}
		self.addMultisignatureTransaction(transaction);
	} else if (
		self.countQueued() >= library.config.transactions.maxTransactionsPerQueue
	) {
		return setImmediate(cb, 'Transaction pool is full');
	} else {
		self.addQueuedTransaction(transaction);
	}
	return setImmediate(cb);
};

/**
 * Undoes the unconfirmed queue, reverting the unconfirmed state of each transaction.
 *
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, ids[]
 */
TransactionPool.prototype.undoUnconfirmedList = function(cb, tx) {
	const ids = [];

	library.balancesSequence.add(
		balancesSequenceCb => {
			async.eachSeries(
				self.getUnconfirmedTransactionList(false),
				(transaction, eachSeriesCb) => {
					if (transaction) {
						ids.push(transaction.id);
						modules.transactions.undoUnconfirmed(
							transaction,
							undoUnconfirmErr => {
								// Remove transaction from unconfirmed, queued and multisignature lists
								self.removeUnconfirmedTransaction(transaction.id);
								if (undoUnconfirmErr) {
									library.logger.error(
										`Failed to undo unconfirmed transaction: ${transaction.id}`,
										undoUnconfirmErr
									);
									return setImmediate(eachSeriesCb);
								}

								// Transaction successfully undone from unconfirmed states, try moving it to queued list
								self.processUnconfirmedTransaction(
									transaction,
									false,
									processUnconfirmErr => {
										if (processUnconfirmErr) {
											library.logger.debug(
												`Failed to queue transaction back after successful undo unconfirmed: ${
													transaction.id
												}`,
												processUnconfirmErr
											);
										}
										return setImmediate(eachSeriesCb);
									},
									tx
								);
							},
							tx
						);
					} else {
						return setImmediate(eachSeriesCb);
					}
				},
				eachSeriesErr => setImmediate(balancesSequenceCb, eachSeriesErr)
			);
		},
		balanceSequenceErr => setImmediate(cb, balanceSequenceErr, ids)
	);
};

/**
 * Expires unconfirmed, queued and multisignature transactions.
 *
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, ids[]
 */
TransactionPool.prototype.expireTransactions = function(cb) {
	library.balancesSequence.add(
		balancesSequenceCb => {
			async.waterfall(
				[
					function(waterfallCb) {
						__private.expireAndUndoUnconfirmedTransactions(
							self.getUnconfirmedTransactionList(true),
							waterfallCb
						);
					},
					function(waterfallCb) {
						__private.expireTransactions(
							self.getQueuedTransactionList(true),
							waterfallCb
						);
					},
					function(waterfallCb) {
						__private.expireTransactions(
							self.getMultisignatureTransactionList(true),
							waterfallCb
						);
					},
				],
				balancesSequenceCb
			);
		},
		err => setImmediate(cb, err)
	);
};

/**
 * Applies the next block of unconfirmed transactions.
 * Including up to 5 multisignature transactions when there is spare capacity.
 *
 * @param {function} cb - Callback function
 * @returns {SetImmediate|applyUnconfirmedList}
 */
TransactionPool.prototype.fillPool = function(cb) {
	const unconfirmedCount = self.countUnconfirmed();
	library.logger.debug(`Transaction pool size: ${unconfirmedCount}`);

	if (unconfirmedCount >= MAX_TRANSACTIONS_PER_BLOCK) {
		return setImmediate(cb);
	}
	let spare = 0;
	const multisignaturesLimit = 5;

	spare = MAX_TRANSACTIONS_PER_BLOCK - unconfirmedCount;
	const spareMulti = spare >= multisignaturesLimit ? multisignaturesLimit : 0;
	const multisignatures = self
		.getMultisignatureTransactionList(true, multisignaturesLimit, true)
		.slice(0, spareMulti);
	spare = Math.abs(spare - multisignatures.length);
	const queuedTransactions = self
		.getQueuedTransactionList(true, MAX_TRANSACTIONS_PER_BLOCK)
		.slice(0, spare);

	return __private.applyUnconfirmedList(
		[...multisignatures, ...queuedTransactions],
		cb
	);
};

/**
 * Returns a given list of transactions, reversed and/or limited.
 *
 * @private
 * @param {Object[]} transactions - Array of trasactions
 * @param {boolean} reverse - Reverse order of results
 * @param {number} limit - Limit applied to results
 * @returns {Object[]} Of transactions, reversed and/or limited
 */
__private.getTransactionList = function(transactions, reverse, limit) {
	let transactionList = [];

	for (let i = 0; i < transactions.length; i++) {
		const transaction = transactions[i];

		if (transaction !== false) {
			transactionList.push(transaction);
		}
	}

	transactionList = reverse ? transactionList.reverse() : transactionList;

	if (limit) {
		transactionList.splice(limit);
	}

	return transactionList;
};

/**
 * Check if transaction exists in unconfirmed queue.
 *
 * @private
 * @param {Object} transaction - Transaction object
 * @returns {Boolean}
 */
__private.isTransactionInUnconfirmedQueue = function(transaction) {
	return typeof self.unconfirmed.index[transaction.id] === 'number';
};

/**
 * Processes and verifies a transaction.
 *
 * @private
 * @param {Object} transaction - Transaction object
 * @param {Object} broadcast - Broadcast flag
 * @param {function} cb - Callback function
 * @param {Object} tx
 * @returns {SetImmediate} errors, sender
 * @todo Add description for tx parameter
 */
__private.processVerifyTransaction = function(transaction, broadcast, cb, tx) {
	if (!transaction) {
		return setImmediate(cb, 'Missing transaction');
	}

	// At this point, transaction should not be in unconfirmed state,
	// but this is a final barrier to stop us from making unconfirmed state dirty.
	if (__private.isTransactionInUnconfirmedQueue(transaction)) {
		return setImmediate(cb, 'Transaction is already in unconfirmed state');
	}

	async.waterfall(
		[
			function setAccountAndGet(waterCb) {
				modules.accounts.setAccountAndGet(
					{ publicKey: transaction.senderPublicKey },
					waterCb,
					tx
				);
			},
			function getRequester(sender, waterCb) {
				const multisignatures =
					Array.isArray(sender.multisignatures) &&
					sender.multisignatures.length;

				if (multisignatures) {
					transaction.signatures = transaction.signatures || [];
				}

				if (sender && transaction.requesterPublicKey && multisignatures) {
					modules.accounts.getAccount(
						{ publicKey: transaction.requesterPublicKey },
						(err, requester) => {
							if (!requester) {
								return setImmediate(waterCb, 'Requester not found');
							}
							return setImmediate(waterCb, null, sender, requester);
						},
						tx
					);
				} else {
					return setImmediate(waterCb, null, sender, null);
				}
			},
			function processTransaction(sender, requester, waterCb) {
				library.logic.transaction.process(
					transaction,
					sender,
					requester,
					err => {
						if (err) {
							return setImmediate(waterCb, err);
						}
						return setImmediate(waterCb, null, sender);
					},
					tx
				);
			},
			function normalizeTransaction(sender, waterCb) {
				try {
					transaction = library.logic.transaction.objectNormalize(transaction);
					return setImmediate(waterCb, null, sender);
				} catch (err) {
					return setImmediate(waterCb, err);
				}
			},
			function verifyTransaction(sender, waterCb) {
				library.logic.transaction.verify(
					transaction,
					sender,
					null,
					true,
					err => {
						if (err) {
							return setImmediate(waterCb, err);
						}
						return setImmediate(waterCb, null, sender);
					},
					tx
				);
			},
		],
		(err, sender) => {
			if (!err) {
				library.bus.message('unconfirmedTransaction', transaction, broadcast);
			}

			return setImmediate(cb, err, sender);
		}
	);
};

/**
 * Processes and verifies transactions, applying each one as unconfirmed if deemed valid.
 *
 * @private
 * @param {Object[]} transactions - Array of transactions to be applied
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 */
__private.applyUnconfirmedList = function(transactions, cb, tx) {
	library.balancesSequence.add(
		balancesSequenceCb => {
			async.eachSeries(
				transactions,
				(transaction, eachSeriesCb) => {
					if (!transaction) {
						return setImmediate(eachSeriesCb);
					}
					__private.processVerifyTransaction(
						transaction,
						false,
						(processVerifyErr, sender) => {
							if (processVerifyErr) {
								library.logger.error(
									`Failed to process / verify unconfirmed transaction: ${
										transaction.id
									}`,
									processVerifyErr
								);
								self.removeQueuedTransaction(transaction.id);
								return setImmediate(eachSeriesCb);
							}
							modules.transactions.applyUnconfirmed(
								transaction,
								sender,
								applyUnconfirmErr => {
									if (applyUnconfirmErr) {
										library.logger.error(
											`Failed to apply unconfirmed transaction: ${
												transaction.id
											}`,
											applyUnconfirmErr
										);
										self.removeQueuedTransaction(transaction.id);
										return setImmediate(eachSeriesCb);
									}
									// Transaction successfully applied to unconfirmed states, move it to unconfirmed list
									self.addUnconfirmedTransaction(transaction, sender);
									return setImmediate(eachSeriesCb);
								},
								tx
							);
						},
						tx
					);
				},
				balancesSequenceCb
			);
		},
		() => setImmediate(cb)
	);
};

/**
 * Calculates the timeout in seconds for expiry based on the given transaction type.
 *
 * @private
 * @param {Object} transaction - Transaction object
 * @returns {number} Timeout in seconds for expiry
 */
__private.transactionTimeOut = function(transaction) {
	if (transaction.type === transactionTypes.MULTI) {
		return transaction.asset.multisignature.lifetime * self.hourInSeconds;
	} else if (Array.isArray(transaction.signatures)) {
		return UNCONFIRMED_TRANSACTION_TIMEOUT * 8;
	}
	return UNCONFIRMED_TRANSACTION_TIMEOUT;
};

/**
 * Check if transaction is expired.
 *
 * @private
 * @param {Object} transactions - transaction to be expired
 * @returns {Boolean} true if transactions expired
 */
__private.isExpired = transaction => {
	const timeNow = Math.floor(Date.now() / 1000);
	const timeOut = __private.transactionTimeOut(transaction);
	// transaction.receivedAt is instance of Date
	const timeElapsed =
		timeNow - Math.floor(transaction.receivedAt.getTime() / 1000);
	return timeElapsed > timeOut;
};

/**
 * Removes transactions from the pool if they have expired.
 *
 * @private
 * @param {Object[]} transactions - Array of transactions to be expired
 * @param {string[]} parentIds - Array of transaction ids concatenated from parent caller
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, ids[]
 */
__private.expireTransactions = function(transactions, cb) {
	async.eachSeries(
		transactions,
		(transaction, eachSeriesCb) => {
			if (!transaction) {
				return setImmediate(eachSeriesCb);
			}

			if (__private.isExpired(transaction)) {
				self.removeUnconfirmedTransaction(transaction.id);
				library.logger.info(
					`Expired transaction: ${
						transaction.id
					} received at: ${transaction.receivedAt.toUTCString()}`
				);
				return setImmediate(eachSeriesCb);
			}
			return setImmediate(eachSeriesCb);
		},
		err => setImmediate(cb, err)
	);
};

/**
 * Undo unconfirmed transaction from mem account and removes transactions from the pool if it is expired.
 *
 * @private
 * @param {Object[]} transactions - Array of unconfirmed transactions to be undo and expire
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, ids[]
 */
__private.expireAndUndoUnconfirmedTransactions = (transactions, cb) => {
	async.eachSeries(
		transactions,
		(transaction, eachSeriesCb) => {
			if (!transaction) {
				return setImmediate(eachSeriesCb);
			}

			if (!__private.isExpired(transaction)) {
				return setImmediate(eachSeriesCb);
			}
			modules.transactions.undoUnconfirmed(transaction, undoUnconfirmErr => {
				if (undoUnconfirmErr) {
					library.logger.error(
						`Failed to undo unconfirmed transaction: ${transaction.id}`,
						undoUnconfirmErr
					);
					return setImmediate(eachSeriesCb, undoUnconfirmErr);
				}
				// Remove transaction from unconfirmed, queued and multisignature lists
				self.removeUnconfirmedTransaction(transaction.id);
				library.logger.info(
					`Expired transaction: ${
						transaction.id
					} received at: ${transaction.receivedAt.toUTCString()}`
				);
				return setImmediate(eachSeriesCb);
			});
		},
		err => setImmediate(cb, err)
	);
};

module.exports = TransactionPool;
