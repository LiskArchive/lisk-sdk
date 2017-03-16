'use strict';

var async = require('async');
var crypto = require('crypto');
var extend = require('extend');
var genesisblock = null;
var Multisignature = require('../logic/multisignature.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/multisignatures.js');
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

	__private.assetTypes[transactionTypes.MULTI] = library.logic.transaction.attachAssetType(
		transactionTypes.MULTI, new Multisignature()
	);

	setImmediate(cb, null, self);
}

// Public methods
Multisignatures.prototype.processSignature = function (tx, cb) {
	var transaction = modules.transactions.getMultisignatureTransaction(tx.transaction);

	function done (cb) {
		library.balancesSequence.add(function (cb) {
			var transaction = modules.transactions.getMultisignatureTransaction(tx.transaction);

			if (!transaction) {
				return setImmediate(cb, 'Transaction not found');
			}

			modules.accounts.getAccount({
				address: transaction.senderId
			}, function (err, sender) {
				if (err) {
					return setImmediate(cb, err);
				} else if (!sender) {
					return setImmediate(cb, 'Sender not found');
				} else {
					transaction.signatures = transaction.signatures || [];
					transaction.signatures.push(tx.signature);
					transaction.ready = Multisignature.prototype.ready(transaction, sender);

					library.bus.message('signature', {transaction: tx.transaction, signature: tx.signature}, true);
					return setImmediate(cb);
				}
			});
		}, cb);
	}

	if (!transaction) {
		return setImmediate(cb, 'Transaction not found');
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

			library.network.io.sockets.emit('multisignatures/signature/change', transaction);
			return done(cb);
		});
	}
};

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

Multisignatures.prototype.isLoaded = function () {
	return !!modules;
};

