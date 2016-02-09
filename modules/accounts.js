var crypto = require('crypto'),
	bignum = require('../helpers/bignum.js'),
	ed = require('ed25519'),
	slots = require('../helpers/slots.js'),
	Router = require('../helpers/router.js'),
	util = require('util'),
	constants = require('../helpers/constants.js'),
	TransactionTypes = require('../helpers/transaction-types.js'),
	Diff = require('../helpers/diff.js'),
	errorCode = require('../helpers/errorCodes.js').error,
	extend = require('extend'),
	sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var modules, library, self, private = {}, shared = {};

function Vote() {
	this.create = function (data, trs) {
		trs.recipientId = data.sender.address;
		trs.recipientUsername = data.sender.username;
		trs.asset.votes = data.votes;

		return trs;
	}

	this.calculateFee = function (trs, sender) {
		return 1 * constants.fixedPoint;
	}

	this.verify = function (trs, sender, cb) {
		if (trs.recipientId != trs.senderId) {
			return setImmediate(cb, errorCode("VOTES.INCORRECT_RECIPIENT", trs));
		}

		if (!trs.asset.votes || !trs.asset.votes.length) {
			return setImmediate(cb, errorCode("VOTES.EMPTY_VOTES", trs));
		}

		if (trs.asset.votes && trs.asset.votes.length > 33) {
			return setImmediate(cb, errorCode("VOTES.MAXIMUM_DELEGATES_VOTE", trs));
		}

		modules.delegates.checkDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
			setImmediate(cb, err, trs);
		});
	}

	this.process = function (trs, sender, cb) {
		setImmediate(cb, null, trs);
	}

	this.getBytes = function (trs) {
		try {
			var buf = trs.asset.votes ? new Buffer(trs.asset.votes.join(''), 'utf8') : null;
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	}

	this.apply = function (trs, block, sender, cb) {
		this.scope.account.merge(sender.address, {
			delegates: trs.asset.votes,
			blockId: block.id,
			round: modules.round.calc(block.height)
		}, function (err) {
			cb(err);
		});
	}

	this.undo = function (trs, block, sender, cb) {
		if (trs.asset.votes === null) return cb();

		var votesInvert = Diff.reverse(trs.asset.votes);

		this.scope.account.merge(sender.address, {
			delegates: votesInvert,
			blockId: block.id,
			round: modules.round.calc(block.height)
		}, function (err) {
			cb(err);
		});
	}

	this.applyUnconfirmed = function (trs, sender, cb) {
		modules.delegates.checkUnconfirmedDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
			if (err) {
				return setImmediate(cb, err);
			}

			this.scope.account.merge(sender.address, {
				u_delegates: trs.asset.votes
			}, function (err) {
				cb(err);
			});
		}.bind(this));
	}

	this.undoUnconfirmed = function (trs, sender, cb) {
		if (trs.asset.votes === null) return cb();

		var votesInvert = Diff.reverse(trs.asset.votes);

		this.scope.account.merge(sender.address, {u_delegates: votesInvert}, function (err) {
			cb(err);
		});
	}

	this.objectNormalize = function (trs) {
		var report = library.scheme.validate(trs.asset, {
			type: "object",
			properties: {
				votes: {
					type: "array",
					minLength: 1,
					maxLength: 105,
					uniqueItems: true
				}
			},
			required: ['votes']
		});

		if (!report) {
			throw new Error("Incorrect votes in transactions: " + library.scheme.getLastError());
		}

		return trs;
	}

	this.dbRead = function (raw) {
		// console.log(raw.v_votes);

		if (!raw.v_votes) {
			return null
		} else {
			var votes = raw.v_votes.split(',');

			return {votes: votes};
		}
	}

	this.dbSave = function (trs, cb) {
		library.dbLite.query("INSERT INTO votes(votes, transactionId) VALUES($votes, $transactionId)", {
			votes: util.isArray(trs.asset.votes) ? trs.asset.votes.join(',') : null,
			transactionId: trs.id
		}, cb);
	}

	this.ready = function (trs, sender) {
		if (sender.multisignatures.length) {
			if (!trs.signatures) {
				return false;
			}
			return trs.signatures.length >= sender.multimin - 1;
		} else {
			return true;
		}
	}
}

