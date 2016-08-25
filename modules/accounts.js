'use strict';

var crypto = require('crypto');
var bignum = require('../helpers/bignum.js');
var ed = require('ed25519');
var slots = require('../helpers/slots.js');
var Router = require('../helpers/router.js');
var util = require('util');
var BlockReward = require('../logic/blockReward.js');
var constants = require('../helpers/constants.js');
var transactionTypes = require('../helpers/transactionTypes.js');
var util = require('util');
var extend = require('extend');
var sandboxHelper = require('../helpers/sandbox.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};
__private.blockReward = new BlockReward();

// Constructor
function Accounts (cb, scope) {
	library = scope;
	self = this;
	self.__private = __private;
	__private.attachApi();

	var Vote = require('../logic/vote.js');
	__private.assetTypes[transactionTypes.VOTE] = library.logic.transaction.attachAssetType(
		transactionTypes.VOTE, new Vote()
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
		'post /open': 'open',
		'get /getBalance': 'getBalance',
		'get /getPublicKey': 'getPublickey',
		'post /generatePublicKey': 'generatePublickey',
		'get /delegates': 'getDelegates',
		'get /delegates/fee': 'getDelegatesFee',
		'put /delegates': 'addDelegates',
		'get /': 'getAccount'
	});

	if (process.env.DEBUG && process.env.DEBUG.toUpperCase() === 'TRUE') {
		router.get('/getAllAccounts', function (req, res) {
			return res.json({success: true, accounts: __private.accounts});
		});
	}

	if (process.env.TOP && process.env.TOP.toUpperCase() === 'TRUE') {
		router.get('/top', function (req, res, next) {
			req.sanitize(req.query, {
				type: 'object',
				properties: {
					limit: {
						type: 'integer',
						minimum: 0,
						maximum: 100
					},
					offset: {
						type: 'integer',
						minimum: 0
					}
				}
			}, function (err, report, query) {
				if (err) { return next(err); }
				if (!report.isValid) { return res.json({success: false, error: report.issues}); }

				self.getAccounts({
					sort: {
						balance: -1
					},
					offset: query.offset,
					limit: (query.limit || 100)
				}, function (err, raw) {
					if (err) {
						return res.json({success: false, error: err});
					}

					var accounts = raw.map(function (account) {
						return {
							address: account.address,
							balance: account.balance,
							publicKey: account.publicKey
						};
					});

					res.json({success: true, accounts: accounts});
				});
			});
		});
	}

	router.get('/count', function (req, res) {
		return res.json({success: true, count: Object.keys(__private.accounts).length});
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: 'API endpoint was not found'});
	});

	library.network.app.use('/api/accounts', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
};

__private.openAccount = function (secret, cb) {
	var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
	var keypair = ed.MakeKeypair(hash);

	self.setAccountAndGet({ publicKey: keypair.publicKey.toString('hex') }, cb);
};

// Public methods
Accounts.prototype.generateAddressByPublicKey = function (publicKey) {
	var publicKeyHash = crypto.createHash('sha256').update(publicKey, 'hex').digest();
	var temp = new Buffer(8);

	for (var i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	var address = bignum.fromBuffer(temp).toString() + 'L';

	if (!address) {
		throw Error('Invalid public key: ' + publicKey);
	}

	return address;
};

Accounts.prototype.getAccount = function (filter, fields, cb) {
	if (filter.publicKey) {
		filter.address = self.generateAddressByPublicKey(filter.publicKey);
		delete filter.publicKey;
	}

	library.logic.account.get(filter, fields, cb);
};

Accounts.prototype.getAccounts = function (filter, fields, cb) {
	library.logic.account.getAll(filter, fields, cb);
};

Accounts.prototype.setAccountAndGet = function (data, cb) {
	var address = data.address || null;

	if (address === null) {
		if (data.publicKey) {
			address = self.generateAddressByPublicKey(data.publicKey);
		} else {
			return cb('Missing address or public key');
		}
	}

	if (!address) {
		throw cb('Invalid public key');
	}

	library.logic.account.set(address, data, function (err) {
		if (err) {
			return cb(err);
		}
		return library.logic.account.get({ address: address }, cb);
	});
};

Accounts.prototype.mergeAccountAndGet = function (data, cb) {
	var address = data.address || null;

	if (address === null) {
		if (data.publicKey) {
			address = self.generateAddressByPublicKey(data.publicKey);
		} else {
			return cb('Missing address or public key');
		}
	}

	if (!address) {
		throw cb('Invalid public key');
	}

	return library.logic.account.merge(address, data, cb);
};

Accounts.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Accounts.prototype.onBind = function (scope) {
	modules = scope;

	__private.assetTypes[transactionTypes.VOTE].bind({
		modules: modules, library: library
	});
};

// Shared
shared.open = function (req, cb) {
	var body = req.body;

	library.scheme.validate(body, {
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			}
		},
		required: ['secret']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		__private.openAccount(body.secret, function (err, account) {
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
};

shared.getBalance = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: 'object',
		properties: {
			address: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['address']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var isAddress = /^[0-9]{1,21}[L|l]$/g;
		if (!isAddress.test(query.address)) {
			return cb('Invalid address');
		}

		self.getAccount({ address: query.address }, function (err, account) {
			if (err) {
				return cb(err);
			}

			var balance = account ? account.balance : 0;
			var unconfirmedBalance = account ? account.u_balance : 0;

			cb(null, {balance: balance, unconfirmedBalance: unconfirmedBalance});
		});
	});
};

shared.getPublickey = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: 'object',
		properties: {
			address: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['address']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		self.getAccount({ address: query.address }, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (!account || !account.publicKey) {
				return cb('Account does not have a public key');
			}

			cb(null, {publicKey: account.publicKey});
		});
	});
};

