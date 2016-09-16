'use strict';

var async = require('async');
var crypto = require('crypto');
var extend = require('extend');
var genesisblock = null;
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var slots = require('../helpers/slots.js');
var sql = require('../sql/multisignatures.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

// Constructor
function Multisignatures (cb, scope) {
	library = scope;
	genesisblock = library.genesisblock;
	self = this;

	__private.attachApi();

	var Multisignature = require('../logic/multisignature.js');
	__private.assetTypes[transactionTypes.MULTI] = library.logic.transaction.attachAssetType(
		transactionTypes.MULTI, new Multisignature()
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
		'get /pending': 'pending',
		'post /sign': 'sign',
		'put /': 'addMultisignature',
		'get /accounts': 'getAccounts'
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: 'API endpoint not found'});
	});

	library.network.app.use('/api/multisignatures', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) { return next(); }
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
	});
};

// Public methods
Multisignatures.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Multisignatures.prototype.onBind = function (scope) {
	modules = scope;

	__private.assetTypes[transactionTypes.MULTI].bind({
		modules: modules, library: library
	});
};

shared.getAccounts = function (req, cb) {
	var query = req.body;

	library.scheme.validate(query, {
		type: 'object',
		properties: {
			publicKey: {
				type: 'string',
				format: 'publicKey'
			}
		},
		required: ['publicKey']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		library.db.one(sql.getAccounts, { publicKey: query.publicKey }).then(function (row) {
			var addresses = Array.isArray(row.accountId) ? row.accountId : [];

			modules.accounts.getAccounts({
				address: { $in: addresses },
				sort: 'balance'
			}, ['address', 'balance', 'multisignatures', 'multilifetime', 'multimin'], function (err, rows) {
				if (err) {
					return cb(err);
				}

				async.eachSeries(rows, function (account, cb) {
					var addresses = [];
					for (var i = 0; i < account.multisignatures.length; i++) {
						addresses.push(modules.accounts.generateAddressByPublicKey(account.multisignatures[i]));
					}

					modules.accounts.getAccounts({
						address: { $in: addresses }
					}, ['address', 'publicKey', 'balance'], function (err, multisigaccounts) {
						if (err) {
							return cb(err);
						}

						account.multisigaccounts = multisigaccounts;
						return cb();
					});
				}, function (err) {
					if (err) {
						return cb(err);
					}

					return cb(null, { accounts: rows });
				});
			});
		}).catch(function (err) {
			library.logger.error(err.toString());
			return cb('Multisignature#getAccounts error');
		});
	});
};

// Shared
shared.pending = function (req, cb) {
	var query = req.body;

	library.scheme.validate(query, {
		type: 'object',
		properties: {
			publicKey: {
				type: 'string',
				format: 'publicKey'
			}
		},
		required: ['publicKey']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var transactions = modules.transactions.getUnconfirmedTransactionList();
		transactions = transactions.filter(function (transaction) {
			return transaction.senderPublicKey === query.publicKey;
		});

		var pendings = [];
		async.eachSeries(transactions, function (transaction, cb) {
			var signed = false;

			if (transaction.signatures && transaction.signatures.length > 0) {
				var verify = false;

				for (var i in transaction.signatures) {
					var signature = transaction.signatures[i];

					try {
						verify = library.logic.transaction.verifySignature(transaction, query.publicKey, transaction.signatures[i]);
					} catch (e) {
						library.logger.error(e.toString());
						verify = false;
					}

					if (verify) {
						break;
					}
				}

				if (verify) {
					signed = true;
				}
			}

			if (!signed && transaction.senderPublicKey === query.publicKey) {
				signed = true;
			}

			modules.accounts.getAccount({
				publicKey: transaction.senderPublicKey
			}, function (err, sender) {
				if (err) {
					return cb(err);
				}

				if (!sender) {
					return cb('Sender not found');
				}

				var hasUnconfirmed = (
					sender.publicKey === query.publicKey && Array.isArray(sender.u_multisignatures) && sender.u_multisignatures.length > 0
				);

				var belongsToUnconfirmed = (
					Array.isArray(sender.u_multisignatures) && sender.u_multisignatures.indexOf(query.publicKey) >= 0
				);

				var belongsToConfirmed = (
					Array.isArray(sender.multisignatures) && sender.multisignatures.indexOf(query.publicKey) >= 0
				);

				if (hasUnconfirmed || belongsToUnconfirmed || belongsToConfirmed) {
					var min = sender.u_multimin || sender.multimin;
					var lifetime = sender.u_multilifetime || sender.multilifetime;
					var signatures = sender.u_multisignatures || [];

					pendings.push({
						max: signatures.length,
						min: min,
						lifetime: lifetime,
						signed: signed,
						transaction: transaction
					});
				}

				return cb();
			});
		}, function () {
			return cb(null, {transactions: pendings});
		});
	});
};

