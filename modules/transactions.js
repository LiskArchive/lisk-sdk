var ed = require("ed25519");
var util = require("util");
var ByteBuffer = require("bytebuffer");
var crypto = require("crypto");
var genesisblock = null;
var constants = require("../helpers/constants.js");
var slots = require("../helpers/slots.js");
var extend = require("extend");
var Router = require("../helpers/router.js");
var async = require("async");
var TransactionTypes = require("../helpers/transaction-types.js");
var sandboxHelper = require("../helpers/sandbox.js");

// Private fields
var modules, library, self, private = {}, shared = {};

private.hiddenTransactions = [];
private.unconfirmedTransactions = [];
private.unconfirmedTransactionsIdIndex = {};
private.doubleSpendingTransactions = {};

function Transfer() {
	this.create = function (data, trs) {
		trs.recipientId = data.recipientId;
		trs.amount = data.amount;

		return trs;
	}

	this.calculateFee = function (trs, sender) {
		return library.logic.block.calculateFee();
	}

	this.verify = function (trs, sender, cb) {
		var isAddress = /^[0-9]+[L|l]$/g;
		if (!trs.recipientId || !isAddress.test(trs.recipientId)) {
			return cb("Invalid recipient");
		}

		if (trs.amount <= 0) {
			return cb("Invalid transaction amount");
		}

		cb(null, trs);
	}

	this.process = function (trs, sender, cb) {
		setImmediate(cb, null, trs);
	}

	this.getBytes = function (trs) {
		return null;
	}

	this.apply = function (trs, block, sender, cb) {
		modules.accounts.setAccountAndGet({address: trs.recipientId}, function (err, recipient) {
			if (err) {
				return cb(err);
			}

			modules.accounts.mergeAccountAndGet({
				address: trs.recipientId,
				balance: trs.amount,
				u_balance: trs.amount,
				blockId: block.id,
				round: modules.round.calc(block.height)
			}, function (err) {
				cb(err);
			});
		});
	}

	this.undo = function (trs, block, sender, cb) {
		modules.accounts.setAccountAndGet({address: trs.recipientId}, function (err, recipient) {
			if (err) {
				return cb(err);
			}

			modules.accounts.mergeAccountAndGet({
				address: trs.recipientId,
				balance: -trs.amount,
				u_balance: -trs.amount,
				blockId: block.id,
				round: modules.round.calc(block.height)
			}, function (err) {
				cb(err);
			});
		});
	}

	this.applyUnconfirmed = function (trs, sender, cb) {
		setImmediate(cb);
	}

	this.undoUnconfirmed = function (trs, sender, cb) {
		setImmediate(cb);
	}

	this.objectNormalize = function (trs) {
		delete trs.blockId;
		return trs;
	}

	this.dbRead = function (raw) {
		return null;
	}

	this.dbSave = function (trs) {
		return null;
	}

	this.ready = function (trs, sender) {
		if (util.isArray(sender.multisignatures) && sender.multisignatures.length) {
			if (!trs.signatures) {
				return false;
			}

			return trs.signatures.length >= sender.multimin - 1;
		} else {
			return true;
		}
	}
}

// Constructor
function Transactions(cb, scope) {
	library = scope;
	genesisblock = library.genesisblock;
	self = this;
	self.__private = private;
	private.attachApi();

	library.logic.transaction.attachAssetType(TransactionTypes.SEND, new Transfer());

	setImmediate(cb, null, self);
}

// Private methods
private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) return next();
		res.status(500).send({success: false, error: "Blockchain is loading"});
	});

	router.map(shared, {
		"get /": "getTransactions",
		"get /get": "getTransaction",
		"get /unconfirmed/get": "getUnconfirmedTransaction",
		"get /unconfirmed": "getUnconfirmedTransactions",
		"put /": "addTransactions"
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: "API endpoint not found"});
	});

	library.network.app.use('/api/transactions', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err.toString()});
	});
}