function Username() {
	this.create = function (data, trs) {
		trs.recipientId = null;
		trs.amount = 0;
		trs.asset.username = {
			alias: data.username,
			publicKey: data.sender.publicKey
		};

		return trs;
	}

	this.calculateFee = function (trs, sender) {
		return 100 * constants.fixedPoint;
	}

	this.verify = function (trs, sender, cb) {
		if (trs.recipientId) {
			return setImmediate(cb, errorCode("USERNAMES.INCORRECT_RECIPIENT", trs));
		}

		if (trs.amount != 0) {
			return setImmediate(cb, errorCode("USERNAMES.INVALID_AMOUNT", trs));
		}

		if (!trs.asset.username.alias) {
			return setImmediate(cb, errorCode("USERNAMES.EMPTY_ASSET", trs));
		}

		var allowSymbols = /^[a-z0-9!@$&_.]+$/g;
		if (!allowSymbols.test(trs.asset.username.alias.toLowerCase())) {
			return setImmediate(cb, errorCode("USERNAMES.ALLOW_CHARS", trs));
		}

		var isAddress = /^[0-9]+[L|l]$/g;
		if (isAddress.test(trs.asset.username.alias.toLowerCase())) {
			return setImmediate(cb, errorCode("USERNAMES.USERNAME_LIKE_ADDRESS", trs));
		}

		if (trs.asset.username.alias.length == 0 || trs.asset.username.alias.length > 20) {
			return setImmediate(cb, errorCode("USERNAMES.INCORRECT_USERNAME_LENGTH", trs));
		}

		self.getAccount({
			$or: {
				username: trs.asset.username.alias,
				u_username: trs.asset.username.alias
			}
		}, function (err, account) {
			if (err) {
				return cb(err);
			}
			if (account && account.username == trs.asset.username.alias) {
				return cb(errorCode("DELEGATES.EXISTS_USERNAME", trs));
			}
			if (sender.username && sender.username != trs.asset.username.alias) {
				return cb(errorCode("DELEGATES.WRONG_USERNAME"));
			}
			if (sender.u_username && sender.u_username != trs.asset.username.alias) {
				return cb(errorCode("USERNAMES.ALREADY_HAVE_USERNAME", trs));
			}

			cb(null, trs);
		});
	}

	this.process = function (trs, sender, cb) {
		setImmediate(cb, null, trs);
	}

	this.getBytes = function (trs) {
		try {
			var buf = new Buffer(trs.asset.username.alias, 'utf8');
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	}

	this.apply = function (trs, block, sender, cb) {
		self.setAccountAndGet({
			address: sender.address,
			u_username: null,
			username: trs.asset.username.alias,
			nameexist: 1,
			u_nameexist: 0
		}, cb);
	}

	this.undo = function (trs, block, sender, cb) {
		self.setAccountAndGet({
			address: sender.address,
			username: null,
			u_username: trs.asset.username.alias,
			nameexist: 0,
			u_nameexist: 1
		}, cb);
	}

	this.applyUnconfirmed = function (trs, sender, cb) {
		if (sender.username || sender.u_username) {
			return setImmediate(cb, errorCode("USERNAMES.ALREADY_HAVE_USERNAME", trs));
		}

		var address = modules.accounts.generateAddressByPublicKey(trs.senderPublicKey);

		self.getAccount({
			$or: {
				u_username: trs.asset.username.alias,
				address: address
			}
		}, function (err, account) {
			if (err) {
				return cb(err);
			}
			if (account && account.u_username) {
				return cb(errorCode("USERNAMES.EXISTS_USERNAME", trs));
			}

			self.setAccountAndGet({address: sender.address, u_username: trs.asset.username.alias, u_nameexist: 1}, cb);
		});
	}

	this.undoUnconfirmed = function (trs, sender, cb) {
		self.setAccountAndGet({address: sender.address, u_username: null, u_nameexist: 0}, cb);
	}

	this.objectNormalize = function (trs) {
		var report = library.scheme.validate(trs.asset.username, {
			type: "object",
			properties: {
				alias: {
					type: "string",
					minLength: 1,
					maxLength: 20
				},
				publicKey: {
					type: 'string',
					format: 'publicKey'
				}
			},
			required: ['alias', 'publicKey']
		});

		if (!report) {
			throw Error(library.scheme.getLastError());
		}

		return trs;
	}

	this.dbRead = function (raw) {
		if (!raw.u_alias) {
			return null
		} else {
			var username = {
				alias: raw.u_alias,
				publicKey: raw.t_senderPublicKey
			}

			return {username: username};
		}
	}

	this.dbSave = function (trs, cb) {
		library.dbLite.query("INSERT INTO usernames(username, transactionId) VALUES($username, $transactionId)", {
			username: trs.asset.username.alias,
			transactionId: trs.id
		}, cb);
	}

	this.ready = function (trs, sender) {
		if (sender.multisignatures.length) {
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
function Accounts(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;
	private.attachApi();

	library.logic.transaction.attachAssetType(TransactionTypes.VOTE, new Vote());
	library.logic.transaction.attachAssetType(TransactionTypes.USERNAME, new Username());

	setImmediate(cb, null, self);
}

// Private methods
private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) return next();
		res.status(500).send({success: false, error: errorCode('COMMON.LOADING')});
	});

	router.map(shared, {
		"post /open": "open",
		"get /getBalance": "getBalance",
		"get /getPublicKey": "getPublickey",
		"post /generatePublicKey": "generatePublickey",
		"get /delegates": "getDelegates",
		"get /delegates/fee": "getDelegatesFee",
		"put /delegates": "addDelegates",
		"get /username/get": "getUsername",
		"get /username/fee": "getUsernameFee",
		"put /username": "addUsername",
		"get /": "getAccount"
	});

	if (process.env.DEBUG && process.env.DEBUG.toUpperCase() == "TRUE") {
		router.get('/getAllAccounts', function (req, res) {
			return res.json({success: true, accounts: private.accounts});
		});
	}

	if (process.env.TOP && process.env.TOP.toUpperCase() == "TRUE") {
		router.get('/top', function (req, res, next) {
			req.sanitize(req.query, {
				type: "object",
				properties: {
					limit: {
						type: "integer",
						minimum: 0,
						maximum: 100
					},
					offset: {
						type: "integer",
						minimum: 0
					}
				}
			}, function (err, report, query) {
				if (err) return next(err);
				if (!report.isValid) return res.json({success: false, error: report.issues});
				self.getAccounts({
					sort: {
						balance: -1
					},
					offset: query.offset,
					limit: query.limit
				}, function (err, raw) {
					if (err) {
						return res.json({success: false, error: err.toString()});
					}
					var accounts = raw.map(function (fullAccount) {
						return {
							address: fullAccount.address,
							username: fullAccount.username,
							balance: fullAccount.balance,
							publicKey: fullAccount.publicKey
						}
					});

					res.json({success: true, accounts: accounts});
				})
			})
		});
	}

	router.get('/count', function (req, res) {
		return res.json({success: true, count: Object.keys(private.accounts).length});
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: errorCode('COMMON.INVALID_API')});
	});

	library.network.app.use('/api/accounts', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error(req.url, err.toString());
		res.status(500).send({success: false, error: err.toString()});
	});
}

