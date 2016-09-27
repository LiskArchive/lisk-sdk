'use strict';

var async = require('async');
var crypto = require('crypto');
var extend = require('extend');
var genesisblock = null;
var Router = require('../helpers/router.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/multisignatures.js');
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
		library.logger.error('API error ' + req.url, err);
		res.status(500).send({success: false, error: 'API error: ' + err.message});
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
	library.scheme.validate(req.body, schema.getAccounts, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		library.db.one(sql.getAccounts, { publicKey: req.body.publicKey }).then(function (row) {
			var addresses = Array.isArray(row.accountId) ? row.accountId : [];

			modules.accounts.getAccounts({
				address: { $in: addresses },
				sort: 'balance'
			}, ['address', 'balance', 'multisignatures', 'multilifetime', 'multimin'], function (err, rows) {
				if (err) {
					return setImmediate(cb, err);
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
							return setImmediate(cb, err);
						}

						account.multisigaccounts = multisigaccounts;
						return setImmediate(cb);
					});
				}, function (err) {
					if (err) {
						return setImmediate(cb, err);
					}

					return setImmediate(cb, null, {accounts: rows});
				});
			});
		}).catch(function (err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Multisignature#getAccounts error');
		});
	});
};

// Shared
shared.pending = function (req, cb) {
	library.scheme.validate(req.body, schema.pending, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var transactions = modules.transactions.getUnconfirmedTransactionList();
		transactions = transactions.filter(function (transaction) {
			return transaction.senderPublicKey === req.body.publicKey;
		});

		var pendings = [];
		async.eachSeries(transactions, function (transaction, cb) {
			var signed = false;

			if (transaction.signatures && transaction.signatures.length > 0) {
				var verify = false;

				for (var i in transaction.signatures) {
					var signature = transaction.signatures[i];

					try {
						verify = library.logic.transaction.verifySignature(transaction, req.body.publicKey, transaction.signatures[i]);
					} catch (e) {
						library.logger.error(e.stack);
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

			if (!signed && transaction.senderPublicKey === req.body.publicKey) {
				signed = true;
			}

			modules.accounts.getAccount({
				publicKey: transaction.senderPublicKey
			}, function (err, sender) {
				if (err) {
					return setImmediate(cb, err);
				}

				if (!sender) {
					return setImmediate(cb, 'Sender not found');
				}

				var hasUnconfirmed = (
					sender.publicKey === req.body.publicKey && Array.isArray(sender.u_multisignatures) && sender.u_multisignatures.length > 0
				);

				var belongsToUnconfirmed = (
					Array.isArray(sender.u_multisignatures) && sender.u_multisignatures.indexOf(req.body.publicKey) >= 0
				);

				var belongsToConfirmed = (
					Array.isArray(sender.multisignatures) && sender.multisignatures.indexOf(req.body.publicKey) >= 0
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

				return setImmediate(cb);
			});
		}, function () {
			return setImmediate(cb, null, {transactions: pendings});
		});
	});
};

Multisignatures.prototype.processSignature = function (tx, cb) {
	var transaction = modules.transactions.getUnconfirmedTransaction(tx.transaction);

	function done (cb) {
		library.balancesSequence.add(function (cb) {
			var transaction = modules.transactions.getUnconfirmedTransaction(tx.transaction);

			if (!transaction) {
				return setImmediate(cb, 'Transaction not found');
			}

			transaction.signatures = transaction.signatures || [];
			transaction.signatures.push(tx.signature);
			library.bus.message('signature', transaction, true);

			return setImmediate(cb);
		}, cb);
	}

	if (!transaction) {
		return setImmediate(cb, 'Missing transaction');
	}

	if (transaction.type === transactionTypes.MULTI) {
		transaction.signatures = transaction.signatures || [];

		if (transaction.asset.multisignature.signatures || transaction.signatures.indexOf(tx.signature) !== -1) {
			return setImmediate(cb, 'Permission to sign transaction denied');
		}

		// Find public key
		var verify = false;

		try {
			for (var i = 0; i < transaction.asset.multisignature.keysgroup.length && !verify; i++) {
				var key = transaction.asset.multisignature.keysgroup[i].substring(1);
				verify = library.logic.transaction.verifySignature(transaction, key, tx.signature);
			}
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(cb, 'Failed to verify signature');
		}

		if (!verify) {
			return setImmediate(cb, 'Failed to verify signature');
		}

		return done(cb);
	} else {
		modules.accounts.getAccount({
			address: transaction.senderId
		}, function (err, account) {
			if (err) {
				return setImmediate(cb, 'Multisignature account not found');
			}

			var verify = false;
			var multisignatures = account.multisignatures;

			if (transaction.requesterPublicKey) {
				multisignatures.push(transaction.senderPublicKey);
			}

			if (!account) {
				return setImmediate(cb, 'Account not found');
			}

			transaction.signatures = transaction.signatures || [];

			if (transaction.signatures.indexOf(tx.signature) >= 0) {
				return setImmediate(cb, 'Signature already exists');
			}

			try {
				for (var i = 0; i < multisignatures.length && !verify; i++) {
					verify = library.logic.transaction.verifySignature(transaction, multisignatures[i], tx.signature);
				}
			} catch (e) {
				library.logger.error(e.stack);
				return setImmediate(cb, 'Failed to verify signature');
			}

			if (!verify) {
				return setImmediate(cb, 'Failed to verify signature');
			}

			library.network.io.sockets.emit('multisignatures/signature/change', {});
			return done(cb);
		});
	}
};

shared.sign = function (req, cb) {
	library.scheme.validate(req.body, schema.sign, function (err) {
		if (err) {
			return setImmediate(cb, err[0].message);
		}

		var transaction = modules.transactions.getUnconfirmedTransaction(req.body.transactionId);

		if (!transaction) {
			return setImmediate(cb, 'Transaction not found');
		}

		var hash = crypto.createHash('sha256').update(req.body.secret, 'utf8').digest();
		var keypair = library.ed.makeKeypair(hash);

		if (req.body.publicKey) {
			if (keypair.publicKey.toString('hex') !== req.body.publicKey) {
				return setImmediate(cb, 'Invalid passphrase');
			}
		}

		var sign = library.logic.transaction.multisign(keypair, transaction);

		function done (cb) {
			library.balancesSequence.add(function (cb) {
				var transaction = modules.transactions.getUnconfirmedTransaction(req.body.transactionId);

				if (!transaction) {
					return setImmediate(cb, 'Transaction not found');
				}

				transaction.signatures = transaction.signatures || [];
				transaction.signatures.push(sign);

				library.bus.message('signature', {
					signature: sign,
					transaction: transaction.id
				}, true);

				return setImmediate(cb);
			}, function (err) {
				if (err) {
					return setImmediate(cb, err);
				}

				return setImmediate(cb, null, {transactionId: transaction.id});
			});
		}

		if (transaction.type === transactionTypes.MULTI) {
			if (transaction.asset.multisignature.keysgroup.indexOf('+' + keypair.publicKey.toString('hex')) === -1 || (transaction.signatures && transaction.signatures.indexOf(sign.toString('hex')) !== -1)) {
				return setImmediate(cb, 'Permission to sign transaction denied');
			}

			library.network.io.sockets.emit('multisignatures/signature/change', {});
			return done(cb);
		} else {
			modules.accounts.getAccount({
				address: transaction.senderId
			}, function (err, account) {
				if (err) {
					return setImmediate(cb, err);
				}

				if (!account) {
					return setImmediate(cb, 'Sender not found');
				}

				if (!transaction.requesterPublicKey) {
					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return setImmediate(cb, 'Permission to sign transaction denied');
					}
				} else {
					if (account.publicKey !== keypair.publicKey.toString('hex') || transaction.senderPublicKey !== keypair.publicKey.toString('hex')) {
						return setImmediate(cb, 'Permission to sign transaction denied');
					}
				}

				if (transaction.signatures && transaction.signatures.indexOf(sign) !== -1) {
					return setImmediate(cb, 'Permission to sign transaction denied');
				}

				library.network.io.sockets.emit('multisignatures/signature/change', {});
				return done(cb);
			});
		}
	});
};

shared.addMultisignature = function (req, cb) {
	library.scheme.validate(req.body, schema.addMultisignature, function (err) {
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
			modules.accounts.setAccountAndGet({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
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
						type: transactionTypes.MULTI,
						sender: account,
						keypair: keypair,
						secondKeypair: secondKeypair,
						min: req.body.min,
						keysgroup: req.body.keysgroup,
						lifetime: req.body.lifetime
					});
				} catch (e) {
					return setImmediate(cb, e.toString());
				}

				modules.transactions.receiveTransactions([transaction], cb);
			});
		}, function (err, transaction) {
			if (err) {
				return setImmediate(cb, err);
			}

			library.network.io.sockets.emit('multisignatures/change', {});
			return setImmediate(cb, null, {transactionId: transaction[0].id});
		});
	});
};

// Export
module.exports = Multisignatures;