private.list = function (filter, cb) {
	var sortFields = ['t_id', 'b_blockId', 't_amount', 't_fee', 't_type', 't_timestamp', 't_senderPublicKey', 't_senderId', 't_recipientId', 'b_confirmations', 'b_height'];
	var params = {}, fields_or = [], owner = "";

	if (filter.blockId) {
		fields_or.push("\"blockId\" = ${blockId}");
		params.blockId = filter.blockId;
	}

	if (filter.senderPublicKey) {
		fields_or.push("ENCODE(\"senderPublicKey\", 'hex') = ${senderPublicKey}")
		params.senderPublicKey = filter.senderPublicKey;
	}

	if (filter.senderId) {
		fields_or.push("\"senderId\" = ${senderId}");
		params.senderId = filter.senderId;
	}

	if (filter.recipientId) {
		fields_or.push("\"recipientId\" = ${recipientId}");
		params.recipientId = filter.recipientId;
	}

	if (filter.ownerAddress && filter.ownerPublicKey) {
		owner = "(ENCODE(\"senderPublicKey\", 'hex') = ${ownerPublicKey} OR \"recipientId\" = ${ownerAddress})";
		params.ownerPublicKey = filter.ownerPublicKey;
		params.ownerAddress = filter.ownerAddress;
	}

	if (filter.type >= 0) {
		fields_or.push("\"type\" = ${type}");
		params.type = filter.type;
	}

	if (filter.limit >= 0) {
		params.limit = filter.limit;
	}

	if (filter.offset >= 0) {
		params.offset = filter.offset;
	}

	if (filter.orderBy) {
		var sort = filter.orderBy.split(':');
		var sortBy = sort[0].replace(/[^\w_]/gi, '');

		if (sort.length == 2) {
			var sortMethod = sort[1] == 'desc' ? 'DESC' : 'ASC'
		} else {
			sortMethod = 'DESC';
		}
	}

	if (sortBy) {
		if (sortFields.indexOf(sortBy) < 0) {
			return cb("Invalid sort field");
		} else {
			sortBy = '"' + sortBy + '"';
		}
	}

	if (filter.limit > 100) {
		return cb("Invalid limit. Maximum is 100");
	}

	library.db.query("SELECT COUNT(t.\"id\") " +
		"FROM trs t " +
		"INNER JOIN blocks b ON t.\"blockId\" = b.\"id\" " +
		(fields_or.length || owner ? "WHERE " : "") + " " +
		(fields_or.length ? "(" + fields_or.join(' OR ') + ") " : "") + (fields_or.length && owner ? " AND " + owner : owner), params).then(function (rows) {
		var count = rows.length ? rows[0].count : 0;

		// Need to fix 'or' or 'and' in query
		library.db.query("SELECT t.\"id\" AS \"t_id\", b.\"height\" AS \"b_height\", t.\"blockId\" AS \"t_blockId\", t.\"type\" AS \"t_type\", t.\"timestamp\" AS \"t_timestamp\", ENCODE(t.\"senderPublicKey\", 'hex') AS \"t_senderPublicKey\", t.\"senderId\" AS \"t_senderId\", t.\"recipientId\" AS \"t_recipientId\", t.\"amount\" AS \"t_amount\", t.\"fee\" AS \"t_fee\", ENCODE(t.\"signature\", 'hex') AS \"t_signature\", ENCODE(t.\"signSignature\", 'hex') AS \"t_SignSignature\", t.\"signatures\" AS \"t_signatures\", (SELECT MAX(\"height\") + 1 FROM blocks) - b.\"height\" AS \"confirmations\" " +
			"FROM trs t " +
			"INNER JOIN blocks b ON t.\"blockId\" = b.\"id\" " +
			(fields_or.length || owner ? "WHERE " : "") + " " +
			(fields_or.length ? "(" + fields_or.join(' or ') + ") " : "") + (fields_or.length && owner ? " AND " + owner : owner) + " " +
			(filter.orderBy ? "ORDER BY " + sortBy + " " + sortMethod : "") + " " +
			(filter.limit ? "LIMIT ${limit}" : "") + " " +
			(filter.offset ? "OFFSET ${offset}" : ""), params).then(function (rows) {

			var transactions = [];
			for (var i = 0; i < rows.length; i++) {
				transactions.push(library.logic.transaction.dbRead(rows[i]));
			}
			var data = {
				transactions: transactions,
				count: count
			}
			cb(null, data);
		}).catch(function (err) {
			library.logger.error(err.toString());
			return cb("Transactions#list error");
		});
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Transactions#list error");
	});
}