shared.generatePublickey = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['secret']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		__private.openAccount(body.secret, function (err, account) {
			var publicKey = null;
			if (!err && account) {
				publicKey = account.publicKey;
			}
			cb(err, {
				publicKey: publicKey
			});
		});
	});
};

shared.getDelegates = function (req, cb) {
	var query = req.body;

	library.scheme.validate(query, {
		type: 'object',
		properties: {
			address: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['address']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		self.getAccount({ address: query.address }, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (!account) {
				return cb('Account not found');
			}

			if (account.delegates) {
				modules.delegates.getDelegates(query, function (err, result) {
					var delegates = result.delegates.filter(function (delegate) {
						return account.delegates.indexOf(delegate.publicKey) !== -1;
					});

					cb(null, {delegates: delegates});
				});
			} else {
				cb(null, {delegates: []});
			}
		});
	});
};

shared.getDelegatesFee = function (req, cb) {
	var query = req.body;
	cb(null, {fee: constants.fees.delegate});
};

shared.addDelegates = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: 'object',
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
			if (keypair.publicKey.toString('hex') !== body.publicKey) {
				return cb('Invalid passphrase');
			}
		}

		library.balancesSequence.add(function (cb) {
			if (body.multisigAccountPublicKey && body.multisigAccountPublicKey !== keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({ publicKey: body.multisigAccountPublicKey }, function (err, account) {
					if (err) {
						return cb(err);
					}

					if (!account || !account.publicKey) {
						return cb('Multisignature account not found');
					}

					if (!account.multisignatures || !account.multisignatures) {
						return cb('Account does not have multisignatures enabled');
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return cb('Account does not belong to multisignature group');
					}

					modules.accounts.getAccount({ publicKey: keypair.publicKey }, function (err, requester) {
						if (err) {
							return cb(err);
						}

						if (!requester || !requester.publicKey) {
							return cb('Invalid requester');
						}

						if (requester.secondSignature && !body.secondSecret) {
							return cb('Invalid second passphrase');
						}

						if (requester.publicKey === account.publicKey) {
							return cb('Invalid requester');
						}

						var secondKeypair = null;

						if (requester.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
							secondKeypair = ed.MakeKeypair(secondHash);
						}

						var transaction;

						try {
							transaction = library.logic.transaction.create({
								type: transactionTypes.VOTE,
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
				self.getAccount({ publicKey: keypair.publicKey.toString('hex') }, function (err, account) {
					if (err) {
						return cb(err);
					}

					if (!account || !account.publicKey) {
						return cb('Account not found');
					}

					if (account.secondSignature && !body.secondSecret) {
						return cb('Invalid second passphrase');
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
						secondKeypair = ed.MakeKeypair(secondHash);
					}

					var transaction;

					try {
						transaction = library.logic.transaction.create({
							type: transactionTypes.VOTE,
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
				return cb(err);
			}

			cb(null, {transaction: transaction[0]});
		});
	});
};

shared.getAccount = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: 'object',
		properties: {
			address: {
				type: 'string',
				minLength: 1
			}
		},
		required: ['address']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		self.getAccount({ address: query.address }, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (!account) {
				return cb('Account not found');
			}

			cb(null, {
				account: {
					address: account.address,
					unconfirmedBalance: account.u_balance,
					balance: account.balance,
					publicKey: account.publicKey,
					unconfirmedSignature: account.u_secondSignature,
					secondSignature: account.secondSignature,
					secondPublicKey: account.secondPublicKey,
					multisignatures: account.multisignatures || [],
					u_multisignatures: account.u_multisignatures || []
				}
			});
		});
	});
};

// Export
module.exports = Accounts;
