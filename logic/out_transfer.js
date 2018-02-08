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
var slots = require('../helpers/slots.js');
var milestones = require('../helpers/milestones.js');

// Private fields
var modules;
var library;
var __private = {};

__private.unconfirmedOutTansfers = {};

/**
 * Main OutTransfer logic. Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @param {Database} db - Description of the param
 * @param {ZSchema} schema - Description of the param
 * @param {Object} logger - Description of the param
 * @todo Add descriptions for the params
 */
// Constructor
function OutTransfer(db, schema, logger) {
	library = {
		db: db,
		schema: schema,
		logger: logger,
	};
}

// Public methods
/**
 * Binds input modules to private variable module.
 *
 * @param {Accounts} accounts - Description of the param
 * @todo Add descriptions for the params
 */
OutTransfer.prototype.bind = function(accounts, blocks) {
	modules = {
		accounts: accounts,
		blocks: blocks,
	};
};

/**
 * Returns send fee from constants.
 *
 * @returns {number} fee
 */
OutTransfer.prototype.calculateFee = function() {
	return constants.fees.send;
};

/**
 * Verifies recipientId, amount and outTransfer object content.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} errors messages | transaction
 * @todo Add descriptions for the params
 */
OutTransfer.prototype.verify = function(transaction, sender, cb) {
	var lastBlock = modules.blocks.lastBlock.get();
	if (lastBlock.height >= milestones.disableDappTransfers) {
		return setImmediate(cb, `Transaction type ${transaction.type} is frozen`);
	}

	if (!transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!transaction.amount) {
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
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} errors messages | transaction
 * @todo Add descriptions for the params
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
					} else {
						return setImmediate(cb, null, transaction);
					}
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
 * @param {transaction} transaction - Description of the param
 * @throws {e} Error
 * @returns {Array} Buffer
 * @todo Add descriptions for the params
 */
OutTransfer.prototype.getBytes = function(transaction) {
	var buf;

	try {
		buf = Buffer.from([]);
		var dappIdBuf = Buffer.from(transaction.asset.outTransfer.dappId, 'utf8');
		var transactionIdBuff = Buffer.from(
			transaction.asset.outTransfer.transactionId,
			'utf8'
		);
		buf = Buffer.concat([buf, dappIdBuf, transactionIdBuff]);
	} catch (e) {
		throw e;
	}

	return buf;
};

/**
 * Sets unconfirmed out transfers to false.
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount.
 *
 * @param {transaction} transaction - Description of the param
 * @param {block} block - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} error, cb
 * @todo Add descriptions for the params
 */
OutTransfer.prototype.apply = function(transaction, block, sender, cb, tx) {
	__private.unconfirmedOutTansfers[
		transaction.asset.outTransfer.transactionId
	] = false;

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
 * Sets unconfirmed out transfers to true.
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount and balance both negatives.
 *
 * @param {transaction} transaction - Description of the param
 * @param {block} block - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} error, cb
 * @todo Add descriptions for the params
 */
OutTransfer.prototype.undo = function(transaction, block, sender, cb) {
	__private.unconfirmedOutTansfers[
		transaction.asset.outTransfer.transactionId
	] = true;

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
 * Sets unconfirmed OutTansfers to true.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb
 * @todo Add descriptions for the params
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
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb
 * @todo Add descriptions for the params
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
 * @param {transaction} transaction - Description of the param
 * @throws {string} error message
 * @returns {error|transaction} error string | transaction normalized
 * @todo Add descriptions for the params
 */
OutTransfer.prototype.objectNormalize = function(transaction) {
	var report = library.schema.validate(
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
 * @param {Object} raw - Description of the param
 * @returns {Object} outTransfer with dappId and transactionId
 * @todo Add descriptions for the params
 */
OutTransfer.prototype.dbRead = function(raw) {
	if (!raw.ot_dappId) {
		return null;
	} else {
		var outTransfer = {
			dappId: raw.ot_dappId,
			transactionId: raw.ot_outTransactionId,
		};

		return { outTransfer: outTransfer };
	}
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @returns {boolean} True if transaction signatures greather than sender multimin, or there are no sender multisignatures.
 * @todo Add descriptions for the params
 */
OutTransfer.prototype.ready = function(transaction, sender) {
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
module.exports = OutTransfer;
