'use strict';

var bignum = require('../helpers/bignum.js');
var BlockReward = require('../logic/blockReward.js');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var extend = require('extend');
var Router = require('../helpers/router.js');
var schema = require('../schema/accounts.js');
var sandboxHelper = require('../helpers/sandbox.js');
var slots = require('../helpers/slots.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};
__private.blockReward = new BlockReward();

// Constructor
function Accounts (cb, scope) {
	library = scope;
	self = this;

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
		'post /generatePublicKey': 'generatePublicKey',
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
			req.sanitize(req.query, schema.top, function (err, report, query) {
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
		library.logger.error('API error ' + req.url, err);
		res.status(500).send({success: false, error: 'API error'});
	});
};

__private.openAccount = function (secret, cb) {
	var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
	var keypair = library.ed.makeKeypair(hash);
	var publicKey = keypair.publicKey.toString('hex');

	self.getAccount({ publicKey: publicKey }, function (err, account) {
		if (err) {
			return setImmediate(cb, err);
		}

		if (account) {
			return setImmediate(cb, null, account);
		} else {
			return setImmediate(cb, null, {
				address: self.generateAddressByPublicKey(publicKey),
				u_balance: '0',
				balance: '0',
				publicKey: publicKey,
				u_secondSignature: 0,
				secondSignature: 0,
				secondPublicKey: null,
				multisignatures: null,
				u_multisignatures: null
			});
		}
	});
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
		throw 'Invalid public key: ' + publicKey;
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
			return setImmediate(cb, 'Missing address or public key');
		}
	}

	if (!address) {
		return setImmediate(cb, 'Invalid public key');
	}

	library.logic.account.set(address, data, function (err) {
		if (err) {
			return setImmediate(cb, err);
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
			return setImmediate(cb, 'Missing address or public key');
		}
	}

	if (!address) {
		return setImmediate(cb, 'Invalid public key');
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
	library.scheme.validate(req.body, schema.open, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		__private.openAccount(req.body.secret, function (err, account) {
			if (!err) {
				var accountData = {
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

				return setImmediate(cb, null, {account: accountData});
			} else {
				return setImmediate(cb, err);
			}
		});
	});
};

shared.getBalance = function (req, cb) {
	library.scheme.validate(req.body, schema.getBalance, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var isAddress = /^[0-9]{1,21}[L|l]$/g;
		if (!isAddress.test(req.body.address)) {
			return setImmediate(cb, 'Invalid address');
		}

		self.getAccount({ address: req.body.address }, function (err, account) {
			if (err) {
				return setImmediate(cb, err);
			}

			var balance = account ? account.balance : '0';
			var unconfirmedBalance = account ? account.u_balance : '0';

			return setImmediate(cb, null, {balance: balance, unconfirmedBalance: unconfirmedBalance});
		});
	});
};

shared.getPublickey = function (req, cb) {
	library.scheme.validate(req.body, schema.getPublicKey, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var isAddress = /^[0-9]{1,21}[L|l]$/g;
		if (!isAddress.test(req.body.address)) {
			return setImmediate(cb, 'Invalid address');
		}

		self.getAccount({ address: req.body.address }, function (err, account) {
			if (err) {
				return setImmediate(cb, err);
			}

			if (!account || !account.publicKey) {
				return setImmediate(cb, 'Account not found');
			}

			return setImmediate(cb, null, {publicKey: account.publicKey});
		});
	});
};

shared.generatePublicKey = function (req, cb) {
	library.scheme.validate(req.body, schema.generatePublicKey, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		__private.openAccount(req.body.secret, function (err, account) {
			var publicKey = null;

			if (!err && account) {
				publicKey = account.publicKey;
			}

			return setImmediate(cb, err, {
				publicKey: publicKey
			});
		});
	});
};

shared.getDelegates = function (req, cb) {
	library.scheme.validate(req.body, schema.getDelegates, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		self.getAccount({ address: req.body.address }, function (err, account) {
			if (err) {
				return setImmediate(cb, err);
			}

			if (!account) {
				return setImmediate(cb, 'Account not found');
			}

			if (account.delegates) {
				modules.delegates.getDelegates(req.body, function (err, res) {
					var delegates = res.delegates.filter(function (delegate) {
						return account.delegates.indexOf(delegate.publicKey) !== -1;
					});

					return setImmediate(cb, null, {delegates: delegates});
				});
			} else {
				return setImmediate(cb, null, {delegates: []});
			}
		});
	});
};

shared.getDelegatesFee = function (req, cb) {
	return setImmediate(cb, null, {fee: constants.fees.delegate});
};

shared.addDelegates = function (req, cb) {
	library.scheme.validate(req.body, schema.addDelegates, function (err) {
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

		library.balancesSequence.add(function (cb) {
			if (req.body.multisigAccountPublicKey && req.body.multisigAccountPublicKey !== keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({ publicKey: req.body.multisigAccountPublicKey }, function (err, account) {
					if (err) {
						return setImmediate(cb, err);
					}

					if (!account || !account.publicKey) {
						return setImmediate(cb, 'Multisignature account not found');
					}

					if (!account.multisignatures || !account.multisignatures) {
						return setImmediate(cb, 'Account does not have multisignatures enabled');
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return setImmediate(cb, 'Account does not belong to multisignature group');
					}

					modules.accounts.getAccount({ publicKey: keypair.publicKey }, function (err, requester) {
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
								type: transactionTypes.VOTE,
								votes: req.body.delegates,
								sender: account,
								keypair: keypair,
								secondKeypair: secondKeypair,
								requester: keypair
							});
						} catch (e) {
							return setImmediate(cb, e.toString());
						}

						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			} else {
				self.setAccountAndGet({ publicKey: keypair.publicKey.toString('hex') }, function (err, account) {
					if (err) {
						return setImmediate(cb, err);
					}

					if (!account || !account.publicKey) {
						return setImmediate(cb, 'Account not found');
					}

					if (account.secondSignature && !req.body.secondSecret) {
						return setImmediate(cb, 'Invalid second passphrase');
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
						secondKeypair = library.ed.makeKeypair(secondHash);
					}

					var transaction;

					try {
						transaction = library.logic.transaction.create({
							type: transactionTypes.VOTE,
							votes: req.body.delegates,
							sender: account,
							keypair: keypair,
							secondKeypair: secondKeypair
						});
					} catch (e) {
						return setImmediate(cb, e.toString());
					}

					modules.transactions.receiveTransactions([transaction], cb);
				});
			}
		}, function (err, transaction) {
			if (err) {
				return setImmediate(cb, err);
			}

			return setImmediate(cb, null, {transaction: transaction[0]});
		});
	});
};

shared.getAccount = function (req, cb) {
	library.scheme.validate(req.body, schema.getAccount, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var isAddress = /^[0-9]{1,21}[L|l]$/g;
		if (!isAddress.test(req.body.address)) {
			return setImmediate(cb, 'Invalid address');
		}

		self.getAccount({ address: req.body.address }, function (err, account) {
			if (err) {
				return setImmediate(cb, err);
			}

			if (!account) {
				return setImmediate(cb, 'Account not found');
			}

			return setImmediate(cb, null, {
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
