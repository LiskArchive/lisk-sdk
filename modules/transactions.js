'use strict';

var async = require('async');
var ByteBuffer = require('bytebuffer');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var extend = require('extend');
var genesisblock = null;
var OrderBy = require('../helpers/orderBy.js');
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/transactions.js');
var slots = require('../helpers/slots.js');
var sql = require('../sql/transactions.js');
var TransactionPool = require('../logic/transactionPool.js');
var transactionTypes = require('../helpers/transactionTypes.js');
var Transfer = require('../logic/transfer.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

// Constructor
function Transactions (cb, scope) {
	library = scope;
	genesisblock = library.genesisblock;
	self = this;

	__private.attachApi();
	__private.transactionPool = new TransactionPool(library);

	__private.assetTypes[transactionTypes.SEND] = library.logic.transaction.attachAssetType(
		transactionTypes.SEND, new Transfer()
	);

	setImmediate(cb, null, self);
}

// Private methods
__private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});

	router.map(shared, {
		'get /': 'getTransactions',
		'get /get': 'getTransaction',
		'get /count': 'getTransactionsCount',
		'get /queued/get': 'getQueuedTransaction',
		'get /queued': 'getQueuedTransactions',
		'get /multisignatures/get': 'getMultisignatureTransaction',
		'get /multisignatures': 'getMultisignatureTransactions',
		'get /unconfirmed/get': 'getUnconfirmedTransaction',
		'get /unconfirmed': 'getUnconfirmedTransactions',
		'put /': 'addTransactions'
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: 'API endpoint not found'});
	});

	library.network.app.use('/api/transactions', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error('API error ' + req.url, err.message);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
	});
};