private.getById = function (id, cb) {
	library.db.query("SELECT t.\"id\" AS \"t_id\", b.\"height\" AS \"b_height\", t.\"blockId\" AS \"t_blockId\", t.\"type\" AS \"t_type\", t.\"timestamp\" AS \"t_timestamp\", ENCODE(t.\"senderPublicKey\", 'hex') AS \"t_senderPublicKey\", t.\"senderId\" AS \"t_senderId\", t.\"recipientId\" AS \"t_recipientId\", t.\"amount\" AS \"t_amount\", t.\"fee\" AS \"t_fee\", ENCODE(t.\"signature\", 'hex') AS \"t_signature\", ENCODE(t.\"signSignature\", 'hex') AS \"t_SignSignature\", t.\"signatures\" AS \"t_signatures\", (SELECT MAX(\"height\") + 1 FROM blocks) - b.\"height\" AS \"confirmations\" " +
		"FROM trs t " +
		"INNER JOIN blocks b ON t.\"blockId\" = b.\"id\" " +
		"WHERE t.\"id\" = ${id}", { id: id }).then(function (rows) {
		if (!rows.length) {
			return cb("Can't find transaction: " + id);
		}

		var transacton = library.logic.transaction.dbRead(rows[0]);
		cb(null, transacton);
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Transactions#getById error");
	});
}

private.addUnconfirmedTransaction = function (transaction, sender, cb) {
	self.applyUnconfirmed(transaction, sender, function (err) {
		if (err) {
			self.addDoubleSpending(transaction);
			return setImmediate(cb, err);
		}

		private.unconfirmedTransactions.push(transaction);
		var index = private.unconfirmedTransactions.length - 1;
		private.unconfirmedTransactionsIdIndex[transaction.id] = index;

		setImmediate(cb);
	});
}

// Public methods
Transactions.prototype.getUnconfirmedTransaction = function (id) {
	var index = private.unconfirmedTransactionsIdIndex[id];
	return private.unconfirmedTransactions[index];
}

Transactions.prototype.addDoubleSpending = function (transaction) {
	private.doubleSpendingTransactions[transaction.id] = transaction;
}

Transactions.prototype.pushHiddenTransaction = function (transaction) {
	private.hiddenTransactions.push(transaction);
}

Transactions.prototype.shiftHiddenTransaction = function () {
	return private.hiddenTransactions.shift();
}

Transactions.prototype.deleteHiddenTransaction = function () {
	private.hiddenTransactions = [];
}

Transactions.prototype.getUnconfirmedTransactionList = function (reverse, limit) {
	var a = [];

	for (var i = 0; i < private.unconfirmedTransactions.length; i++) {
		if (private.unconfirmedTransactions[i] !== false) {
			a.push(private.unconfirmedTransactions[i]);
		}
	}

	a = reverse ? a.reverse() : a;

	if (limit) {
		a.splice(limit);
	}

	return a;
}

Transactions.prototype.removeUnconfirmedTransaction = function (id) {
	var index = private.unconfirmedTransactionsIdIndex[id];
	delete private.unconfirmedTransactionsIdIndex[id];
	private.unconfirmedTransactions[index] = false;
}

Transactions.prototype.processUnconfirmedTransaction = function (transaction, broadcast, cb) {
	// If no transaction we raise an error
	if (!transaction) {
		return cb("No transaction to process!");
	}

	// Check transaction indexes
	if (private.unconfirmedTransactionsIdIndex[transaction.id] !== undefined || private.doubleSpendingTransactions[transaction.id]) {
		library.logger.debug("Transaction " + transaction.id + " already exists, ignoring...")
		return cb();
	}

	modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, sender) {
		function done(err) {
			if (err) {
				return cb(err);
			}

			private.addUnconfirmedTransaction(transaction, sender, function (err) {
				if (err) {
					return cb(err);
				}

				library.bus.message('unconfirmedTransaction', transaction, broadcast);

				cb();
			});
		}

		if (err) {
			return done(err);
		}

		if (transaction.requesterPublicKey && sender && sender.multisignatures && sender.multisignatures.length) {
			modules.accounts.getAccount({publicKey: transaction.requesterPublicKey}, function (err, requester) {
				if (err) {
					return done(err);
				}

				if (!requester) {
					return cb("Invalid requester");
				}

				library.logic.transaction.process(transaction, sender, requester, function (err, transaction) {
					if (err) {
						return done(err);
					}

					library.logic.transaction.verify(transaction, sender, done);
				});
			});
		} else {
			library.logic.transaction.process(transaction, sender, function (err, transaction) {
				if (err) {
					return done(err);
				}

				library.logic.transaction.verify(transaction, sender, done);
			});
		}
	});
}

