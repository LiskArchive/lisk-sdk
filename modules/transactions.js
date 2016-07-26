var ed = require("ed25519");
var util = require("util");
var ByteBuffer = require("bytebuffer");
var crypto = require("crypto");
var genesisblock = null;
var constants = require("../helpers/constants.js");
var slots = require("../helpers/slots.js");
var extend = require("extend");
var OrderBy = require("../helpers/orderBy.js");
var Router = require("../helpers/router.js");
var async = require("async");
var transactionTypes = require("../helpers/transactionTypes.js");
var sandboxHelper = require("../helpers/sandbox.js");
var sql = require("../sql/transactions.js");

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
		return constants.fees.send;
	}

	this.verify = function (trs, sender, cb) {
		var isAddress = /^[0-9]{1,21}[L|l]$/g
		if (!trs.recipientId || !isAddress.test(trs.recipientId)) {
			return cb("Invalid recipient");
		}

		if (trs.amount <= 0) {
			return cb("Invalid transaction amount");
		}

		return cb(null, trs);
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
				return cb(err);
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
				return cb(err);
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
		if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
			if (!Array.isArray(trs.signatures)) {
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

	library.logic.transaction.attachAssetType(transactionTypes.SEND, new Transfer());

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
	var sortFields = sql.sortFields;
	var params = {}, where = [], owner = '';

	if (filter.blockId) {
		where.push('"t_blockId" = ${blockId}');
		params.blockId = filter.blockId;
	}

	if (filter.senderPublicKey) {
		where.push('"t_senderPublicKey"::bytea = ${senderPublicKey}')
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
		return cb("Invalid limit. Maximum is 100");
	}

	var orderBy = OrderBy(
		filter.orderBy, {
			sortFields: sql.sortFields,
			fieldPrefix: function (sortField) {
				if (["height", "blockId", "confirmations"].indexOf(sortField) > -1) {
					return "b_" + sortField;
				} else {
					return "t_" + sortField;
				}
			}
		}
	);

	if (orderBy.error) {
		return cb(orderBy.error);
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

			return cb(null, data);
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
	library.db.query(sql.getById, { id: id }).then(function (rows) {
		if (!rows.length) {
			return cb("Can't find transaction: " + id);
		}

		var transacton = library.logic.transaction.dbRead(rows[0]);

		return cb(null, transacton);
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

				return cb();
			});
		}

		if (err) {
			return done(err);
		}

		if (transaction.requesterPublicKey && sender && Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
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
		return cb(err, ids);
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
		return cb(err, transactions);
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
				return cb("Failed to get transactions: " + err);
			}

			return cb(null, {transactions: data.transactions, count: data.count});
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
			return cb(null, {transaction: transaction});
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

		return cb(null, {transaction: unconfirmedTransaction});
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

		return cb(null, {transactions: toSend});
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
									type: transactionTypes.SEND,
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
								type: transactionTypes.SEND,
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

			return cb(null, {transactionId: transaction[0].id});
		});
	});
}

// Export
module.exports = Transactions;
