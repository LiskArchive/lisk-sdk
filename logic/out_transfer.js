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

const slots = require('../helpers/slots.js');
const Bignum = require('../helpers/bignum.js');

let modules;
let library;
const { FEES } = global.constants;
const exceptions = global.exceptions;
const __private = {};

__private.unconfirmedOutTansfers = {};

/**
 * Main OutTransfer logic. Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @param {Database} db
 * @param {ZSchema} schema
 * @param {Object} logger
 * @todo Add description for the params
 */
class OutTransfer {
	constructor(db, schema, logger) {
		library = {
			db,
			schema,
			logger,
		};
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Binds input modules to private variable module.
 *
 * @param {Accounts} accounts
 * @todo Add description for the params
 */
OutTransfer.prototype.bind = function(accounts, blocks) {
	modules = {
		accounts,
		blocks,
	};
};

/**
 * Returns send fee from constants.
 *
 * @returns {Bignumber} Transaction fee
 */
OutTransfer.prototype.calculateFee = function() {
	return new Bignum(FEES.SEND);
};

/**
 * Verifies recipientId, amount and outTransfer object content.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} error, transaction
 * @todo Add description for the params
 */
OutTransfer.prototype.verify = function(transaction, sender, cb) {
	const lastBlock = modules.blocks.lastBlock.get();
	if (lastBlock.height >= exceptions.precedent.disableDappTransfer) {
		return setImmediate(cb, `Transaction type ${transaction.type} is frozen`);
	}

	if (!transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	const amount = new Bignum(transaction.amount);
	if (amount.isLessThanOrEqualTo(0)) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!transaction.asset || !transaction.asset.outTransfer) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!/^[0-9]+$/.test(transaction.asset.outTransfer.dappId)) {
		return setImmediate(cb, 'Invalid outTransfer dappId');
	}

	if (!/^[0-9]+$/.test(transaction.asset.outTransfer.transactionId)) {
		return setImmediate(cb, 'Invalid outTransfer transactionId');
	}

	return setImmediate(cb, null, transaction);
};

/**
 * Finds application into `dapps` table. Checks if transaction is already
 * processed. Checks if transaction is already confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} error, transaction
 * @todo Add description for the params
 */
OutTransfer.prototype.process = function(transaction, sender, cb) {
	library.db.dapps
		.countByTransactionId(transaction.asset.outTransfer.dappId)
		.then(count => {
			if (count === 0) {
				return setImmediate(
					cb,
					`Application not found: ${transaction.asset.outTransfer.dappId}`
				);
			}

			if (
				__private.unconfirmedOutTansfers[
					transaction.asset.outTransfer.transactionId
				]
			) {
				return setImmediate(
					cb,
					`Transaction is already processed: ${
						transaction.asset.outTransfer.transactionId
					}`
				);
			}

			library.db.dapps
				.countByOutTransactionId(transaction.asset.outTransfer.transactionId)
				.then(count => {
					if (count > 0) {
						return setImmediate(
							cb,
							`Transaction is already confirmed: ${
								transaction.asset.outTransfer.transactionId
							}`
						);
					}
					return setImmediate(cb, null, transaction);
				})
				.catch(err => setImmediate(cb, err));
		})
		.catch(err => setImmediate(cb, err));
};

/**
 * Creates buffer with outTransfer content:
 * - dappId
 * - transactionId
 *
 * @param {transaction} transaction
 * @throws {Error}
 * @returns {Array} Buffer
 * @todo Add description for the params
 * @todo Check type and description of the return value
 */
OutTransfer.prototype.getBytes = function(transaction) {
	try {
		const buf = Buffer.from([]);
		const dappIdBuf = Buffer.from(transaction.asset.outTransfer.dappId, 'utf8');
		const transactionIdBuff = Buffer.from(
			transaction.asset.outTransfer.transactionId,
			'utf8'
		);
		return Buffer.concat([buf, dappIdBuf, transactionIdBuff]);
	} catch (e) {
		throw e;
	}
};

/**
 * Sets unconfirmed out transfers to false.
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
OutTransfer.prototype.applyConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	__private.unconfirmedOutTansfers[
		transaction.asset.outTransfer.transactionId
	] = false;

	modules.accounts.setAccountAndGet(
		{ address: transaction.recipientId },
		setAccountAndGetErr => {
			if (setAccountAndGetErr) {
				return setImmediate(cb, setAccountAndGetErr);
			}

			modules.accounts.mergeAccountAndGet(
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
 * Sets unconfirmed out transfers to true.
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount and balance both negatives.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
OutTransfer.prototype.undoConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	__private.unconfirmedOutTansfers[
		transaction.asset.outTransfer.transactionId
	] = true;

	modules.accounts.setAccountAndGet(
		{ address: transaction.recipientId },
		setAccountAndGetErr => {
			if (setAccountAndGetErr) {
				return setImmediate(cb, setAccountAndGetErr);
			}
			modules.accounts.mergeAccountAndGet(
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
 * Sets unconfirmed OutTansfers to true.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
OutTransfer.prototype.applyUnconfirmed = function(transaction, sender, cb) {
	__private.unconfirmedOutTansfers[
		transaction.asset.outTransfer.transactionId
	] = true;
	return setImmediate(cb);
};

/**
 * Sets unconfirmed OutTansfers to false.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
OutTransfer.prototype.undoUnconfirmed = function(transaction, sender, cb) {
	__private.unconfirmedOutTansfers[
		transaction.asset.outTransfer.transactionId
	] = false;
	return setImmediate(cb);
};

OutTransfer.prototype.schema = {
	id: 'OutTransfer',
	type: 'object',
	properties: {
		dappId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		transactionId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
	},
	required: ['dappId', 'transactionId'],
};

/**
 * Calls `objectNormalize` with asset outTransfer.
 *
 * @param {transaction} transaction
 * @throws {string}
 * @returns {error|transaction}
 * @todo Add description for the params
 */
OutTransfer.prototype.objectNormalize = function(transaction) {
	const report = library.schema.validate(
		transaction.asset.outTransfer,
		OutTransfer.prototype.schema
	);

	if (!report) {
		throw `Failed to validate outTransfer schema: ${library.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Creates outTransfer object based on raw data.
 *
 * @param {Object} raw
 * @returns {Object} OutTransfer with dappId and transactionId
 * @todo Add description for the params
 */
OutTransfer.prototype.dbRead = function(raw) {
	if (!raw.ot_dappId) {
		return null;
	}
	const outTransfer = {
		dappId: raw.ot_dappId,
		transactionId: raw.ot_outTransactionId,
	};

	return { outTransfer };
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {boolean} true - If transaction signatures greather than sender multimin, or there are no sender multisignatures
 * @todo Add description for the params
 */
OutTransfer.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	}
	return true;
};

module.exports = OutTransfer;
