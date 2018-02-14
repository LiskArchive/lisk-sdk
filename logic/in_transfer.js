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
var shared;

/**
 * Main InTransfer logic. Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires helpers/constants
 * @requires helpers/milestones
 * @requires helpers/slots
 * @param {Database} db
 * @param {ZSchema} schema
 * @todo Add description for the params
 */
// Constructor
function InTransfer(db, schema) {
	library = {
		db,
		schema,
	};
}

// Public methods
/**
 * Binds input parameters to private variables modules and shared.
 *
 * @param {Accounts} accounts
 * @param {Object} sharedApi
 * @todo Add description for the params
 */
InTransfer.prototype.bind = function(accounts, blocks, sharedApi) {
	modules = {
		accounts,
		blocks,
	};
	shared = sharedApi;
};

/**
 * Returns send fee from constants.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {number} Transaction fee
 * @todo Add description for the params
 */
InTransfer.prototype.calculateFee = function() {
	return constants.fees.send;
};

/**
 * Verifies recipientId, amount and InTransfer object content.
 * Finds application into `dapps` table.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
InTransfer.prototype.verify = function(transaction, sender, cb, tx) {
	var lastBlock = modules.blocks.lastBlock.get();
	if (lastBlock.height >= milestones.disableDappTransfers) {
		return setImmediate(cb, `Transaction type ${transaction.type} is frozen`);
	}

	if (transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!transaction.amount) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!transaction.asset || !transaction.asset.inTransfer) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	(tx || library.db).dapps
		.countByTransactionId(transaction.asset.inTransfer.dappId)
		.then(count => {
			if (count === 0) {
				return setImmediate(
					cb,
					`Application not found: ${transaction.asset.inTransfer.dappId}`
				);
			}
			return setImmediate(cb);
		})
		.catch(err => setImmediate(cb, err));
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
InTransfer.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates buffer with inTransfer content:
 * - dappId
 *
 * @param {transaction} transaction
 * @returns {Array} Buffer
 * @throws {Error} e
 * @todo Add description for the params
 * @todo Check type and description of the return value
 */
InTransfer.prototype.getBytes = function(transaction) {
	var buf;

	try {
		buf = Buffer.from([]);
		var nameBuf = Buffer.from(transaction.asset.inTransfer.dappId, 'utf8');
		buf = Buffer.concat([buf, nameBuf]);
	} catch (e) {
		throw e;
	}

	return buf;
};

/**
 * Calls getGenesis with dappid to obtain authorId.
 * Calls mergeAccountAndGet with unconfirmed transaction amount and authorId as
 * address.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
InTransfer.prototype.apply = function(transaction, block, sender, cb, tx) {
	shared.getGenesis(
		{ dappid: transaction.asset.inTransfer.dappId },
		(err, res) => {
			if (err) {
				return setImmediate(cb, err);
			}
			modules.accounts.mergeAccountAndGet(
				{
					address: res.authorId,
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
 * Calls getGenesis with dappid to obtain authorId.
 * Calls mergeAccountAndGet with authorId as address and unconfirmed
 * transaction amount and balance both negatives.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
InTransfer.prototype.undo = function(transaction, block, sender, cb) {
	shared.getGenesis(
		{ dappid: transaction.asset.inTransfer.dappId },
		(err, res) => {
			if (err) {
				return setImmediate(cb, err);
			}
			modules.accounts.mergeAccountAndGet(
				{
					address: res.authorId,
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
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add descriptions for the function and the params
 */
InTransfer.prototype.applyUnconfirmed = function(transaction, sender, cb) {
	return setImmediate(cb);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add descriptions for the function and the params
 */
InTransfer.prototype.undoUnconfirmed = function(transaction, sender, cb) {
	return setImmediate(cb);
};

InTransfer.prototype.schema = {
	id: 'InTransfer',
	type: 'object',
	properties: {
		dappId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
	},
	required: ['dappId'],
};

/**
 * Calls `objectNormalize` with asset inTransfer.
 *
 * @param {transaction} transaction
 * @returns {error|transaction}
 * @throws {string} error message
 * @todo Add description for the params
 */
InTransfer.prototype.objectNormalize = function(transaction) {
	var report = library.schema.validate(
		transaction.asset.inTransfer,
		InTransfer.prototype.schema
	);

	if (!report) {
		throw `Failed to validate inTransfer schema: ${library.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Creates inTransfer object based on raw data.
 *
 * @param {Object} raw
 * @returns {Object} InTransfer with dappId
 * @todo Add description for the params
 */
InTransfer.prototype.dbRead = function(raw) {
	if (!raw.in_dappId) {
		return null;
	}
	var inTransfer = {
		dappId: raw.in_dappId,
	};

	return { inTransfer };
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction
 * @param {function} cb
 * @returns {SetImmediate}
 * @todo Add description for the params
 */
InTransfer.prototype.afterSave = function(transaction, cb) {
	return setImmediate(cb);
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {boolean} true - If transaction signatures greather than sender multimin, or there are no sender multisignatures.
 * @todo Add description for the params
 */
InTransfer.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	}
	return true;
};

// Export
module.exports = InTransfer;
