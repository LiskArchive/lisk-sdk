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
const Bignum = require('../helpers/bignum.js');

const { FEES } = global.constants;
let modules;
let library;
let self;

/**
 * Main delegate logic. Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires async
 * @param {logger} logger
 * @param {ZSchema} schema
 * @todo Add description for the params
 */
class Delegate {
	constructor(logger, schema) {
		self = this;
		library = {
			schema,
			logger,
		};
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Binds input parameters to private variables modules.
 *
 * @param {Accounts} accounts
 * @todo Add description for the params
 */
Delegate.prototype.bind = function(accounts) {
	modules = {
		accounts,
	};
};

/**
 * Obtains constant fee delegate.
 *
 * @returns {Bignumber} FEES.DELEGATE
 * @todo Delete unused transaction, sender parameters
 */
Delegate.prototype.calculateFee = function() {
	return new Bignum(FEES.DELEGATE);
};

/**
 * Verifies fields from transaction and sender, calls modules.accounts.getAccount().
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate|Object} error, transaction
 * @todo Add description for the params
 */
Delegate.prototype.verify = function(transaction, sender, cb, tx) {
	if (transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	const amount = new Bignum(transaction.amount);
	if (amount.isGreaterThan(0)) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (sender.isDelegate) {
		return setImmediate(cb, 'Account is already a delegate');
	}

	if (!transaction.asset || !transaction.asset.delegate) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!transaction.asset.delegate.username) {
		return setImmediate(cb, 'Username is undefined');
	}

	if (
		transaction.asset.delegate.username !==
		transaction.asset.delegate.username.toLowerCase()
	) {
		return setImmediate(cb, 'Username must be lowercase');
	}

	const isAddress = /^[0-9]{1,21}[L|l]$/g;
	const allowSymbols = /^[a-z0-9!@$&_.]+$/g;

	const username = String(transaction.asset.delegate.username)
		.toLowerCase()
		.trim();

	if (username === '') {
		return setImmediate(cb, 'Empty username');
	}

	if (username.length > 20) {
		return setImmediate(cb, 'Username is too long. Maximum is 20 characters');
	}

	if (isAddress.test(username)) {
		return setImmediate(cb, 'Username can not be a potential address');
	}

	if (!allowSymbols.test(username)) {
		return setImmediate(
			cb,
			'Username can only contain alphanumeric characters with the exception of !@$&_.'
		);
	}

	self.checkConfirmed(
		transaction,
		err => setImmediate(cb, err, transaction),
		tx
	);
};

/**
 * Returns transaction with setImmediate.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} null
 * @todo Delete unused sender parameter
 * @todo Add description for the params
 */
Delegate.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Validates delegate username and returns buffer.
 *
 * @param {transaction} transaction
 * @returns {null|string}
 * @throws {Error}
 * @todo Add description for the params
 */
Delegate.prototype.getBytes = function(transaction) {
	if (!transaction.asset.delegate.username) {
		return null;
	}

	try {
		return Buffer.from(transaction.asset.delegate.username, 'utf8');
	} catch (e) {
		throw e;
	}
};

/**
 * Calls cb with error when account already exists.
 *
 * @param {transaction} transaction
 * @param {string} username - Key to check transaction with (username / u_username)
 * @param {string} isDelegate - Key to check transaction with (isDelegate / u_isDelegate)
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Delegate.prototype.checkDuplicates = function(
	transaction,
	username,
	isDelegate,
	cb,
	tx
) {
	async.parallel(
		{
			duplicatedDelegate(eachCb) {
				const query = {};
				query[isDelegate] = 1;
				query.publicKey = transaction.senderPublicKey;
				return modules.accounts.getAccount(query, [username], eachCb, tx);
			},
			duplicatedUsername(eachCb) {
				const query = {};
				query[username] = transaction.asset.delegate.username;
				return modules.accounts.getAccount(query, [username], eachCb, tx);
			},
		},
		(err, res) => {
			if (err) {
				return setImmediate(cb, err);
			}
			if (res.duplicatedDelegate) {
				return setImmediate(cb, 'Account is already a delegate');
			}
			if (res.duplicatedUsername) {
				return setImmediate(
					cb,
					`Username ${transaction.asset.delegate.username} already exists`
				);
			}
			return setImmediate(cb);
		}
	);
};

/**
 * Checks if confirmed delegate is already registered.
 *
 * @param {transaction} transaction
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Delegate.prototype.checkConfirmed = function(transaction, cb, tx) {
	self.checkDuplicates(
		transaction,
		'username',
		'isDelegate',
		err => setImmediate(cb, err, transaction),
		tx
	);
};

/**
 * Checks if unconfirmed delegate is already registered.
 *
 * @param {transaction} transaction
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Delegate.prototype.checkUnconfirmed = function(transaction, cb, tx) {
	self.checkDuplicates(
		transaction,
		'u_username',
		'u_isDelegate',
		err => setImmediate(cb, err, transaction),
		tx
	);
};

/**
 * Checks transaction delegate and calls modules.accounts.setAccountAndGet() with username.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Delete unused block parameter
 * @todo Add description for the params
 */
Delegate.prototype.applyConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	const data = {
		publicKey: transaction.senderPublicKey,
		address: sender.address,
		isDelegate: 1,
		vote: 0,
		username: transaction.asset.delegate.username,
	};

	async.series(
		[
			function(seriesCb) {
				self.checkConfirmed(transaction, seriesCb, tx);
			},
			function(seriesCb) {
				modules.accounts.setAccountAndGet(data, seriesCb, tx);
			},
		],
		cb
	);
};

/**
 * Checks transaction delegate and no nameexist and calls modules.accounts.setAccountAndGet() with u_username.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Delete unused block parameter
 * @todo Add description for the params
 */
Delegate.prototype.undoConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	const data = {
		address: sender.address,
		isDelegate: 0,
		vote: 0,
		username: null,
	};

