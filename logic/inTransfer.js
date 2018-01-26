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

// Private fields
var modules, library, shared;

/**
 * Initializes library.
 * @memberof module:dapps
 * @class
 * @classdesc Main InTransfer logic.
 * @param {Database} db
 * @param {ZSchema} schema
 */
// Constructor
function InTransfer (db, schema) {
	library = {
		db: db,
		schema: schema,
	};
}

// Public methods
/**
 * Binds input parameters to private variables modules and shared.
 * @param {Accounts} accounts
 * @param {Object} sharedApi
 */
InTransfer.prototype.bind = function (accounts, sharedApi) {
	modules = {
		accounts: accounts
	};
	shared = sharedApi;
};

/**
 * Returns send fee from constants.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {number} fee
 */
InTransfer.prototype.calculateFee = function (transaction, sender) {
	return constants.fees.send;
};

/**
 * Verifies recipientId, amount and InTransfer object content.
 * Finds application into `dapps` table.
 * @implements {library.db.one}
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} errors message | transaction
 */
InTransfer.prototype.verify = function (transaction, sender, cb, tx) {
	if (transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!transaction.amount) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!transaction.asset || !transaction.asset.inTransfer) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	(tx || library.db).dapps.countByTransactionId(transaction.asset.inTransfer.dappId).then(function (count) {
		if (count === 0) {
			return setImmediate(cb, 'Application not found: ' + transaction.asset.inTransfer.dappId);
		} else {
			return setImmediate(cb);
		}
	}).catch(function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb, null, transaction
 */
InTransfer.prototype.process = function (transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates buffer with inTransfer content:
 * - dappId
 * @param {transaction} transaction
 * @return {Array} Buffer
 * @throws {e} Error
 */
InTransfer.prototype.getBytes = function (transaction) {
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
 * @implements {shared.getGenesis}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {slots.calcRound}
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
InTransfer.prototype.apply = function (transaction, block, sender, cb, tx) {
	shared.getGenesis({dappid: transaction.asset.inTransfer.dappId}, function (err, res) {
		if (err) {
			return setImmediate(cb, err);
		}
		modules.accounts.mergeAccountAndGet({
			address: res.authorId,
			balance: transaction.amount,
			u_balance: transaction.amount,
			blockId: block.id,
			round: slots.calcRound(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		}, tx);
	}, tx);
};

/**
 * Calls getGenesis with dappid to obtain authorId.
 * Calls mergeAccountAndGet with authorId as address and unconfirmed
 * transaction amount and balance both negatives.
 * @implements {shared.getGenesis}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {slots.calcRound}
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
InTransfer.prototype.undo = function (transaction, block, sender, cb) {
	shared.getGenesis({dappid: transaction.asset.inTransfer.dappId}, function (err, res) {
		if (err) {
			return setImmediate(cb, err);
		}
		modules.accounts.mergeAccountAndGet({
			address: res.authorId,
			balance: -transaction.amount,
			u_balance: -transaction.amount,
			blockId: block.id,
			round: slots.calcRound(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

/**
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
InTransfer.prototype.applyUnconfirmed = function (transaction, sender, cb, tx) {
	return setImmediate(cb);
};

/**
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
InTransfer.prototype.undoUnconfirmed = function (transaction, sender, cb, tx) {
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
			maxLength: 20
		}
	},
	required: ['dappId']
};

/**
 * Calls `objectNormalize` with asset inTransfer.
 * @implements {library.schema.validate}
 * @param {transaction} transaction
 * @return {error|transaction} error string | transaction normalized
 * @throws {string} error message
 */
InTransfer.prototype.objectNormalize = function (transaction) {
	var report = library.schema.validate(transaction.asset.inTransfer, InTransfer.prototype.schema);

	if (!report) {
		throw 'Failed to validate inTransfer schema: ' + library.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return transaction;
};

/**
 * Creates inTransfer object based on raw data.
 * @param {Object} raw
 * @return {Object} inTransfer with dappId
 */
InTransfer.prototype.dbRead = function (raw) {
	if (!raw.in_dappId) {
		return null;
	} else {
		var inTransfer = {
			dappId: raw.in_dappId
		};

		return {inTransfer: inTransfer};
	}
};

/**
 * @param {transaction} transaction
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
InTransfer.prototype.afterSave = function (transaction, cb) {
	return setImmediate(cb);
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {boolean} True if transaction signatures greather than sender multimin, or there are no sender multisignatures.
 */
InTransfer.prototype.ready = function (transaction, sender) {
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
module.exports = InTransfer;
