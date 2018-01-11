'use strict';

var async = require('async');
var crypto = require('crypto');
var extend = require('extend');
var genesisblock = null;
var Multisignature = require('../logic/multisignature.js');
var transactionTypes = require('../helpers/transactionTypes.js');
var apiError = require('../helpers/apiError');
var errorCodes = require('../helpers/apiCodes');

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
			account: scope.logic.account,
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
 * @todo Add test coverage.
 */
Multisignatures.prototype.processSignature = function (transaction, cb) {
	if (!transaction) {
		return setImmediate(cb, 'Unable to process signature. Signature is undefined.');
	}
	var multisignatureTransaction = modules.transactions.getMultisignatureTransaction(transaction.transactionId);

	function done (cb) {
		library.balancesSequence.add(function (cb) {
			var multisignatureTransaction = modules.transactions.getMultisignatureTransaction(transaction.transactionId);

			if (!multisignatureTransaction) {
				return setImmediate(cb, 'Transaction not found');
			}

			modules.accounts.getAccount({
				address: multisignatureTransaction.senderAddress
			}, function (err, sender) {
				if (err) {
					return setImmediate(cb, err);
				} else if (!sender) {
					return setImmediate(cb, 'Sender not found');
				} else {
					multisignatureTransaction.signatures = multisignatureTransaction.signatures || [];
					multisignatureTransaction.signatures.push(transaction.signature);
					multisignatureTransaction.ready = Multisignature.prototype.ready(multisignatureTransaction, sender);

					library.bus.message('signature', transaction, true);
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
			address: multisignatureTransaction.senderAddress
		}, function (err, account) {
			if (err) {
				return setImmediate(cb, 'Multisignature account not found');
			}

			var verify = false;
			var multisignatures = account.multisignatures;

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

Multisignatures.prototype.getGroup = function (address, cb) {
	var scope = {};

	async.series({
		getAccount: function (seriesCb) {
			var multiSigFilters = Object.assign({}, {address: address}, {multimin: {$gt: 0}});

			library.logic.account.get(multiSigFilters, function (err, account) {
				if (err) {
					return setImmediate(seriesCb, err);
				}

				if (!account) {
					return setImmediate(seriesCb, new apiError('Multisignature account not found', errorCodes.NOT_FOUND));
				}

				scope.group = {
					address: account.address,
					publicKey: account.publicKey,
					secondPublicKey: account.secondPublicKey || '',
					balance: account.balance,
					unconfirmedBalance: account.u_balance,
					min: account.multimin,
					lifetime: account.multilifetime,
					members: []
				};

				return setImmediate(seriesCb);
			});
		},
		getMembers: function (seriesCb) {
			library.db.multisignatures.getMultisignatureMemberPublicKeys(scope.group.address).then(function (memberAccountKeys) {
				var addresses = [];

				memberAccountKeys.forEach(function (key) {
					addresses.push(modules.accounts.generateAddressByPublicKey(key));
				});

				modules.accounts.getAccounts({address: { $in: addresses}}, ['address', 'publicKey', 'secondPublicKey'], function (err, accounts) {
					accounts.forEach(function (account) {
						scope.group.members.push({
							address: account.address,
							publicKey: account.publicKey,
							secondPublicKey: account.secondPublicKey || ''
						});
					});

					return setImmediate(seriesCb);
				});
			});
		}
	}, function (err) {
		if (err) {
			return setImmediate(cb, err);
		} else {
			return setImmediate(cb, null, scope.group);
		}
	});
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
		transactions: scope.transactions,
		multisignatures: scope.multisignatures
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
 * @todo Implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Multisignatures.prototype.shared = {
	/**
	 * Search accounts based on the query parameter passed.
	 * @param {Object} filters - Filters applied to results.
	 * @param {string} filters.address - Account address.
	 * @param {function} cb - Callback function.
	 * @returns {setImmediateCallbackObject}
	 */
	getGroups: function (filters, cb) {
		modules.multisignatures.getGroup(filters.address, function (err, group) {
			if (err) {
				return setImmediate(cb, err);
			} else {
				return setImmediate(cb, null, [group]);
			}
		});
	},

	/**
	 * Search accounts based on the query parameter passed.
	 * @param {Object} filters - Filters applied to results.
	 * @param {string} filters.address - Account address.
	 * @param {function} cb - Callback function.
	 * @returns {setImmediateCallbackObject}
	 */
	getMemberships: function (filters, cb) {
		var scope = {};

		async.series({
			getAccount: function (seriesCb) {
				library.logic.account.get({address: filters.address}, function (err, account) {
					if (err) {
						return setImmediate(seriesCb, err);
					}

					if (!account) {
						return setImmediate(seriesCb, new apiError('Multisignature membership account not found', errorCodes.NOT_FOUND));
					}

					scope.targetAccount = account;

					return setImmediate(seriesCb);
				});
			},
			getGroupAccountIds: function (seriesCb) {
				library.db.multisignatures.getMultisignatureGroupIds(scope.targetAccount.publicKey).then(function (groupAccountIds) {
					scope.groups = [];

					async.each(groupAccountIds, function (groupId, callback){
						modules.multisignatures.getGroup(groupId, function (err, group) {
							scope.groups.push(group);

							return setImmediate(callback);
						});
					}, function (err) {
						return setImmediate(seriesCb, err);
					});
				});
			}
		}, function (err) {
			if (err) {
				return setImmediate(cb, err);
			} else {
				return setImmediate(cb, null, scope.groups);
			}
		});
	}
};

// Export
module.exports = Multisignatures;