private.openAccount = function (secret, cb) {
	var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
	var keypair = ed.MakeKeypair(hash);

	self.setAccountAndGet({publicKey: keypair.publicKey.toString('hex')}, cb);
}

// Public methods
Accounts.prototype.generateAddressByPublicKey = function (publicKey) {
	var publicKeyHash = crypto.createHash('sha256').update(publicKey, 'hex').digest();
	var temp = new Buffer(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	var address = bignum.fromBuffer(temp).toString() + 'L';
	if (!address) {
		throw Error("wrong publicKey " + publicKey);
	}
	return address;
}

Accounts.prototype.getAccount = function (filter, fields, cb) {
	if (filter.publicKey) {
		filter.address = self.generateAddressByPublicKey(filter.publicKey);
		delete filter.publicKey;
	}

	library.logic.account.get(filter, fields, cb);
}

Accounts.prototype.getAccounts = function (filter, fields, cb) {
	library.logic.account.getAll(filter, fields, cb);
}

Accounts.prototype.setAccountAndGet = function (data, cb) {
	var address = data.address || null;
	if (address === null) {
		if (data.publicKey) {
			address = self.generateAddressByPublicKey(data.publicKey);
		} else {
			return cb("must provide address or publicKey");
		}
	}
	if (!address) {
		throw cb("wrong publicKey at setAccountAndGet " + publicKey);
	}
	library.logic.account.set(address, data, function (err) {
		if (err) {
			return cb(err);
		}
		library.logic.account.get({address: address}, cb);
	});
}

Accounts.prototype.mergeAccountAndGet = function (data, cb) {
	var address = data.address || null;
	if (address === null) {
		if (data.publicKey) {
			address = self.generateAddressByPublicKey(data.publicKey);
		} else {
			return cb("must provide address or publicKey");
		}
	}
	if (!address) {
		throw cb("wrong publicKey at mergeAccountAndGet " + publicKey);
	}
	library.logic.account.merge(address, data, cb);
}

Accounts.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Accounts.prototype.onBind = function (scope) {
	modules = scope;
}

// Shared
shared.open = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: "object",
		properties: {
			secret: {
				type: "string",
				minLength: 1,
				maxLength: 100
			}
		},
		required: ["secret"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		private.openAccount(body.secret, function (err, account) {
			var accountData = null;
			if (!err) {
				accountData = {
					address: account.address,
					unconfirmedBalance: account.u_balance,
					balance: account.balance,
					publicKey: account.publicKey,
					unconfirmedSignature: account.u_secondSignature,
					secondSignature: account.secondSignature,
					secondPublicKey: account.secondPublicKey,
					multisignatures: account.multisignatures,
					u_multisignatures: account.u_multisignatures
				};

				return cb(null, {account: accountData});
			} else {
				return cb(err);
			}
		});
	});
}