Multisignatures.prototype.processSignature = function (tx, cb) {
	var transaction = modules.transactions.getUnconfirmedTransaction(tx.transaction);

	function done (cb) {
		library.balancesSequence.add(function (cb) {
			var transaction = modules.transactions.getUnconfirmedTransaction(tx.transaction);

			if (!transaction) {
				return cb('Transaction not found');
			}

			transaction.signatures = transaction.signatures || [];
			transaction.signatures.push(tx.signature);
			library.bus.message('signature', transaction, true);

			return cb();
		}, cb);
	}

	if (!transaction) {
		return cb('Transaction not found');
	}

	if (transaction.type === transactionTypes.MULTI) {
		transaction.signatures = transaction.signatures || [];

		if (transaction.asset.multisignature.signatures || transaction.signatures.indexOf(tx.signature) !== -1) {
			return cb('Permission to sign transaction denied');
		}

		// Find public key
		var verify = false;

		try {
			for (var i = 0; i < transaction.asset.multisignature.keysgroup.length && !verify; i++) {
				var key = transaction.asset.multisignature.keysgroup[i].substring(1);
				verify = library.logic.transaction.verifySignature(transaction, key, tx.signature);
			}
		} catch (e) {
			library.logger.error(e.toString());
			return cb('Failed to verify signature');
		}

		if (!verify) {
			return cb('Failed to verify signature');
		}

		return done(cb);
	} else {
		modules.accounts.getAccount({
			address: transaction.senderId
		}, function (err, account) {
			if (err) {
				return cb('Multisignature account not found');
			}

			var verify = false;
			var multisignatures = account.multisignatures;

			if (transaction.requesterPublicKey) {
				multisignatures.push(transaction.senderPublicKey);
			}

			if (!account) {
				return cb('Account not found');
			}

			transaction.signatures = transaction.signatures || [];

			if (transaction.signatures.indexOf(tx.signature) >= 0) {
				return cb('Signature already exists');
			}

			try {
				for (var i = 0; i < multisignatures.length && !verify; i++) {
					verify = library.logic.transaction.verifySignature(transaction, multisignatures[i], tx.signature);
				}
			} catch (e) {
				library.logger.error(e.toString());
				return cb('Failed to verify signature');
			}

			if (!verify) {
				return cb('Failed to verify signature');
			}

			library.network.io.sockets.emit('multisignatures/signature/change', {});
			return done(cb);
		});
	}
};

shared.sign = function (req, cb) {
	var body = req.body;

	library.scheme.validate(body, {
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			secondSecret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			transactionId: {
				type: 'string'
			}
		},
		required: ['transactionId', 'secret']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var transaction = modules.transactions.getUnconfirmedTransaction(body.transactionId);

		if (!transaction) {
			return cb('Transaction not found');
		}

		var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
		var keypair = library.ed.makeKeypair(hash);

		if (body.publicKey) {
			if (keypair.publicKey.toString('hex') !== body.publicKey) {
				return cb('Invalid passphrase');
			}
		}

		var sign = library.logic.transaction.multisign(keypair, transaction);

		function done (cb) {
			library.balancesSequence.add(function (cb) {
				var transaction = modules.transactions.getUnconfirmedTransaction(body.transactionId);

				if (!transaction) {
					return cb('Transaction not found');
				}

				transaction.signatures = transaction.signatures || [];
				transaction.signatures.push(sign);

				library.bus.message('signature', {
					signature: sign,
					transaction: transaction.id
				}, true);

				return cb();
			}, function (err) {
				if (err) {
					return cb(err);
				}

				return cb(null, {transactionId: transaction.id});
			});
		}

		if (transaction.type === transactionTypes.MULTI) {
			if (transaction.asset.multisignature.keysgroup.indexOf('+' + keypair.publicKey.toString('hex')) === -1 || (transaction.signatures && transaction.signatures.indexOf(sign.toString('hex')) !== -1)) {
				return cb('Permission to sign transaction denied');
			}

			library.network.io.sockets.emit('multisignatures/signature/change', {});
			return done(cb);
		} else {
			modules.accounts.getAccount({
				address: transaction.senderId
			}, function (err, account) {
				if (err) {
					return cb(err);
				}

				if (!account) {
					return cb('Sender not found');
				}

				if (!transaction.requesterPublicKey) {
					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return cb('Permission to sign transaction denied');
					}
				} else {
					if (account.publicKey !== keypair.publicKey.toString('hex') || transaction.senderPublicKey !== keypair.publicKey.toString('hex')) {
						return cb('Permission to sign transaction denied');
					}
				}

				if (transaction.signatures && transaction.signatures.indexOf(sign) !== -1) {
					return cb('Permission to sign transaction denied');
				}

				library.network.io.sockets.emit('multisignatures/signature/change', {});
				return done(cb);
			});
		}
	});
};

shared.addMultisignature = function (req, cb) {
	var body = req.body;

	library.scheme.validate(body, {
		type: 'object',
		properties: {
			secret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			publicKey: {
				type: 'string',
				format: 'publicKey'
			},
			secondSecret: {
				type: 'string',
				minLength: 1,
				maxLength: 100
			},
			min: {
				type: 'integer',
				minimum: 1,
				maximum: 16
			},
			lifetime: {
				type: 'integer',
				minimum: 1,
				maximum: 72
			},
			keysgroup: {
				type: 'array',
				minLength: 1,
				maxLength: 10
			}
		},
		required: ['min', 'lifetime', 'keysgroup', 'secret']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
		var keypair = library.ed.makeKeypair(hash);

		if (body.publicKey) {
			if (keypair.publicKey.toString('hex') !== body.publicKey) {
				return cb('Invalid passphrase');
			}
		}

		library.balancesSequence.add(function (cb) {
			modules.accounts.setAccountAndGet({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
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
					secondKeypair = library.ed.makeKeypair(secondHash);
				}

				var transaction;

				try {
					transaction = library.logic.transaction.create({
						type: transactionTypes.MULTI,
						sender: account,
						keypair: keypair,
						secondKeypair: secondKeypair,
						min: body.min,
						keysgroup: body.keysgroup,
						lifetime: body.lifetime
					});
				} catch (e) {
					return cb(e.toString());
				}

				modules.transactions.receiveTransactions([transaction], cb);
			});
		}, function (err, transaction) {
			if (err) {
				return cb(err);
			}

			library.network.io.sockets.emit('multisignatures/change', {});
			return cb(null, {transactionId: transaction[0].id});
		});
	});
};

// Export
module.exports = Multisignatures;