__private.list = function (filter, cb) {
	var sortFields = sql.sortFields;
	var params = {}, where = [], owner = '';

	if (filter.blockId) {
		where.push('"t_blockId" = ${blockId}');
		params.blockId = filter.blockId;
	}

	if (filter.senderPublicKey) {
		where.push('"t_senderPublicKey"::bytea = ${senderPublicKey}');
		params.senderPublicKey = filter.senderPublicKey;
	}

	if (filter.senderId) {
		where.push('"t_senderId" = ${senderId}');
		params.senderId = filter.senderId;
	}

	if (filter.recipientId) {
		where.push('"t_recipientId" = ${recipientId}');
		params.recipientId = filter.recipientId;
	}

	if (filter.ownerAddress && filter.ownerPublicKey) {
		owner = '("t_senderPublicKey"::bytea = ${ownerPublicKey} OR "t_recipientId" = ${ownerAddress})';
		params.ownerPublicKey = filter.ownerPublicKey;
		params.ownerAddress = filter.ownerAddress;
	}

	if (filter.type >= 0) {
		where.push('"t_type" = ${type}');
		params.type = filter.type;
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

	if (params.limit > 100) {
		return setImmediate(cb, 'Invalid limit. Maximum is 100');
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
Transactions.prototype.transactionInPool = function (id) {
	return __private.transactionPool.transactionInPool(id);
};

Transactions.prototype.getUnconfirmedTransaction = function (id) {
	return __private.transactionPool.getUnconfirmedTransaction(id);
};

Transactions.prototype.getQueuedTransaction = function (id) {
	return __private.transactionPool.getQueuedTransaction(id);
};

Transactions.prototype.getMultisignatureTransaction = function (id) {
	return __private.transactionPool.getMultisignatureTransaction(id);
};

Transactions.prototype.getUnconfirmedTransactionList = function (reverse, limit) {
	return __private.transactionPool.getUnconfirmedTransactionList(reverse, limit);
};

Transactions.prototype.getQueuedTransactionList = function (reverse, limit) {
	return __private.transactionPool.getQueuedTransactionList(reverse, limit);
};

Transactions.prototype.getMultisignatureTransactionList = function (reverse, limit) {
	return __private.transactionPool.getMultisignatureTransactionList(reverse, limit);
};

Transactions.prototype.getMergedTransactionList = function (reverse, limit) {
	return __private.transactionPool.getMergedTransactionList(reverse, limit);
};

Transactions.prototype.removeUnconfirmedTransaction = function (id) {
	return __private.transactionPool.removeUnconfirmedTransaction(id);
};

Transactions.prototype.processUnconfirmedTransaction = function (transaction, broadcast, cb) {
	return __private.transactionPool.processUnconfirmedTransaction(transaction, broadcast, cb);
};

Transactions.prototype.applyUnconfirmedList = function (cb) {
	return __private.transactionPool.applyUnconfirmedList(cb);
};

Transactions.prototype.applyUnconfirmedIds = function (ids, cb) {
	return __private.transactionPool.applyUnconfirmedIds(ids, cb);
};

Transactions.prototype.undoUnconfirmedList = function (cb) {
	return __private.transactionPool.undoUnconfirmedList(cb);
};

Transactions.prototype.apply = function (transaction, block, sender, cb) {
	library.logger.debug('Applying confirmed transaction', transaction.id);
	library.logic.transaction.apply(transaction, block, sender, cb);
};

Transactions.prototype.undo = function (transaction, block, sender, cb) {
	library.logger.debug('Undoing confirmed transaction', transaction.id);
	library.logic.transaction.undo(transaction, block, sender, cb);
};

Transactions.prototype.applyUnconfirmed = function (transaction, sender, cb) {
	library.logger.debug('Applying unconfirmed transaction', transaction.id);

	if (!sender && transaction.blockId !== genesisblock.block.id) {
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

Transactions.prototype.undoUnconfirmed = function (transaction, cb) {
	library.logger.debug('Undoing unconfirmed transaction', transaction.id);

	modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
		if (err) {
			return setImmediate(cb, err);
		}
		library.logic.transaction.undoUnconfirmed(transaction, sender, cb);
	});
};

Transactions.prototype.receiveTransactions = function (transactions, broadcast, cb) {
	return __private.transactionPool.receiveTransactions(transactions, broadcast, cb);
};

Transactions.prototype.fillPool = function (cb) {
	return __private.transactionPool.fillPool(cb);
};

Transactions.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Transactions.prototype.onBind = function (scope) {
	modules = scope;

	__private.transactionPool.bind(modules);
	__private.assetTypes[transactionTypes.SEND].bind({
		modules: modules, library: library
	});
};

Transactions.prototype.onPeersReady = function () {
};

// Shared
shared.getTransactions = function (req, cb) {
	library.schema.validate(req.body, schema.getTransactions, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		__private.list(req.body, function (err, data) {
			if (err) {
				return setImmediate(cb, 'Failed to get transactions: ' + err);
			}

			return setImmediate(cb, null, {transactions: data.transactions, count: data.count});
		});
	});
};

shared.getTransaction = function (req, cb) {
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
};

shared.getTransactionsCount = function (req, cb) {
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
};

shared.getQueuedTransaction = function (req, cb) {
	return __private.getPooledTransaction('getQueuedTransaction', req, cb);
};

shared.getQueuedTransactions = function (req, cb) {
	return __private.getPooledTransactions('getQueuedTransactionList', req, cb);
};

shared.getMultisignatureTransaction = function (req, cb) {
	return __private.getPooledTransaction('getMultisignatureTransaction', req, cb);
};

shared.getMultisignatureTransactions = function (req, cb) {
	return __private.getPooledTransactions('getMultisignatureTransactionList', req, cb);
};

shared.getUnconfirmedTransaction = function (req, cb) {
	return __private.getPooledTransaction('getUnconfirmedTransaction', req, cb);
};

shared.getUnconfirmedTransactions = function (req, cb) {
	return __private.getPooledTransactions('getUnconfirmedTransactionList', req, cb);
};

shared.addTransactions = function (req, cb) {
	library.schema.validate(req.body, schema.addTransactions, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var hash = crypto.createHash('sha256').update(req.body.secret, 'utf8').digest();
		var keypair = library.ed.makeKeypair(hash);

		if (req.body.publicKey) {
			if (keypair.publicKey.toString('hex') !== req.body.publicKey) {
				return setImmediate(cb, 'Invalid passphrase');
			}
		}

		var query = { address: req.body.recipientId };

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
};

// Export
module.exports = Transactions;