// Shared API
Multisignatures.prototype.shared = {
	getAccounts: function (req, cb) {
		var scope = {};

		async.series({
			validateSchema: function (seriesCb) {
				library.schema.validate(req.body, schema.getAccounts, function (err) {
					if (err) {
						return setImmediate(seriesCb, err[0].message);
					} else {
						return setImmediate(seriesCb);
					}
				});
			},
			getAccountIds: function (seriesCb) {
				library.db.one(sql.getAccountIds, { publicKey: req.body.publicKey }).then(function (row) {
					scope.accountIds = Array.isArray(row.accountIds) ? row.accountIds : [];
					return setImmediate(seriesCb);
				}).catch(function (err) {
					library.logger.error(err.stack);
					return setImmediate(seriesCb, 'Multisignature#getAccountIds error');
				});
			},
			getAccounts: function (seriesCb) {
				modules.accounts.getAccounts({
					address: { $in: scope.accountIds },
					sort: 'balance'
				}, ['address', 'balance', 'multisignatures', 'multilifetime', 'multimin'], function (err, accounts) {
					if (err) {
						return setImmediate(seriesCb, err);
					} else {
						scope.accounts = accounts;
						return setImmediate(seriesCb);
					}
				});
			},
			buildAccounts: function (seriesCb) {
				async.eachSeries(scope.accounts, function (account, eachSeriesCb) {
					var addresses = [];

					for (var i = 0; i < account.multisignatures.length; i++) {
						addresses.push(modules.accounts.generateAddressByPublicKey(account.multisignatures[i]));
					}

					modules.accounts.getAccounts({
						address: { $in: addresses }
					}, ['address', 'publicKey', 'balance'], function (err, multisigaccounts) {
						if (err) {
							return setImmediate(eachSeriesCb, err);
						}

						account.multisigaccounts = multisigaccounts;
						return setImmediate(eachSeriesCb);
					});
				}, seriesCb);
			}
		}, function (err) {
			if (err) {
				return setImmediate(cb, err);
			} else {
				return setImmediate(cb, null, {accounts: scope.accounts});
			}
		});
	},

	pending: function (req, cb) {
		var scope = { pending: [] };

		async.series({
			validateSchema: function (seriesCb) {
				library.schema.validate(req.body, schema.pending, function (err) {
					if (err) {
						return setImmediate(seriesCb, err[0].message);
					} else {
						return setImmediate(seriesCb);
					}
				});
			},
			getTransactionList: function (seriesCb) {
				scope.transactions = modules.transactions.getMultisignatureTransactionList(false, false);
				scope.transactions = scope.transactions.filter(function (transaction) {
					return transaction.senderPublicKey === req.body.publicKey;
				});

				return setImmediate(seriesCb);
			},
			buildTransactions: function (seriesCb) {
				async.eachSeries(scope.transactions, function (transaction, eachSeriesCb) {
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

						var min = sender.u_multimin || sender.multimin;
						var lifetime = sender.u_multilifetime || sender.multilifetime;
						var signatures = sender.u_multisignatures || [];

						scope.pending.push({
							max: signatures.length,
							min: min,
							lifetime: lifetime,
							signed: signed,
							transaction: transaction
						});

						return setImmediate(eachSeriesCb);
					});
				}, function (err) {
					return setImmediate(seriesCb, err);
				});
			}
		}, function (err) {
			return setImmediate(cb, err, {transactions: scope.pending});
		});
	},

	sign: function (req, cb) {
		var scope = {};

		function checkGroupPermisions (cb) {
			var permissionDenied = (
			scope.transaction.asset.multisignature.keysgroup.indexOf('+' + scope.keypair.publicKey.toString('hex')) === -1
		);

			if (permissionDenied) {
				return setImmediate(cb, 'Permission to sign transaction denied');
			}

			var alreadySigned = (
			Array.isArray(scope.transaction.signatures) &&
			scope.transaction.signatures.indexOf(scope.signature.toString('hex')) !== -1
		);

			if (alreadySigned) {
				return setImmediate(cb, 'Transaction already signed');
			}

			return setImmediate(cb);
		}

		function checkTransactionPermissions (cb) {
			var permissionDenied = true;

			if (!scope.transaction.requesterPublicKey) {
				permissionDenied = (
				(!Array.isArray(scope.sender.multisignatures) || scope.sender.multisignatures.indexOf(scope.keypair.publicKey.toString('hex')) === -1)
			);
			} else {
				permissionDenied = (
				(scope.sender.publicKey !== scope.keypair.publicKey.toString('hex') || (scope.transaction.senderPublicKey !== scope.keypair.publicKey.toString('hex')))
			);
			}

			if (permissionDenied)  {
				return setImmediate(cb, 'Permission to sign transaction denied');
			}

			var alreadySigned = (scope.transaction.signatures && scope.transaction.signatures.indexOf(scope.signature) !== -1);

			if (alreadySigned) {
				return setImmediate(cb, 'Transaction already signed');
			}

			return setImmediate(cb);
		}

		library.balancesSequence.add(function (cb) {
			async.series({
				validateSchema: function (seriesCb) {
					library.schema.validate(req.body, schema.sign, function (err) {
						if (err) {
							return setImmediate(seriesCb, err[0].message);
						} else {
							return setImmediate(seriesCb);
						}
					});
				},
				signTransaction: function (seriesCb) {
					scope.transaction = modules.transactions.getMultisignatureTransaction(req.body.transactionId);

					if (!scope.transaction) {
						return setImmediate(seriesCb, 'Transaction not found');
					}

					scope.hash = crypto.createHash('sha256').update(req.body.secret, 'utf8').digest();
					scope.keypair = library.ed.makeKeypair(scope.hash);

					if (req.body.publicKey) {
						if (scope.keypair.publicKey.toString('hex') !== req.body.publicKey) {
							return setImmediate(seriesCb, 'Invalid passphrase');
						}
					}

					scope.signature = library.logic.transaction.multisign(scope.keypair, scope.transaction);
					return setImmediate(seriesCb);
				},
				getAccount: function (seriesCb) {
					modules.accounts.getAccount({
						address: scope.transaction.senderId
					}, function (err, sender) {
						if (err) {
							return setImmediate(seriesCb, err);
						} else if (!sender) {
							return setImmediate(seriesCb, 'Sender not found');
						} else {
							scope.sender = sender;
							return setImmediate(seriesCb);
						}
					});
				},
				checkPermissions: function (seriesCb) {
					if (scope.transaction.type === transactionTypes.MULTI) {
						return checkGroupPermisions(seriesCb);
					} else {
						return checkTransactionPermissions(seriesCb);
					}
				}
			}, function (err) {
				if (err) {
					return setImmediate(cb, err);
				}

				var transaction = modules.transactions.getMultisignatureTransaction(req.body.transactionId);

				if (!transaction) {
					return setImmediate(cb, 'Transaction not found');
				}

				transaction.signatures = transaction.signatures || [];
				transaction.signatures.push(scope.signature);
				transaction.ready = Multisignature.prototype.ready(transaction, scope.sender);

				library.bus.message('signature', {transaction: transaction.id, signature: scope.signature}, true);
				library.network.io.sockets.emit('multisignatures/signature/change', transaction);

				return setImmediate(cb, null, {transactionId: transaction.id});
			});
		}, cb);
	},

	addMultisignature: function (req, cb) {
		var scope = {};

		library.balancesSequence.add(function (cb) {
			async.series({
				validateSchema: function (seriesCb) {
					library.schema.validate(req.body, schema.addMultisignature, function (err) {
						if (err) {
							return setImmediate(seriesCb, err[0].message);
						} else {
							return setImmediate(seriesCb);
						}
					});
				},
				addMultisignature: function (seriesCb) {
					scope.hash = crypto.createHash('sha256').update(req.body.secret, 'utf8').digest();
					scope.keypair = library.ed.makeKeypair(scope.hash);

					if (req.body.publicKey) {
						if (scope.keypair.publicKey.toString('hex') !== req.body.publicKey) {
							return setImmediate(seriesCb, 'Invalid passphrase');
						}
					}

					modules.accounts.setAccountAndGet({publicKey: scope.keypair.publicKey.toString('hex')}, function (err, account) {
						if (err) {
							return setImmediate(seriesCb, err);
						}

						if (!account || !account.publicKey) {
							return setImmediate(seriesCb, 'Account not found');
						}

						if (account.secondSignature && !req.body.secondSecret) {
							return setImmediate(seriesCb, 'Invalid second passphrase');
						}

						scope.secondKeypair = null;

						if (account.secondSignature) {
							scope.secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
							scope.secondKeypair = library.ed.makeKeypair(scope.secondHash);
						}

						try {
							scope.transaction = library.logic.transaction.create({
								type: transactionTypes.MULTI,
								sender: account,
								keypair: scope.keypair,
								secondKeypair: scope.secondKeypair,
								min: req.body.min,
								keysgroup: req.body.keysgroup,
								lifetime: req.body.lifetime
							});
						} catch (e) {
							return setImmediate(seriesCb, e.toString());
						}

						modules.transactions.receiveTransactions([scope.transaction], true, seriesCb);
					});
				}
			}, function (err) {
				if (err) {
					return setImmediate(cb, err);
				} else {
					library.network.io.sockets.emit('multisignatures/change', scope.transaction);
					return setImmediate(cb, null, {transactionId: scope.transaction.id});
				}
			});
		}, cb);
	}
};

// Export
module.exports = Multisignatures;