shared.getBalance = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			address: {
				type: "string",
				minLength: 1
			}
		},
		required: ["address"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var isAddress = /^[0-9]+[L|l]$/g;
		if (!isAddress.test(query.address)) {
			return cb(errorCode("ACCOUNTS.INVALID_ADDRESS", {address: query.address}));
		}

		self.getAccount({address: query.address}, function (err, account) {
			if (err) {
				return cb(err.toString());
			}
			var balance = account ? account.balance : 0;
			var unconfirmedBalance = account ? account.u_balance : 0;

			cb(null, {balance: balance, unconfirmedBalance: unconfirmedBalance});
		});
	});
}

shared.getPublickey = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			address: {
				type: "string",
				minLength: 1
			}
		},
		required: ["address"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		self.getAccount({address: query.address}, function (err, account) {
			if (err) {
				return cb(err.toString());
			}
			if (!account || !account.publicKey) {
				return cb(errorCode("ACCOUNTS.ACCOUNT_PUBLIC_KEY_NOT_FOUND", {address: query.address}))
			}
			cb(null, {publicKey: account.publicKey});
		});
	});
}

shared.generatePublickey = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: "object",
		properties: {
			secret: {
				type: "string",
				minLength: 1
			}
		},
		required: ["secret"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		private.openAccount(body.secret, function (err, account) {
			var publicKey = null;
			if (!err && account) {
				publicKey = account.publicKey;
			}
			cb(err, {
				publicKey: publicKey
			});
		});
	});
}

