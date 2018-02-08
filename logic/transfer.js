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

var constants = require('../helpers/constants.js');
var bignum = require('../helpers/bignum.js');
var slots = require('../helpers/slots.js');

// Private fields
var modules;
var library;

/**
 * Main transfer logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires helpers/bignum
 * @requires helpers/constants
 * @requires helpers/slots
 * @param {Object} logger - Description of the param
 * @param {Object} schema - Description of the param
 * @todo Add descriptions for the params
 */
// Constructor
function Transfer(logger, schema) {
	library = {
		logger: logger,
		schema: schema,
	};
}

// Public methods
/**
 * Binds input parameters to private variable modules.
 *
 * @param {Accounts} accounts - Description of the param
 * @todo Add descriptions for the params
 */
Transfer.prototype.bind = function(accounts) {
	modules = {
		accounts: accounts,
	};
};

/**
 * Returns send fees from constants.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @returns {number} fee
 * @todo Add descriptions for the params
 */
Transfer.prototype.calculateFee = function(transaction) {
	var fee = new bignum(constants.fees.send);
	if (transaction.asset && transaction.asset.data) {
		fee = fee.plus(constants.fees.data);
	}

	return Number(fee.toString());
};

/**
 * Verifies recipientId and amount greather than 0.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} errors | transaction
 * @todo Add descriptions for the params
 */
Transfer.prototype.verify = function(transaction, sender, cb) {
	if (!transaction.recipientId) {
		return setImmediate(cb, 'Missing recipient');
	}

	if (transaction.amount <= 0) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	return setImmediate(cb, null, transaction);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb, null, transaction
 * @todo Add descriptions for the params
 */
Transfer.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates a buffer with asset.transfer.data.
 *
 * @param {transaction} transaction - Description of the param
 * @throws {error} error
 * @returns {buffer} buf
 * @todo Add descriptions for the params
 */
Transfer.prototype.getBytes = function(transaction) {
	var buf;

	try {
		buf =
			transaction.asset && transaction.asset.data
				? Buffer.from(transaction.asset.data, 'utf8')
				: null;
	} catch (ex) {
		throw ex;
	}

	return buf;
};

/**
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount.
 *
 * @param {transaction} transaction - Description of the param
 * @param {block} block - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function - Description of the param
 * @returns {setImmediateCallback} error, cb
 * @todo Add descriptions for the params
 */
Transfer.prototype.apply = function(transaction, block, sender, cb, tx) {
	modules.accounts.setAccountAndGet(
		{ address: transaction.recipientId },
		err => {
			if (err) {
				return setImmediate(cb, err);
			}

			modules.accounts.mergeAccountAndGet(
				{
					address: transaction.recipientId,
					balance: transaction.amount,
					u_balance: transaction.amount,
					blockId: block.id,
					round: slots.calcRound(block.height),
				},
				err => setImmediate(cb, err),
				tx
			);
		},
		tx
	);
};

/**
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount and balance negative.
 *
 * @param {transaction} transaction - Description of the param
 * @param {block} block - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} error, cb
 * @todo Add descriptions for the params
 */
Transfer.prototype.undo = function(transaction, block, sender, cb) {
	modules.accounts.setAccountAndGet(
		{ address: transaction.recipientId },
		err => {
			if (err) {
				return setImmediate(cb, err);
			}

			modules.accounts.mergeAccountAndGet(
				{
					address: transaction.recipientId,
					balance: -transaction.amount,
					u_balance: -transaction.amount,
					blockId: block.id,
					round: slots.calcRound(block.height),
				},
				err => setImmediate(cb, err)
			);
		}
	);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb
 * @todo Add descriptions for the params
 */
Transfer.prototype.applyUnconfirmed = function(transaction, sender, cb) {
	return setImmediate(cb);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb
 * @todo Add descriptions for the params
 */
Transfer.prototype.undoUnconfirmed = function(transaction, sender, cb) {
	return setImmediate(cb);
};

/**
 * @typedef {Object} transfer
 * @property {string} data
 */
Transfer.prototype.schema = {
	id: 'transfer',
	type: 'object',
	properties: {
		data: {
			type: 'string',
			format: 'additionalData',
			minLength: constants.additionalData.minLength,
			maxLength: constants.additionalData.maxLength,
		},
	},
};

/**
 * Deletes blockId from transaction, and validates schema if asset exists.
 *
 * @param {transaction} transaction - Description of the param
 * @returns {transaction}
 * @todo Add descriptions for the params
 */
Transfer.prototype.objectNormalize = function(transaction) {
	delete transaction.blockId;

	if (!transaction.asset) {
		return transaction;
	}

	var report = library.schema.validate(
		transaction.asset,
		Transfer.prototype.schema
	);

	if (!report) {
		throw `Failed to validate transfer schema: ${library.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Checks if asset exists, if so, returns value, otherwise returns null.
 *
 * @param {Object} raw - Description of the param
 * @returns {?transferAsset}
 * @todo Add descriptions for the params
 */
Transfer.prototype.dbRead = function(raw) {
	if (raw.tf_data) {
		return { data: raw.tf_data };
	}

	return null;
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @returns {boolean} True if transaction signatures greather than sender multimin, or there are no sender multisignatures.
 * @todo Add descriptions for the params
 */
Transfer.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};

// Export
module.exports = Transfer;