Transactions.prototype.applyUnconfirmedList = function (ids, cb) {
	async.eachSeries(ids, function (id, cb) {
		var transaction = self.getUnconfirmedTransaction(id);
		modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, sender) {
			if (err) {
				self.removeUnconfirmedTransaction(id);
				self.addDoubleSpending(transaction);
				return setImmediate(cb);
			}
			self.applyUnconfirmed(transaction, sender, function (err) {
				if (err) {
					self.removeUnconfirmedTransaction(id);
					self.addDoubleSpending(transaction);
				}
				setImmediate(cb);
			});
		});
	}, cb);
}

Transactions.prototype.undoUnconfirmedList = function (cb) {
	var ids = [];
	async.eachSeries(private.unconfirmedTransactions, function (transaction, cb) {
		if (transaction !== false) {
			ids.push(transaction.id);
			self.undoUnconfirmed(transaction, cb);
		} else {
			setImmediate(cb);
		}
	}, function (err) {
		cb(err, ids);
	})
}

Transactions.prototype.apply = function (transaction, block, sender, cb) {
	library.logic.transaction.apply(transaction, block, sender, cb);
}

Transactions.prototype.undo = function (transaction, block, sender, cb) {
	library.logic.transaction.undo(transaction, block, sender, cb);
}

Transactions.prototype.applyUnconfirmed = function (transaction, sender, cb) {
	if (!sender && transaction.blockId != genesisblock.block.id) {
		return cb("Invalid block id");
	} else {
		if (transaction.requesterPublicKey) {
			modules.accounts.getAccount({publicKey: transaction.requesterPublicKey}, function (err, requester) {
				if (err) {
					return cb(err);
				}

				if (!requester) {
					return cb("Invalid requester");
				}

				library.logic.transaction.applyUnconfirmed(transaction, sender, requester, cb);
			});
		} else {
			library.logic.transaction.applyUnconfirmed(transaction, sender, cb);
		}
	}
}

Transactions.prototype.undoUnconfirmed = function (transaction, cb) {
	modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
		if (err) {
			return cb(err);
		}
		library.logic.transaction.undoUnconfirmed(transaction, sender, cb);
	});
}

Transactions.prototype.receiveTransactions = function (transactions, cb) {
	async.eachSeries(transactions, function (transaction, cb) {
		self.processUnconfirmedTransaction(transaction, true, cb);
	}, function (err) {
		cb(err, transactions);
	});
}

Transactions.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Transactions.prototype.onBind = function (scope) {
	modules = scope;
}

// Shared
shared.getTransactions = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			blockId: {
				type: "string"
			},
			limit: {
				type: "integer",
				minimum: 0,
				maximum: 100
			},
			type: {
				type: "integer",
				minimum: 0,
				maximum: 10
			},
			orderBy: {
				type: "string"
			},
			offset: {
				type: "integer",
				minimum: 0
			},
			senderPublicKey: {
				type: "string",
				format: "publicKey"
			},
			ownerPublicKey: {
				type: "string",
				format: "publicKey"
			},
			ownerAddress: {
				type: "string"
			},
			senderId: {
				type: "string"
			},
			recipientId: {
				type: "string"
			},
			amount: {
				type: "integer",
				minimum: 0,
				maximum: constants.fixedPoint
			},
			fee: {
				type: "integer",
				minimum: 0,
				maximum: constants.fixedPoint
			}
		}
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		private.list(query, function (err, data) {
			if (err) {
				return cb("Failed to get transactions");
			}

			cb(null, {transactions: data.transactions, count: data.count});
		});
	});
}

shared.getTransaction = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		private.getById(query.id, function (err, transaction) {
			if (!transaction || err) {
				return cb("Transaction not found");
			}
			cb(null, {transaction: transaction});
		});
	});
}

shared.getUnconfirmedTransaction = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['id']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var unconfirmedTransaction = self.getUnconfirmedTransaction(query.id);

		if (!unconfirmedTransaction) {
			return cb("Transaction not found");
		}

		cb(null, {transaction: unconfirmedTransaction});
	});
}