shared.getDelegates = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			address: {
				type: "string",
				minLength: 1
			}
		},
		required: ["address"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		self.getAccount({address: query.address}, function (err, account) {
			if (err) {
				return cb(err.toString());
			}
			if (!account) {
				return cb(errorCode("ACCOUNTS.ACCOUNT_DOESNT_FOUND", {address: query.address}));
			}

			if (account.delegates) {
				self.getAccounts({
					isDelegate: 1,
					sort: {"vote": -1, "publicKey": 1}
				}, ["username", "address", "publicKey", "vote", "missedblocks", "producedblocks", "virgin"], function (err, delegates) {
					if (err) {
						return cb(err.toString());
					}

					var limit = query.limit || 101,
						offset = query.offset || 0,
						orderField = query.orderBy,
						active = query.active;

					orderField = orderField ? orderField.split(':') : null;
					limit = limit > 101 ? 101 : limit;
					var orderBy = orderField ? orderField[0] : null;
					var sortMode = orderField && orderField.length == 2 ? orderField[1] : 'asc';
					var count = delegates.length;
					var length = Math.min(limit, count);
					var realLimit = Math.min(offset + limit, count);

					for (var i = 0; i < delegates.length; i++) {
						delegates[i].rate = i + 1;

						var percent = 100 - (delegates[i].missedblocks / ((delegates[i].producedblocks + delegates[i].missedblocks) / 100));
						percent = percent || 0;
						var outsider = i + 1 > slots.delegates && delegates[i].virgin;
						delegates[i].productivity = !outsider ? delegates[i].virgin ? 0 : parseFloat(Math.floor(percent * 100) / 100).toFixed(2) : null
					}

					var result = delegates.filter(function (delegate) {
						return account.delegates.indexOf(delegate.publicKey) != -1;
					});

					cb(null, {delegates: result});
				});
			} else {
				cb(null, {delegates: []});
			}
		});
	});
}

shared.getDelegatesFee = function (req, cb) {
	var query = req.body;
	cb(null, {fee: 1 * constants.fixedPoint});
}

shared.addDelegates = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: "object",
		properties: {
			secret: {
				type: 'string',
				minLength: 1
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			secondSecret: {
				type: 'string',
				minLength: 1
			}
		}
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);

		if (body.publicKey) {
			if (keypair.publicKey.toString('hex') != body.publicKey) {
				return cb(errorCode("COMMON.INVALID_SECRET_KEY"));
			}
		}

		library.balancesSequence.add(function (cb) {
			if (body.multisigAccountPublicKey && body.multisigAccountPublicKey != keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({publicKey: body.multisigAccountPublicKey}, function (err, account) {
					if (err) {
						return cb(err.toString());
					}

					if (!account || !account.publicKey) {
						return cb("Multisignature account not found");
					}

					if (!account.multisignatures || !account.multisignatures) {
						return cb("This account don't have multisignature");
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return cb("This account don't added to multisignature");
					}

					modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
						if (err) {
							return cb(err.toString());
						}

						if (!requester || !requester.publicKey) {
							return cb(errorCode("COMMON.OPEN_ACCOUNT"));
						}

						if (requester.secondSignature && !body.secondSecret) {
							return cb(errorCode("COMMON.SECOND_SECRET_KEY"));
						}

						if (requester.publicKey == account.publicKey) {
							return cb("Incorrect requester");
						}

						var secondKeypair = null;

						if (requester.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
							secondKeypair = ed.MakeKeypair(secondHash);
						}

						try {
							var transaction = library.logic.transaction.create({
								type: TransactionTypes.VOTE,
								votes: body.delegates,
								sender: account,
								keypair: keypair,
								secondKeypair: secondKeypair,
								requester: keypair
							});
						} catch (e) {
							return cb(e.toString());
						}
						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			} else {
				self.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
					if (err) {
						return cb(err.toString());
					}
					if (!account || !account.publicKey) {
						return cb(errorCode("COMMON.OPEN_ACCOUNT"));
					}

					if (account.secondSignature && !body.secondSecret) {
						return cb(errorCode("COMMON.SECOND_SECRET_KEY"));
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
						secondKeypair = ed.MakeKeypair(secondHash);
					}

					try {
						var transaction = library.logic.transaction.create({
							type: TransactionTypes.VOTE,
							votes: body.delegates,
							sender: account,
							keypair: keypair,
							secondKeypair: secondKeypair
						});
					} catch (e) {
						return cb(e.toString());
					}
					modules.transactions.receiveTransactions([transaction], cb);
				});
			}
		}, function (err, transaction) {
			if (err) {
				return cb(err.toString());
			}

			cb(null, {transaction: transaction[0]});
		});
	});
}

shared.getUsernameFee = function (req, cb) {
	var query = req.body;
	cb(null, {fee: 1 * constants.fixedPoint});
}

