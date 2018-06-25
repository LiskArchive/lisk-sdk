/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const async = require('async');
const Multisignature = require('../logic/multisignature.js');
const transactionTypes = require('../helpers/transaction_types.js');
const ApiError = require('../helpers/api_error');
const errorCodes = require('../helpers/api_codes');

let genesisBlock = null; // eslint-disable-line no-unused-vars

// Private fields
let modules;
let library;
let self;
const __private = {};

__private.assetTypes = {};

/**
 * Main multisignatures methods. Initializes library with scope content and generates a Multisignature instance.
 * Calls logic.transaction.attachAssetType().
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires helpers/api_codes
 * @requires helpers/api_error
 * @requires helpers/transaction_types
 * @requires logic/multisignature
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
function Multisignatures(cb, scope) {
	library = {
		logger: scope.logger.child({ module: 'multisignatures' }),
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
	genesisBlock = library.genesisBlock;
	self = this;

	__private.assetTypes[
		transactionTypes.MULTI
	] = library.logic.transaction.attachAssetType(
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
 *
 * @param {Object} transaction - Contains transaction and signature
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add test coverage.
 */
Multisignatures.prototype.processSignature = function(transaction, cb) {
	if (!transaction) {
		return setImmediate(
			cb,
			'Unable to process signature. Signature is undefined.'
		);
	}
	const multisignatureTransaction = modules.transactions.getMultisignatureTransaction(
		transaction.transactionId
	);

	function done(cb) {
		library.balancesSequence.add(cb => {
			const multisignatureTransaction = modules.transactions.getMultisignatureTransaction(
				transaction.transactionId
			);

			if (!multisignatureTransaction) {
				return setImmediate(cb, 'Transaction not found');
			}

			modules.accounts.getAccount(
				{
					address: multisignatureTransaction.senderId,
				},
				(err, sender) => {
					if (err) {
						return setImmediate(cb, err);
					} else if (!sender) {
						return setImmediate(cb, 'Sender not found');
					}
					multisignatureTransaction.signatures =
						multisignatureTransaction.signatures || [];
					multisignatureTransaction.signatures.push(transaction.signature);
					multisignatureTransaction.ready = Multisignature.prototype.ready(
						multisignatureTransaction,
						sender
					);

					library.bus.message('signature', transaction, true);
					return setImmediate(cb);
				}
			);
		}, cb);
	}

	if (!multisignatureTransaction) {
		return setImmediate(cb, 'Transaction not found');
	}

	if (multisignatureTransaction.type === transactionTypes.MULTI) {
		multisignatureTransaction.signatures =
			multisignatureTransaction.signatures || [];

		if (
			multisignatureTransaction.asset.multisignature.signatures ||
			multisignatureTransaction.signatures.indexOf(transaction.signature) !== -1
		) {
			return setImmediate(cb, 'Permission to sign transaction denied');
		}

		// Find public key
		let verify = false;

		try {
			for (
				let i = 0;
				i < multisignatureTransaction.asset.multisignature.keysgroup.length &&
				!verify;
				i++
			) {
				const key = multisignatureTransaction.asset.multisignature.keysgroup[
					i
				].substring(1);
				verify = library.logic.transaction.verifySignature(
					multisignatureTransaction,
					key,
					transaction.signature
				);
			}
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(cb, 'Failed to verify signature');
		}

		if (!verify) {
			return setImmediate(cb, 'Failed to verify signature');
		}

		return done(cb);
	}
	modules.accounts.getAccount(
		{
			address: multisignatureTransaction.senderId,
		},
		(err, account) => {
			if (err) {
				return setImmediate(cb, 'Multisignature account not found');
			}

			let verify = false;
			const multisignatures = account.multisignatures;

			if (multisignatureTransaction.requesterPublicKey) {
				multisignatures.push(multisignatureTransaction.senderPublicKey);
			}

			if (!account) {
				return setImmediate(cb, 'Account not found');
			}

			multisignatureTransaction.signatures =
				multisignatureTransaction.signatures || [];

			if (
				multisignatureTransaction.signatures.indexOf(transaction.signature) >= 0
			) {
				return setImmediate(cb, 'Signature already exists');
			}

			try {
				for (let i = 0; i < multisignatures.length && !verify; i++) {
					verify = library.logic.transaction.verifySignature(
						multisignatureTransaction,
						multisignatures[i],
						transaction.signature
					);
				}
			} catch (e) {
				library.logger.error(e.stack);
				return setImmediate(cb, 'Failed to verify signature');
			}

			if (!verify) {
				return setImmediate(cb, 'Failed to verify signature');
			}

			library.network.io.sockets.emit(
				'multisignatures/signature/change',
				multisignatureTransaction
			);
			return done(cb);
		}
	);
};