	modules.accounts.setAccountAndGet(data, cb, tx);
};

/**
 * Checks transaction delegate and calls modules.accounts.setAccountAndGet() with u_username.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Delegate.prototype.applyUnconfirmed = function(transaction, sender, cb, tx) {
	const data = {
		publicKey: transaction.senderPublicKey,
		address: sender.address,
		u_isDelegate: 1,
		u_username: transaction.asset.delegate.username,
	};

	async.series(
		[
			function(seriesCb) {
				self.checkUnconfirmed(transaction, seriesCb, tx);
			},
			function(seriesCb) {
				modules.accounts.setAccountAndGet(data, seriesCb, tx);
			},
		],
		cb
	);
};

/**
 * Checks transaction delegate and calls modules.accounts.setAccountAndGet() with username and u_username both null.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Delegate.prototype.undoUnconfirmed = function(transaction, sender, cb, tx) {
	const data = {
		address: sender.address,
		u_isDelegate: 0,
		u_username: null,
	};

	modules.accounts.setAccountAndGet(data, cb, tx);
};

Delegate.prototype.schema = {
	id: 'Delegate',
	type: 'object',
	properties: {
		username: {
			type: 'string',
			format: 'username',
		},
	},
	required: ['username'],
};

/**
 * Validates transaction delegate schema.
 *
 * @param {transaction} transaction
 * @returns {error|transaction}
 * @throws {string} If delegate schema is invalid
 * @todo Add description for the params
 */
Delegate.prototype.objectNormalize = function(transaction) {
	const report = library.schema.validate(
		transaction.asset.delegate,
		Delegate.prototype.schema
	);

	if (!report) {
		throw `Failed to validate delegate schema: ${library.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Creates delegate Object based on raw data.
 *
 * @param {Object} raw - Contains d_username, t_senderPK, t_senderId
 * @returns {null|Object} null - If no d_username, otherwise created delegate object
 */
Delegate.prototype.dbRead = function(raw) {
	if (!raw.d_username) {
		return null;
	}
	const delegate = {
		username: raw.d_username,
		publicKey: raw.t_senderPublicKey,
		address: raw.t_senderId,
	};

	return { delegate };
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {boolean} true - If transaction signatures greather than sender multimin, or there are no sender multisignatures
 * @todo Add description for the params
 */
Delegate.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	}
	return true;
};

module.exports = Delegate;