shared.addUsername = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: "object",
		properties: {
			secret: {
				type: "string",
				minLength: 1
			},
			publicKey: {
				type: "string",
				format: "publicKey"
			},
			secondSecret: {
				type: "string",
				minLength: 1
			},
			username: {
				type: "string",
				minLength: 1
			}
		},
		required: ['secret', 'username']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);

		if (body.publicKey) {
			if (keypair.publicKey.toString('hex') != body.publicKey) {
				return cb(errorCode("COMMON.INVALID_SECRET_KEY"));
			}
		}

		library.balancesSequence.add(function (cb) {
			if (body.multisigAccountPublicKey && body.multisigAccountPublicKey != keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({publicKey: body.multisigAccountPublicKey}, function (err, account) {
					if (err) {
						return cb(err.toString());
					}

					if (!account || !account.publicKey) {
						return cb("Multisignature account not found");
					}

					if (!account.multisignatures || !account.multisignatures) {
						return cb("This account don't have multisignature");
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return cb("This account don't added to multisignature");
					}

					modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
						if (err) {
							return cb(err.toString());
						}

						if (!requester || !requester.publicKey) {
							return cb(errorCode("COMMON.OPEN_ACCOUNT"));
						}

						if (requester.secondSignature && !body.secondSecret) {
							return cb(errorCode("COMMON.SECOND_SECRET_KEY"));
						}

						if (requester.publicKey == account.publicKey) {
							return cb("Incorrect requester");
						}

						var secondKeypair = null;

						if (requester.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
							secondKeypair = ed.MakeKeypair(secondHash);
						}

						try {
							var transaction = library.logic.transaction.create({
								type: TransactionTypes.USERNAME,
								username: body.username,
								sender: account,
								keypair: keypair,
								secondKeypair: secondKeypair,
								requester: keypair
							});
						} catch (e) {
							return cb(e.toString());
						}
						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			} else {
				self.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
					if (err) {
						return cb(err.toString());
					}
					if (!account || !account.publicKey) {
						return cb(errorCode("COMMON.OPEN_ACCOUNT"));
					}

					if (account.secondSignature && !body.secondSecret) {
						return cb(errorCode("COMMON.SECOND_SECRET_KEY"));
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
						secondKeypair = ed.MakeKeypair(secondHash);
					}

					try {
						var transaction = library.logic.transaction.create({
							type: TransactionTypes.USERNAME,
							username: body.username,
							sender: account,
							keypair: keypair,
							secondKeypair: secondKeypair
						});
					} catch (e) {
						return cb(e.toString());
					}
					modules.transactions.receiveTransactions([transaction], cb);
				});
			}

		}, function (err, transaction) {
			if (err) {
				return cb(err.toString());
			}

			cb(null, {transaction: transaction[0]});
		});
	});
}

shared.getAccount = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			address: {
				type: "string",
				minLength: 1
			}
		},
		required: ["address"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		self.getAccount({address: query.address}, function (err, account) {
			if (err) {
				return cb(err.toString());
			}
			if (!account) {
				return cb(errorCode("ACCOUNTS.ACCOUNT_DOESNT_FOUND"));
			}

			cb(null, {
				account: {
					address: account.address,
					username: account.username,
					unconfirmedBalance: account.u_balance,
					balance: account.balance,
					publicKey: account.publicKey,
					unconfirmedSignature: account.u_secondSignature,
					secondSignature: account.secondSignature,
					secondPublicKey: account.secondPublicKey,
					multisignatures: account.multisignatures,
					u_multisignatures: account.u_multisignatures
				}
			});
		});
	});
}

shared.getUsername = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			username: {
				type: "string",
				minLength: 1
			}
		}
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		self.getAccount({
			username: {$like: query.username.toLowerCase()}
		}, function (err, account) {
			if (err || !account) {
				return cb(errorCode("ACCOUNTS.ACCOUNT_DOESNT_FOUND", account));
			}

			cb(null, {
				account: {
					address: account.address,
					username: account.username,
					unconfirmedBalance: account.u_balance,
					balance: account.balance,
					publicKey: account.publicKey,
					unconfirmedSignature: account.u_secondSignature,
					secondSignature: account.secondSignature,
					secondPublicKey: account.secondPublicKey
				}
			});
		});
	});
}

// Export
module.exports = Accounts;
