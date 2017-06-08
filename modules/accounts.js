'use strict';

var bignum = require('../helpers/bignum.js');
var BlockReward = require('../logic/blockReward.js');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var extend = require('extend');
var schema = require('../schema/accounts.js');
var sandboxHelper = require('../helpers/sandbox.js');
var transactionTypes = require('../helpers/transactionTypes.js');
var Vote = require('../logic/vote.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};
__private.blockReward = new BlockReward();

/**
 * Initializes library with scope content and generates a Vote instance.
 * Calls logic.transaction.attachAssetType().
 * @memberof module:accounts
 * @class
 * @classdesc Main accounts methods.
 * @implements module:accounts.Account#Vote
 * @param {scope} scope - App instance.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
function Accounts (cb, scope) {
	library = {
		ed: scope.ed,
		schema: scope.schema,
		balancesSequence: scope.balancesSequence,
		logic: {
			account: scope.logic.account,
			transaction: scope.logic.transaction,
		},
	};
	self = this;

	__private.assetTypes[transactionTypes.VOTE] = library.logic.transaction.attachAssetType(
		transactionTypes.VOTE,
		new Vote(
			scope.logger,
			scope.schema
		)
	);

	setImmediate(cb, null, self);
}

/**
 * Gets account from publicKey obtained from secret parameter.
 * If not existes, generates new account data with public address
 * obtained from secret parameter.
 * @private
 * @param {function} secret
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} As per logic new|current account data object.
 */
__private.openAccount = function (secret, cb) {
	var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
	var keypair = library.ed.makeKeypair(hash);
	var publicKey = keypair.publicKey.toString('hex');

	self.getAccount({publicKey: publicKey}, function (err, account) {
		if (err) {
			return setImmediate(cb, err);
		}

		if (account) {
			if (account.publicKey == null) {
				account.publicKey = publicKey;
			}
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

/**
 * Generates address based on public key.
 * @param {publicKey} publicKey - PublicKey.
 * @returns {address} Address generated.
 * @throws {string} If address is invalid throws `Invalid public key`.
 */
Accounts.prototype.generateAddressByPublicKey = function (publicKey) {
	var publicKeyHash = crypto.createHash('sha256').update(publicKey, 'hex').digest();
	var temp = Buffer.alloc(8);

	for (var i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	var address = bignum.fromBuffer(temp).toString() + 'L';

	if (!address) {
		throw 'Invalid public key: ' + publicKey;
	}

	return address;
};

/**
 * Gets account information, calls logic.account.get().
 * @implements module:accounts#Account~get
 * @param {Object} filter - Containts publicKey.
 * @param {function} fields - Fields to get.
 * @param {function} cb - Callback function.
 */
Accounts.prototype.getAccount = function (filter, fields, cb) {
	if (filter.publicKey) {
		filter.address = self.generateAddressByPublicKey(filter.publicKey);
		delete filter.publicKey;
	}

	library.logic.account.get(filter, fields, cb);
};

/**
 * Gets accounts information, calls logic.account.getAll().
 * @implements module:accounts#Account~getAll
 * @param {Object} filter
 * @param {Object} fields
 * @param {function} cb - Callback function.
 */
Accounts.prototype.getAccounts = function (filter, fields, cb) {
	library.logic.account.getAll(filter, fields, cb);
};

/**
 * Validates input address and calls logic.account.set() and logic.account.get().
 * @implements module:accounts#Account~set
 * @implements module:accounts#Account~get
 * @param {Object} data - Contains address or public key to generate address.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Errors.
 * @returns {function()} Call to logic.account.get().
 */
Accounts.prototype.setAccountAndGet = function (data, cb) {
	var address = data.address || null;
	var err;

	if (address === null) {
		if (data.publicKey) {
			address = self.generateAddressByPublicKey(data.publicKey);
		} else {
			err = 'Missing address or public key';
		}
	}

	if (!address) {
		err = 'Invalid public key';
	}

	if (err) {
		if (typeof cb === 'function') {
			return setImmediate(cb, err);
		} else {
			throw err;
		}
	}

	library.logic.account.set(address, data, function (err) {
		if (err) {
			return setImmediate(cb, err);
		}
		return library.logic.account.get({address: address}, cb);
	});
};

/**
 * Validates input address and calls logic.account.merge().
 * @implements module:accounts#Account~merge
 * @param {Object} data - Contains address and public key.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} for errors wit address and public key.
 * @returns {function} calls to logic.account.merge().
 * @todo improve publicKey validation try/catch
 */
Accounts.prototype.mergeAccountAndGet = function (data, cb) {
	var address = data.address || null;
	var err;

	if (address === null) {
		if (data.publicKey) {
			address = self.generateAddressByPublicKey(data.publicKey);
		} else {
			err = 'Missing address or public key';
		}
	}

	if (!address) {
		err = 'Invalid public key';
	}

	if (err) {
		if (typeof cb === 'function') {
			return setImmediate(cb, err);
		} else {
			throw err;
		}
	}

	return library.logic.account.merge(address, data, cb);
};

/**
 * Calls helpers.sandbox.callMethod().
 * @implements module:helpers#callMethod
 * @param {function} call - Method to call.
 * @param {} args - List of arguments.
 * @param {function} cb - Callback function.
 * @todo verified function and arguments.
 */
Accounts.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
/**
 * Calls Vote.bind() with scope.
 * @implements module:accounts#Vote~bind
 * @param {modules} scope - Loaded modules.
 */
Accounts.prototype.onBind = function (scope) {
	modules = {
		delegates: scope.delegates,
		accounts: scope.accounts,
		transactions: scope.transactions,
	};

	__private.assetTypes[transactionTypes.VOTE].bind(
		scope.delegates,
		scope.rounds
	);
};
/**
 * Checks if modules is loaded.
 * @return {boolean} true if modules is loaded
 */
Accounts.prototype.isLoaded = function () {
	return !!modules;
};

// Shared API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Accounts.prototype.shared = {
	open: function (req, cb) {
		library.schema.validate(req.body, schema.open, function (err) {
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
	},

	getBalance: function (req, cb) {
		library.schema.validate(req.body, schema.getBalance, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
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
	},

	getPublickey: function (req, cb) {
		library.schema.validate(req.body, schema.getPublicKey, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
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
	},

	generatePublicKey: function (req, cb) {
		library.schema.validate(req.body, schema.generatePublicKey, function (err) {
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
	},

	getDelegates: function (req, cb) {
		library.schema.validate(req.body, schema.getDelegates, function (err) {
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
	},

	getDelegatesFee: function (req, cb) {
		return setImmediate(cb, null, {fee: constants.fees.delegate});
	},

	addDelegates: function (req, cb) {
		library.schema.validate(req.body, schema.addDelegates, function (err) {
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

							modules.transactions.receiveTransactions([transaction], true, cb);
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

						modules.transactions.receiveTransactions([transaction], true, cb);
					});
				}
			}, function (err, transaction) {
				if (err) {
					return setImmediate(cb, err);
				}

				return setImmediate(cb, null, {transaction: transaction[0]});
			});
		});
	},

	getAccount: function (req, cb) {
		library.schema.validate(req.body, schema.getAccount, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			if (!req.body.address && !req.body.publicKey) {
				return setImmediate(cb, 'Missing required property: address or publicKey');
			}

			// self.getAccount can accept publicKey as argument, but we also compare here
			// if account publicKey match address (when both are supplied)
			var address = req.body.publicKey ? self.generateAddressByPublicKey(req.body.publicKey) : req.body.address;
			if (req.body.address && req.body.publicKey && address !== req.body.address) {
				return setImmediate(cb, 'Account publicKey does not match address');
			}

			self.getAccount({ address: address }, function (err, account) {
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
	}
};

// Internal API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Accounts.prototype.internal = {
	count: function (req, cb) {
		return setImmediate(cb, null, {success: true, count: Object.keys(__private.accounts).length});
	},

	top: function (query, cb) {
		self.getAccounts({
			sort: {
				balance: -1
			},
			offset: query.offset,
			limit: (query.limit || 100)
		}, function (err, raw) {
			if (err) {
				return setImmediate(cb, err);
			}

			var accounts = raw.map(function (account) {
				return {
					address: account.address,
					balance: account.balance,
					publicKey: account.publicKey
				};
			});

			return setImmediate(cb, null, {success: true, accounts: accounts});
		});
	},

	getAllAccounts: function (req, cb) {
		return setImmediate(cb, null, {success: true, accounts: __private.accounts});
	}
};

// Export
module.exports = Accounts;