shared.getUnconfirmedTransactions = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			senderPublicKey: {
				type: "string",
				format: "publicKey"
			},
			address: {
				type: "string"
			}
		}
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var transactions = self.getUnconfirmedTransactionList(true),
			toSend = [];

		if (query.senderPublicKey || query.address) {
			for (var i = 0; i < transactions.length; i++) {
				if (transactions[i].senderPublicKey == query.senderPublicKey || transactions[i].recipientId == query.address) {
					toSend.push(transactions[i]);
				}
			}
		} else {
			for (var i = 0; i < transactions.length; i++) {
				toSend.push(transactions[i]);
			}
		}

		cb(null, {transactions: toSend});
	});
}

shared.addTransactions = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: "object",
		properties: {
			secret: {
				type: "string",
				minLength: 1,
				maxLength: 100
			},
			amount: {
				type: "integer",
				minimum: 1,
				maximum: constants.totalAmount
			},
			recipientId: {
				type: "string",
				minLength: 1
			},
			publicKey: {
				type: "string",
				format: "publicKey"
			},
			secondSecret: {
				type: "string",
				minLength: 1,
				maxLength: 100
			},
			multisigAccountPublicKey: {
				type: "string",
				format: "publicKey"
			}
		},
		required: ["secret", "amount", "recipientId"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);

		if (body.publicKey) {
			if (keypair.publicKey.toString('hex') != body.publicKey) {
				return cb("Invalid passphrase");
			}
		}

		var query = { address: body.recipientId };

		library.balancesSequence.add(function (cb) {
			modules.accounts.getAccount(query, function (err, recipient) {
				if (err) {
					return cb(err);
				}
				var recipientId = recipient ? recipient.address : body.recipientId;
				if (!recipientId) {
					return cb("Recipient not found");
				}

				if (body.multisigAccountPublicKey && body.multisigAccountPublicKey != keypair.publicKey.toString('hex')) {
					modules.accounts.getAccount({publicKey: body.multisigAccountPublicKey}, function (err, account) {
						if (err) {
							return cb(err);
						}

						if (!account || !account.publicKey) {
							return cb("Multisignature account not found");
						}

						if (!account.multisignatures || !account.multisignatures) {
							return cb("Account does not have multisignatures enabled");
						}

						if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
							return cb("Account does not belong to multisignature group");
						}

						modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
							if (err) {
								return cb(err);
							}

							if (!requester || !requester.publicKey) {
								return cb("Invalid requester");
							}

							if (requester.secondSignature && !body.secondSecret) {
								return cb("Invalid second passphrase");
							}

							if (requester.publicKey == account.publicKey) {
								return cb("Invalid requester");
							}

							var secondKeypair = null;

							if (requester.secondSignature) {
								var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
								secondKeypair = ed.MakeKeypair(secondHash);
							}

							try {
								var transaction = library.logic.transaction.create({
									type: TransactionTypes.SEND,
									amount: body.amount,
									sender: account,
									recipientId: recipientId,
									keypair: keypair,
									requester: keypair,
									secondKeypair: secondKeypair
								});
							} catch (e) {
								return cb(e.toString());
							}
							modules.transactions.receiveTransactions([transaction], cb);
						});
					});
				} else {
					modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
						if (err) {
							return cb(err);
						}
						if (!account || !account.publicKey) {
							return cb("Account not found");
						}

						if (account.secondSignature && !body.secondSecret) {
							return cb("Invalid second passphrase");
						}

						var secondKeypair = null;

						if (account.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
							secondKeypair = ed.MakeKeypair(secondHash);
						}

						try {
							var transaction = library.logic.transaction.create({
								type: TransactionTypes.SEND,
								amount: body.amount,
								sender: account,
								recipientId: recipientId,
								keypair: keypair,
								secondKeypair: secondKeypair
							});
						} catch (e) {
							return cb(e.toString());
						}
						modules.transactions.receiveTransactions([transaction], cb);
					});
				}
			});
		}, function (err, transaction) {
			if (err) {
				return cb(err);
			}

			cb(null, {transactionId: transaction[0].id});
		});
	});
}

// Export
module.exports = Transactions;