/**
 * Description of getGroup.
 *
 * @todo Add @returns and @param tags
 * @todo Add description for the function
 */
Multisignatures.prototype.getGroup = function(address, cb) {
	const scope = {};

	async.series(
		{
			getAccount(seriesCb) {
				library.logic.account.getMultiSignature({ address }, (err, account) => {
					if (err) {
						return setImmediate(seriesCb, err);
					}

					if (!account) {
						return setImmediate(
							seriesCb,
							new ApiError(
								'Multisignature account not found',
								errorCodes.NOT_FOUND
							)
						);
					}

					scope.group = {
						address: account.address,
						publicKey: account.publicKey,
						secondPublicKey: account.secondPublicKey || '',
						balance: account.balance,
						unconfirmedBalance: account.u_balance,
						min: account.multimin,
						lifetime: account.multilifetime,
						members: [],
					};

					return setImmediate(seriesCb);
				});
			},
			getMembers(seriesCb) {
				library.db.multisignatures
					.getMemberPublicKeys(scope.group.address)
					.then(memberAccountKeys => {
						const addresses = [];

						memberAccountKeys.forEach(key => {
							addresses.push(modules.accounts.generateAddressByPublicKey(key));
						});

						modules.accounts.getAccounts(
							{ address: addresses },
							['address', 'publicKey', 'secondPublicKey'],
							(err, accounts) => {
								accounts.forEach(account => {
									scope.group.members.push({
										address: account.address,
										publicKey: account.publicKey,
										secondPublicKey: account.secondPublicKey || '',
									});
								});

								return setImmediate(seriesCb);
							}
						);
					});
			},
		},
		err => {
			if (err) {
				return setImmediate(cb, err);
			}
			return setImmediate(cb, null, scope.group);
		}
	);
};

// Events
/**
 * Calls Multisignature.bind() with modules params.
 *
 * @param {modules} scope - Loaded modules
 */
Multisignatures.prototype.onBind = function(scope) {
	modules = {
		accounts: scope.accounts,
		transactions: scope.transactions,
		multisignatures: scope.multisignatures,
	};

	__private.assetTypes[transactionTypes.MULTI].bind(scope.accounts);
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded
 */
Multisignatures.prototype.isLoaded = function() {
	return !!modules;
};

// Shared API
/**
 * @todo Implement API comments with apidoc
 * @see {@link http://apidocjs.com/}
 */
Multisignatures.prototype.shared = {
	/**
	 * Search accounts based on the query parameter passed.
	 *
	 * @param {Object} filters - Filters applied to results
	 * @param {string} filters.address - Account address
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 */
	getGroups(filters, cb) {
		modules.multisignatures.getGroup(filters.address, (err, group) => {
			if (err) {
				return setImmediate(cb, err);
			}
			return setImmediate(cb, null, [group]);
		});
	},

	/**
	 * Search accounts based on the query parameter passed.
	 * @param {Object} filters - Filters applied to results.
	 * @param {string} filters.address - Account address.
	 * @param {function} cb - Callback function.
	 * @returns {setImmediateCallback} cb
	 */
	getMemberships(filters, cb) {
		const scope = {};

		async.series(
			{
				getAccount(seriesCb) {
					library.logic.account.get(
						{ address: filters.address },
						(err, account) => {
							if (err) {
								return setImmediate(seriesCb, err);
							}

							if (!account) {
								return setImmediate(
									seriesCb,
									new ApiError(
										'Multisignature membership account not found',
										errorCodes.NOT_FOUND
									)
								);
							}

							scope.targetAccount = account;

							return setImmediate(seriesCb);
						}
					);
				},
				getGroupAccountIds(seriesCb) {
					library.db.multisignatures
						.getGroupIds(scope.targetAccount.publicKey)
						.then(groupAccountIds => {
							scope.groups = [];

							async.each(
								groupAccountIds,
								(groupId, callback) => {
									modules.multisignatures.getGroup(groupId, (err, group) => {
										scope.groups.push(group);

										return setImmediate(callback);
									});
								},
								err => setImmediate(seriesCb, err)
							);
						});
				},
			},
			err => {
				if (err) {
					return setImmediate(cb, err);
				}
				return setImmediate(cb, null, scope.groups);
			}
		);
	},
};

// Export
module.exports = Multisignatures;
