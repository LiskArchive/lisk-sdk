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

const slots = require('../helpers/slots');
const Bignum = require('../helpers/bignum');
const regexpTester = require('../helpers/regexp_tester');

const exceptions = global.exceptions;

const { ADDITIONAL_DATA, FEES } = global.constants;
const __scope = {};

/**
 * Main transfer logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires helpers/bignum
 * @requires helpers/slots
 * @param {Object} scope
 * @param {Object} scope.components
 * @param {logger} scope.components.logger
 * @param {Object} scope.submodules
 * @param {Accounts} scope.submodules.accounts
 * @param {ZSchema} scope.schema
 * @todo Add description for the params
 */
class Transfer {
	constructor({ components: { logger }, schema }) {
		__scope.schema = schema;
		__scope.components = {
			logger,
		};
		// TODO: Add submodules to contructor argument and assign accounts to __scope.submodules.accounts
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with submodules and tests implementation.
/**
 * Binds input parameters to private variable submodules.
 *
 * @param {Accounts} accounts
 * @todo Add description for the params
 */
// TODO: Remove this method as submodules will be loaded prior to trs logic.
Transfer.prototype.bind = function(accounts) {
	__scope.submodules = {
		accounts,
	};
};

/**
 * Returns send fees from constants.
 *
 * @returns {Bignumber} Transaction fee
 * @todo Add description for the params
 */
Transfer.prototype.calculateFee = function() {
	return new Bignum(FEES.SEND);
};

/**
 * Verifies recipientId and amount greather than 0.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} error, transaction
 * @todo Add description for the params
 */
Transfer.prototype.verify = function(transaction, sender, cb) {
	if (!transaction.recipientId) {
		return setImmediate(cb, 'Missing recipient');
	}

	if (
		transaction.asset &&
		regexpTester.isNullByteIncluded(transaction.asset.data)
	) {
		if (exceptions.transactionWithNullByte.includes(transaction.id)) {
			__scope.components.logger.warn(
				'Transaction data field with null byte accepted due to exceptions',
				{
					transaction: JSON.stringify(transaction),
				}
			);
		} else {
			return setImmediate(
				cb,
				'Transfer data field has invalid character. Null character is not allowed.'
			);
		}
	}

	const amount = new Bignum(transaction.amount);
	if (amount.isLessThanOrEqualTo(0)) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	return setImmediate(cb, null, transaction);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} null, transaction
 * @todo Add description for the params
 */
Transfer.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates a buffer with asset.transfer.data.
 *
 * @param {transaction} transaction
 * @throws {Error}
 * @returns {buffer}
 * @todo Add description for the params
 */
Transfer.prototype.getBytes = function(transaction) {
	try {
		return transaction.asset && transaction.asset.data
			? Buffer.from(transaction.asset.data, 'utf8')
			: null;
	} catch (ex) {
		throw ex;
	}
};

/**
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
Transfer.prototype.applyConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	__scope.submodules.accounts.setAccountAndGet(
		{ address: transaction.recipientId },
		setAccountAndGetErr => {
			if (setAccountAndGetErr) {
				return setImmediate(cb, setAccountAndGetErr);
			}

			return __scope.submodules.accounts.mergeAccountAndGet(
				{
					address: transaction.recipientId,
					balance: transaction.amount,
					u_balance: transaction.amount,
					round: slots.calcRound(block.height),
				},
				mergeAccountAndGetErr => setImmediate(cb, mergeAccountAndGetErr),
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
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
Transfer.prototype.undoConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	__scope.submodules.accounts.setAccountAndGet(
		{ address: transaction.recipientId },
		setAccountAndGetErr => {
			if (setAccountAndGetErr) {
				return setImmediate(cb, setAccountAndGetErr);
			}

			return __scope.submodules.accounts.mergeAccountAndGet(
				{
					address: transaction.recipientId,
					balance: -transaction.amount,
					u_balance: -transaction.amount,
					round: slots.calcRound(block.height),
				},
				mergeAccountAndGetErr => setImmediate(cb, mergeAccountAndGetErr),
				tx
			);
		},
		tx
	);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
Transfer.prototype.applyUnconfirmed = function(transaction, sender, cb) {
	return setImmediate(cb);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
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
			minLength: ADDITIONAL_DATA.MIN_LENGTH,
			maxLength: ADDITIONAL_DATA.MAX_LENGTH,
		},
	},
};

/**
 * Deletes blockId from transaction, and validates schema if asset exists.
 *
 * @param {transaction} transaction
 * @returns {transaction}
 * @todo Add description for the params
 */
Transfer.prototype.objectNormalize = function(transaction) {
	delete transaction.blockId;

	if (!transaction.asset) {
		return transaction;
	}

	const report = __scope.schema.validate(
		transaction.asset,
		Transfer.prototype.schema
	);

	if (!report) {
		throw `Failed to validate transfer schema: ${__scope.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Checks if asset exists, if so, returns value, otherwise returns null.
 *
 * @param {Object} raw
 * @returns {transferAsset|null}
 * @todo Add description for the params
 */
Transfer.prototype.dbRead = function(raw) {
	if (raw.tf_data) {
		try {
			const data = raw.tf_data.toString('utf8');
			return { data };
		} catch (e) {
			__scope.components.logger.error(
				'Logic-Transfer-dbRead: Failed to convert data field into utf8'
			);
			return null;
		}
	}
	return null;
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {boolean} true - If transaction signatures greather than sender multimin, or there are no sender multisignatures
 * @todo Add description for the params
 */
Transfer.prototype.ready = function(transaction, sender) {
	if (
		Array.isArray(sender.membersPublicKeys) &&
		sender.membersPublicKeys.length
	) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multiMin;
	}
	return true;
};

module.exports = Transfer;
