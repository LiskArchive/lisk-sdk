'use strict';

var async = require('async');
var crypto = require('crypto');
var extend = require('extend');
var genesisblock = null;
var Multisignature = require('../logic/multisignature.js');
var schema = require('../schema/multisignatures.js');
var sql = require('../sql/multisignatures.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

/**
 * Initializes library with scope content and generates a Multisignature instance.
 * Calls logic.transaction.attachAssetType().
 * @memberof module:multisignatures
 * @class
 * @classdesc Main multisignatures methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Multisignatures (cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		network: scope.network,
		schema: scope.schema,
		ed: scope.ed,
		bus: scope.bus,
		balancesSequence: scope.balancesSequence,
		logic: {
			transaction: scope.logic.transaction,
		},
	};
	genesisblock = library.genesisblock;
	self = this;

	__private.assetTypes[transactionTypes.MULTI] = library.logic.transaction.attachAssetType(
		transactionTypes.MULTI,
		new Multisignature(
			scope.schema,
			scope.network,
			scope.logic.transaction,
			scope.logic.account,
			scope.logger
		)
	);

	setImmediate(cb, null, self);
}

// Public methods
/**
 * Gets transaction from transaction id and add it to sequence and bus.
 * @param {Object} transaction - Contains transaction and signature.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} err messages| cb
 * @todo test function!.
 */
Multisignatures.prototype.processSignature = function (transaction, cb) {
	if (!transaction) {
		return setImmediate(cb, 'Unable to process signature. Signature is undefined.');
	}
	var multisignatureTransaction = modules.transactions.getMultisignatureTransaction(transaction.transaction);

	function done (cb) {
		library.balancesSequence.add(function (cb) {
			var multisignatureTransaction = modules.transactions.getMultisignatureTransaction(transaction.transaction);

			if (!multisignatureTransaction) {
				return setImmediate(cb, 'Transaction not found');
			}
			// We should do one unified get at the beginning of the process
			modules.accounts.getAccount({
				publicKey: multisignatureTransaction.senderPublicKey
			}, function (err, sender) {
				if (err) {
					return setImmediate(cb, err);
				} else if (!sender) {
					return setImmediate(cb, 'Sender not found');
				} else {
					multisignatureTransaction.signatures = multisignatureTransaction.signatures || [];
					multisignatureTransaction.signatures.push(transaction.signature);
					multisignatureTransaction.ready = Multisignature.prototype.ready(multisignatureTransaction, sender);

					library.bus.message('signature', {transaction: transaction.transaction, signature: transaction.signature}, true);
					return setImmediate(cb);
				}
			});
		}, cb);
	}

	if (!multisignatureTransaction) {
		return setImmediate(cb, 'Transaction not found');
	}

	if (multisignatureTransaction.type === transactionTypes.MULTI) {
		multisignatureTransaction.signatures = multisignatureTransaction.signatures || [];

		if (multisignatureTransaction.asset.multisignature.signatures || multisignatureTransaction.signatures.indexOf(transaction.signature) !== -1) {
			return setImmediate(cb, 'Permission to sign transaction denied');
		}

		// Find public key
		var verify = false;

		try {
			for (var i = 0; i < multisignatureTransaction.asset.multisignature.keysgroup.length && !verify; i++) {
				var key = multisignatureTransaction.asset.multisignature.keysgroup[i].substring(1);
				verify = library.logic.transaction.verifySignature(multisignatureTransaction, key, transaction.signature);
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
			address: multisignatureTransaction.senderId
		}, function (err, account) {
			if (err) {
				return setImmediate(cb, 'Multisignature account not found');
			}

			var verify = false;
			var multisignatures = account.multisignatures;
			// TODO: Compare the incoming publickey against the senderId multisignatures list here.

			if (multisignatureTransaction.requesterPublicKey) {
				multisignatures.push(multisignatureTransaction.senderPublicKey);
			}

			if (!account) {
				return setImmediate(cb, 'Account not found');
			}

			multisignatureTransaction.signatures = multisignatureTransaction.signatures || [];

			if (multisignatureTransaction.signatures.indexOf(transaction.signature) >= 0) {
				return setImmediate(cb, 'Signature already exists');
			}

			// TODO: Refactor this to query multisignatures_list using the incoming publicKey, saves resources
			try {
				for (var i = 0; i < multisignatures.length && !verify; i++) {
					verify = library.logic.transaction.verifySignature(multisignatureTransaction, multisignatures[i], transaction.signature);
				}
			} catch (e) {
				library.logger.error(e.stack);
				return setImmediate(cb, 'Failed to verify signature');
			}

			if (!verify) {
				return setImmediate(cb, 'Failed to verify signature');
			}

			library.network.io.sockets.emit('multisignatures/signature/change', multisignatureTransaction);
			return done(cb);
		});
	}
};

// Events
/**
 * Calls Multisignature.bind() with modules params.
 * @implements module:multisignatures#Multisignature~bind
 * @param {modules} scope - Loaded modules.
 */
Multisignatures.prototype.onBind = function (scope) {
	modules = {
		accounts: scope.accounts,
		transactions: scope.transactions
	};

	__private.assetTypes[transactionTypes.MULTI].bind(
		scope.accounts
	);
};

/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
Multisignatures.prototype.isLoaded = function () {
	return !!modules;
};

// Shared API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
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
	}
};

// Export
module.exports = Multisignatures;
